import {
  DAY, MEMO_LIMIT, SEASONS, advance, calendar, care, feedAvailable, forecast, growTip,
  lightLevel, moistureLabel, newGame, plotMilestone, plotUnlocked, progressOf, restoreGame,
  soilLabel, sow, stageOf, stageProgress, writeMemo,
} from './game.mjs?v=4';
import { CATEGORIES, CROP_IDS, CROPS, CROPS_BY_SEASON, DIFFICULTY_LABELS, growthPath, isOrnamental, specimenPath } from './crops.mjs?v=3';

const KEY = 'ichigo-biyori.garden.v2';
const LEGACY_KEY = 'ichigo-biyori.garden.v1';
const REFRESH_MS = 15_000;
const BACKDROPS = ['spring', 'summer', 'autumn', 'winter'];
const PERIODS = {
  morning: ['朝', 'sunrise'],
  day: ['昼', 'sun'],
  evening: ['夕方', 'sunrise'],
  night: ['夜', 'moon'],
};
const OBSERVATIONS = [
  '苗が新しい土に根を張り始めています。',
  '葉が広がってきました。日当たりと土の様子を見ましょう。',
  '小さな花が開きました。受粉を手伝うと実つきがよくなります。',
  '花のあとに、小さな緑の実がつきました。',
  '実に少しずつ色がのってきました。',
  '実が熟しました。収穫して実の品質を確かめましょう。',
];
const HISTORY_ICONS = {
  plant: 'sprout', water: 'drop', feed: 'soil', move: 'move', pollinate: 'flower',
  harvest: 'basket', complete: 'flower', daily: 'sunrise',
};
const CATEGORY_ICONS = { fruit: 'heart', vegetable: 'sprout', plant: 'flower' };

const $ = id => document.getElementById(id);
const icon = name => `<i class="icon i-${name}" aria-hidden="true"></i>`;
const difficultyChip = crop => `<span class="difficulty-chip" data-difficulty="${crop.difficulty}"><span>難易度</span> ${DIFFICULTY_LABELS[crop.difficulty]}</span>`;
const escapeText = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const plotName = index => `鉢 ${index + 1}`;
const plantPath = (crop, stage) => stage === 5 ? specimenPath(crop) : growthPath(crop, stage);
const clockFormat = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dateFormat = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' });
const fullDateFormat = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const dayHeading = (timestamp, format = dateFormat) => format.format(timestamp).replace('(', '（').replace(')', '）');
const recordDate = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'long' });

let activeView = 'garden';
let chosen = 0;
let shownHistory = 15;
let shownHarvests = 12;
let state;
let toastTimer;
let effectsTimer;
let nurseryPlot = null;
let nurseryCrop = null;
let entryCrop = null;

function readGarden(key = KEY) {
  try {
    return restoreGame(JSON.parse(localStorage.getItem(key)));
  } catch {
    return null;
  }
}

function saveGarden() {
  let available = true;
  try {
    const saved = readGarden();
    if (saved && saved.startedAt === state.startedAt &&
      (saved.lastAt > state.lastAt || (saved.lastAt === state.lastAt && saved.revision > state.revision))) {
      state = saved;
    } else {
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  } catch {
    available = false;
  }
  $('storage-warning').hidden = available;
  $('save-label').textContent = available ? 'このブラウザに自動保存' : 'このブラウザでは保存できません';
  return available;
}

function followOtherTab() {
  const saved = readGarden();
  if (saved && saved.lastAt >= state.lastAt && saved.revision >= state.revision) state = saved;
}

function sync(now) {
  followOtherTab();
  const before = state.lastAt;
  advance(state, now);
  if (state.lastAt !== before) saveGarden();
}

function toast(message) {
  clearTimeout(toastTimer);
  const node = $('toast');
  node.textContent = message;
  node.hidden = false;
  toastTimer = setTimeout(() => { node.hidden = true; }, 4300);
}

function replaceContent(node, content) {
  if (node.renderedContent === content) return;
  const focused = node.contains(document.activeElement) ? document.activeElement : null;
  const attribute = focused && ['data-care', 'data-plot', 'data-nav', 'data-nursery', 'data-entry', 'data-seed'].find(name => focused.hasAttribute(name));
  node.renderedContent = content;
  node.innerHTML = content;
  if (attribute) {
    const selector = `button[${attribute}="${CSS.escape(focused.getAttribute(attribute))}"]:not(:disabled)`;
    const next = node.querySelector(selector) ?? node.querySelector('button:not(:disabled)');
    next?.focus({ preventScroll: true });
  }
}

function setImage(node, source) {
  if (node.getAttribute('src') !== source) node.src = source;
}

function renderScene(day, weather, now) {
  const current = state.plots[chosen];
  const isOpen = plotUnlocked(state, chosen);
  const [period, periodIcon] = PERIODS[day.period];
  const stage = current ? stageOf(current) : 0;
  const scene = $('scene');
  scene.dataset.period = day.period;
  scene.dataset.weather = weather.key;
  scene.dataset.position = current?.position ?? 'sun';
  scene.dataset.thirst = current && stage !== 5 && current.moisture <= 18 ? 'dry' : 'normal';

  setImage($('scene-backdrop'), `./assets/garden-${BACKDROPS[day.season]}.webp`);
  replaceContent($('scene-period'), `${icon(periodIcon)}<span>${period}</span>`);
  replaceContent($('scene-weather'), `${icon(weather.key)}<span>${weather.label} <b>${weather.temp}°</b></span>`);
  const currentClock = clockFormat.format(now);
  $('clock').textContent = currentClock;
  $('clock').dateTime = currentClock;
  $('scene-position').hidden = !current;
  replaceContent($('scene-position'), `${icon(current?.position === 'shelter' ? 'cloud' : 'sun')}<span>${current?.position === 'shelter' ? '軒下' : '日なた'}</span>`);
  $('plant-display').hidden = !current;
  $('scene-empty').hidden = Boolean(current);

  if (current) {
    const crop = CROPS[current.cropId];
    const image = $('plant-image');
    const scale = crop.id === 'strawberry' ? 1 : [0.78, 0.90, 1, 1.02, 1.06, 1.11][stage];
    const specimen = $('plant-specimen');
    image.style.setProperty('--plant-scale', scale);
    image.alt = `${crop.name}・${crop.stages[stage]}`;
    setImage(image, growthPath(crop, stage));
    specimen.hidden = Boolean(crop.points) || isOrnamental(crop) || stage < 3;
    if (!specimen.hidden) {
      setImage(specimen, specimenPath(crop));
      specimen.dataset.stage = stage;
      specimen.dataset.kind = crop.kind;
    }
  } else {
    const text = isOpen ? 'この鉢に苗を植えられます' : '栽培を続けると使える鉢です';
    replaceContent($('scene-empty'), `${icon(isOpen ? 'sprout' : 'lock')}<span>${text}</span>`);
  }
}

function renderPlots() {
  const nextLocked = state.plots.findIndex((plant, index) => !plotUnlocked(state, index));
  const visiblePlots = nextLocked < 0 ? state.plots : state.plots.slice(0, nextLocked + 1);
  const container = $('plots');
  container.dataset.many = String(visiblePlots.length > 3);
  replaceContent(container, visiblePlots.map((plant, index) => {
    const unlocked = plotUnlocked(state, index);
    const image = plant ? `<img src="${plantPath(CROPS[plant.cropId], stageOf(plant))}" alt="" width="33" height="38">`
      : icon(unlocked ? 'plus' : 'lock');
    const name = plant ? CROPS[plant.cropId].name : unlocked ? '空き鉢' : '未解放';
    return `<button class="plot-button${chosen === index ? ' selected' : ''}" type="button" data-plot="${index}" aria-pressed="${chosen === index}">
      <span class="plot-thumb${unlocked ? '' : ' locked'}">${image}</span>
      <span class="plot-copy"><small>${plotName(index)}</small><strong>${name}</strong></span>
    </button>`;
  }).join(''));
}

function meter(name, value, label, symbol, color) {
  const rounded = Math.round(value);
  return `<div class="meter">
    <div class="meter-line"><span class="meter-name">${icon(symbol)}${name}</span><span class="meter-value"><strong>${rounded}<small>%</small></strong><span>${label}</span></span></div>
    <div class="meter-track ${color}" role="meter" aria-label="${name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${rounded}" aria-valuetext="${rounded}% ${label}"><span style="width:${rounded}%"></span></div>
  </div>`;
}

function renderCare(day, weather, now) {
  const current = state.plots[chosen];
  if (!current) {
    const isOpen = plotUnlocked(state, chosen);
    const ids = CROPS_BY_SEASON[day.season];
    const favorites = [ids[0], ids[8], ids[17]];
    replaceContent($('care-card'), `<div class="care-heading"><div><span class="overline">${plotName(chosen)}</span><h2 id="care-title">${isOpen ? '苗を植える' : 'まだ使えない鉢'}</h2></div><span class="panel-icon tinted-green">${icon(isOpen ? 'sprout' : 'lock')}</span></div>
      <div class="care-empty">${isOpen ? `
        <div class="nursery-samples" aria-hidden="true">${favorites.map(id => `<img src="${specimenPath(CROPS[id])}" alt="" width="57" height="62">`).join('')}</div>
        <strong>${SEASONS[day.season]}の苗 ${ids.length}種類</strong>
        <p>果物、野菜、草花から選べます。</p>
        <button type="button" class="solid-button" data-nursery="${chosen}">${icon('sprout')}苗を選ぶ</button>
        ` : `<p>収穫や草花の完成を${plotMilestone(chosen)}回重ねると、この鉢が使えるようになります。</p><span class="count-note">現在の完成 ${state.completionCount}回</span>`}
      </div>`);
    return;
  }

  const stage = stageOf(current);
  const light = lightLevel(current, weather);
  const crop = CROPS[current.cropId];
  const ornamental = isOrnamental(crop);
  const canFeed = feedAvailable(current, now) && stage !== 5;
  const showPollination = crop.kind === 'fruit' && stage === 2;
  const lightLabel = day.hour < 6 || day.hour >= 18 ? '日照時間外' : light >= 72 ? 'たっぷり' : light >= 55 ? 'ほどよい' : '少なめ';
  replaceContent($('care-card'), `<div class="care-heading">
    <div><span class="overline">${plotName(chosen)}</span><h2 id="care-title">${crop.name}</h2></div>
    <div class="care-badges">
      <span class="stage-chip">${icon(stage === 5 && !ornamental ? 'basket' : stage >= 2 && (ornamental || stage === 2 && crop.kind === 'fruit') ? 'flower' : 'sprout')}${crop.stages[stage]}</span>
      ${difficultyChip(crop)}
    </div>
  </div>
  <div class="meters">
    ${meter('土の水分', current.moisture, moistureLabel(current), 'drop', 'water')}
    ${meter('土の栄養', current.nutrients, soilLabel(current), 'soil', 'nutrient')}
    ${meter('日当たり', day.hour < 6 || day.hour >= 18 ? 0 : light, lightLabel, 'sun', 'light')}
  </div>
  <p class="crop-habit">土の水分の目安 <strong>${crop.habit.min}〜${crop.habit.max}%</strong> <span>・ ${crop.habit.name}</span></p>
  <p class="care-tip">${icon('sprout')}<span>${growTip(current, weather)}</span></p>
  <div class="action-grid">
    ${stage === 5 ?
      `<button type="button" class="solid-button primary-action harvest-action" data-care="${ornamental ? 'complete' : 'harvest'}">${ornamental ? `${icon('book')}図鑑に記録する` : `${icon('basket')}収穫する`}</button>` :
      `<button type="button" class="solid-button primary-action" data-care="water">${icon('drop')}水をあげる<span>100mL</span></button>`}
    <button type="button" class="care-action" data-care="feed"${canFeed ? '' : ' disabled'} title="前回から3日おき">${icon('soil')}肥料を足す</button>
    <button type="button" class="care-action" data-care="move">${icon('move')}${current.position === 'sun' ? '軒下に移す' : '日なたに戻す'}</button>
    ${showPollination ? `<button type="button" class="care-action pollinate-action" data-care="pollinate"${current.pollinated ? ' disabled' : ''}>${icon(current.pollinated ? 'check' : 'flower')}${current.pollinated ? '受粉済み' : '受粉を手伝う'}</button>` : ''}
  </div>`);
}

function renderForecast(day) {
  const content = ['今日', '明日', '明後日'].map((label, index) => {
    const weather = forecast(state, day.day + index);
    return `<div class="forecast-item${index === 0 ? ' now' : ''}"><span>${label}</span>
      <span class="forecast-weather ${weather.key}">${icon(weather.key)}<b>${weather.temp}°</b></span>
      <span>${weather.label}</span></div>`;
  });
  replaceContent($('forecast'), content.join(''));
}

function renderGrowth(now) {
  const plant = state.plots[chosen];
  const root = $('growth-card');
  root.hidden = !plant;
  if (!plant) return;
  const crop = CROPS[plant.cropId];
  const labels = crop.stages;
  const finish = isOrnamental(crop) ? labels[5] : '収穫';
  const stage = stageOf(plant);
  const next = stage + 1;
  const plantedDays = Math.max(0, Math.floor((now - plant.plantedAt) / DAY)) + 1;
  const percent = Math.floor(1000 * progressOf(plant)) / 10;
  const symbols = ['sprout', 'sprout', crop.kind === 'fruit' || crop.kind === 'flower' ? 'flower' : 'soil', 'sun', 'heart', isOrnamental(crop) ? 'book' : 'basket'];
  const stages = labels.map((name, index) => `<li class="${index < stage ? 'reached' : index === stage ? 'current' : ''}"${index === stage ? ' aria-current="step"' : ''}>
    <span class="stage-step-icon">${icon(symbols[index])}</span><span>${name}</span>
  </li>`);
  const currentProgress = Math.floor(stageProgress(plant) * 100);
  replaceContent(root, `<div class="growth-heading"><div><h2 id="growth-title">成長のきろく</h2><p>${crop.name}を植えてから ${plantedDays}日目</p></div>
    <span class="growth-total" aria-label="${finish}までの全体進捗 ${percent}%"><strong>${percent}<small>%</small></strong><span>${finish}までの成長</span></span></div>
  <ol class="stage-steps">${stages.join('')}</ol>
  <div class="growth-progress"><div class="meter-track growth" role="progressbar" aria-label="${finish}までの成長" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>
    <p>${next < labels.length ? `次は「${labels[next]}」<span>${currentProgress}%</span>` : `${finish}を迎えました。`}</p>
  </div>`);
}

function renderGarden(now) {
  const day = calendar(now);
  const weather = forecast(state, day.day);
  $('date-chip').querySelector('span').textContent = `${SEASONS[day.season]}・${dayHeading(now, fullDateFormat)}`;
  $('garden-subtitle').textContent = '土の様子を見ながら育てましょう。';
  renderScene(day, weather, now);
  renderPlots();
  renderCare(day, weather, now);
  renderForecast(day);
  renderGrowth(now);
}

function observation(plant, crop, stage) {
  if (stage < 2) return OBSERVATIONS[stage];
  if (stage === 5 && isOrnamental(crop)) return `${crop.stages[5]}になりました。完成図鑑に記録できます。`;
  if (stage === 5) return '収穫できる大きさまで育ちました。';
  if (crop.kind !== 'fruit') return `「${crop.stages[stage]}」の段階です。水分と日当たりを見守りましょう。`;
  if (stage === 2 && plant.pollinated) return '花の受粉を手伝いました。実がつくのを待ちましょう。';
  return OBSERVATIONS[stage];
}

function renderJournal(now) {
  const day = calendar(now);
  const plants = state.plots.map((plant, index) => {
    if (!plant) return '';
    const crop = CROPS[plant.cropId];
    const stage = stageOf(plant);
    const percent = Math.round(1000 * plant.daily.growth / crop.idealDays) / 10;
    return `<div class="observation"><img src="${plantPath(crop, stage)}" alt="" width="69" height="76">
      <div><span class="overline">${plotName(index)}・${crop.stages[stage]}</span><h3>${crop.name}</h3><p>${observation(plant, crop, stage)}</p></div>
      <strong class="daily-growth">${percent > 0 ? '+' : ''}${percent}<small>%</small><span>今日の成長</span></strong>
    </div>`;
  }).join('');
  replaceContent($('journal-today'), `<div class="journal-heading"><span class="panel-icon tinted-green">${icon('book')}</span>
    <div><p class="overline">${SEASONS[day.season]}・${dayHeading(now)}</p><h2>今日の観察</h2></div></div>
    ${plants || '<p class="empty-small">苗を植えると、毎日の成長をここで見られます。</p>'}`);

  const selector = $('journal-filter');
  const filter = selector.value;
  const plotted = state.plots.map((plant, i) => i).filter(i => plotUnlocked(state, i));
  replaceContent(selector, `<option value="all">すべて</option>${plotted.map(i => `<option value="${i}">${plotName(i)}</option>`).join('')}`);
  selector.value = filter;
  const history = state.history.filter(entry => filter === 'all' || String(entry.index) === filter);
  let group;
  let list = '';
  history.slice(0, shownHistory).forEach(entry => {
    const heading = dayHeading(entry.at, fullDateFormat);
    if (heading !== group) {
      group = heading;
      list += `<h3 class="history-date">${heading}</h3>`;
    }
    const symbol = Object.hasOwn(HISTORY_ICONS, entry.type) ? HISTORY_ICONS[entry.type] : 'book';
    list += `<article class="history-row"><span class="history-icon">${icon(symbol)}</span>
      <div><p>${escapeText(entry.text)}</p><span>${plotName(entry.index)}・${entry.type === 'daily' ? '一日の成長' : clockFormat.format(entry.at)}</span></div></article>`;
  });
  replaceContent($('history-list'), list || '<p class="empty-small">この鉢の記録は、これから増えていきます。</p>');
  $('more-history').hidden = shownHistory >= history.length;
}

function resultStats(crop, entry) {
  const stat = (label, amount, unit = '') => `<div><dt>${label}</dt><dd>${amount}${unit ? `<small> ${unit}</small>` : ''}</dd></div>`;
  if (crop.kind === 'foliage') return stat('草丈', entry.grams, 'cm') + stat('出来栄え', entry.score, '点');
  if (crop.kind === 'flower') return stat('花の数', entry.fruit, '輪') + stat('花の大きさ', entry.grams, 'cm') + stat('出来栄え', entry.score, '点');
  return stat('収穫', entry.fruit, crop.unit) + stat('平均の重さ', entry.grams, 'g') +
    (entry.sugar === null ? stat('出来栄え', entry.score, '点') : stat('甘さ', entry.sugar, '°Bx'));
}

function renderBasket() {
  const latest = state.harvests[0];
  const emptyImage = `<img src="./assets/strawberry-5.webp" alt="" width="112" height="120">`;
  replaceContent($('harvest-summary'), latest ? `<span class="panel-icon tinted-rose">${icon('basket')}</span><div><span class="overline">収穫した回数</span><h2>${state.harvestCount}<small> 回</small></h2></div>`
    : `${emptyImage}<div><h2>かごはまだ空っぽです</h2><p>果物や野菜を収穫したら、ここで記録を見返せます。</p>
      <button class="outline-button" type="button" data-nav="garden">${icon('sprout')}庭を見る</button></div>`);

  const harvests = state.harvests.slice(0, shownHarvests).map(entry => {
    const crop = CROPS[entry.cropId];
    return `<article class="card harvest-card"><div class="harvest-plant"><img src="${specimenPath(crop)}" alt="" loading="lazy">
      <div><p class="overline">${dayHeading(entry.at)}・${plotName(entry.index)}</p><h2>${crop.name}</h2></div>
      <span class="stage-chip">${entry.grade}</span></div>
      <dl>${resultStats(crop, entry)}</dl><button class="outline-button harvest-entry" type="button" data-entry="${crop.id}">${icon('book')}図鑑にメモを書く</button></article>`;
  });
  replaceContent($('harvest-list'), harvests.join(''));
  $('more-harvests').hidden = shownHarvests >= state.harvests.length;
}

function renderNursery(now) {
  const { season } = calendar(now);
  const category = $('nursery-category').value;
  const ids = CROPS_BY_SEASON[season].filter(id => category === 'all' || CROPS[id].category === category);
  if (nurseryCrop && !ids.includes(nurseryCrop)) nurseryCrop = null;

  $('nursery-subtitle').textContent = `${plotName(nurseryPlot)}・${SEASONS[season]}の苗 ${ids.length}種類`;
  replaceContent($('nursery-grid'), ids.map(id => {
    const crop = CROPS[id];
    return `<button class="seed-button" type="button" data-seed="${id}" aria-pressed="${nurseryCrop === id}">
      <span class="seed-thumb" data-kind="${crop.category}"><img src="${specimenPath(crop)}" alt="" loading="lazy"></span>
      <span class="seed-copy"><strong>${crop.name}</strong>${difficultyChip(crop)}<small>${crop.idealDays}日目安・${crop.habit.name}</small></span>
    </button>`;
  }).join(''));

  const selected = nurseryCrop ? CROPS[nurseryCrop] : null;
  $('nursery-selection').textContent = selected ? `${selected.name}を植えます。土の水分は${selected.habit.min}〜${selected.habit.max}%が目安です。`
    : '植える苗を選んでください。';
  $('nursery-plant').disabled = !selected || Boolean(state.plots[nurseryPlot]);
}

function openNursery(index, cropId = null) {
  const now = Date.now();
  sync(now);
  if (state.plots[index] || !plotUnlocked(state, index)) {
    render(now);
    toast('苗を植えられる空き鉢を選んでください。');
    return;
  }
  chosen = nurseryPlot = index;
  nurseryCrop = cropId;
  $('nursery-category').value = 'all';
  render(now);
  renderNursery(now);
  $('nursery-dialog').showModal();
  $('nursery-grid').scrollTop = 0;
}

function normalizeSearch(text) {
  return text.normalize('NFKC').toLowerCase().trim().replace(/[ァ-ヶ]/g, char => String.fromCodePoint(char.codePointAt(0) - 0x60));
}

function renderBook() {
  const count = Object.keys(state.book).length;
  const total = CROP_IDS.length;
  const season = $('book-season').value;
  const category = $('book-category').value;
  const status = $('book-status').value;
  const query = normalizeSearch($('book-search').value);
  const growing = new Set(state.plots.filter(Boolean).map(plant => plant.cropId));

  replaceContent($('book-banner'), `<div class="book-summary">
    <span class="panel-icon tinted-rose">${icon('book')}</span><div><h2>${count === total ? '100種類、達成しました' : '登録した植物'}</h2><p>${count === total ? 'すべての栽培記録がそろいました。' : '収穫や開花を重ねると、図鑑のページが埋まっていきます。'}</p></div>
    <div class="book-tally"><strong>${count}</strong><span> / ${total} 種類</span></div></div>
    <div class="meter-track growth book-progress" role="progressbar" aria-label="完成図鑑の登録数" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${count}"><span style="width:${100 * count / total}%"></span></div>
    <div class="book-seasons">${CROPS_BY_SEASON.map((ids, index) => {
      const done = ids.filter(id => Object.hasOwn(state.book, id)).length;
      return `<span><b>${SEASONS[index]}</b><span>${done} / ${ids.length}</span></span>`;
    }).join('')}</div>`);

  const filtered = CROP_IDS.filter(id => {
    const crop = CROPS[id];
    const done = Object.hasOwn(state.book, id);
    return (season === 'all' || Number(season) === crop.season) && (category === 'all' || category === crop.category) &&
      (status === 'all' || status === 'done' && done || status === 'growing' && growing.has(id) || status === 'todo' && !done) &&
      (!query || normalizeSearch(crop.name).includes(query) || crop.reading.includes(query));
  });
  const countLabel = `${filtered.length}種類を表示`;
  if ($('book-count').textContent !== countLabel) $('book-count').textContent = countLabel;
  replaceContent($('book-grid'), filtered.map((id, index) => {
    const crop = CROPS[id];
    const entry = state.book[id];
    const inProgress = growing.has(id);
    const label = entry ? '完成済み' : inProgress ? '栽培中' : '未完成';
    return `<button class="catalog-item card" type="button" data-entry="${id}">
      <span class="specimen-plate" data-kind="${crop.category}"><img src="${specimenPath(crop)}" alt="" width="130" height="124" loading="${index < 14 ? 'eager' : 'lazy'}" decoding="async"></span>
      <span class="catalog-item-copy"><small>${SEASONS[crop.season]}・${CATEGORIES[crop.category]}</small><strong>${crop.name}</strong>
      ${difficultyChip(crop)}<span class="book-item-status${entry ? ' done' : inProgress ? ' growing' : ''}">${icon(entry ? 'check' : inProgress ? 'sprout' : 'lock')}${label}${entry?.memo ? '・メモあり' : ''}</span></span>
    </button>`;
  }).join('') || '<p class="card catalog-empty">条件に合う植物がありません。</p>');
}

function renderEntry(now) {
  const crop = CROPS[entryCrop];
  const entry = state.book[entryCrop];
  const day = calendar(now);
  const openPot = state.plots.findIndex((plant, index) => !plant && plotUnlocked(state, index));
  const inProgress = state.plots.some(plant => plant?.cropId === entryCrop);
  const canPlant = !entry && !inProgress && crop.season === day.season && openPot >= 0;
  const finish = isOrnamental(crop) ? crop.stages[5] : '収穫';
  const summary = entry ? `初めての登録 ${recordDate.format(entry.firstAt)} ・ 完成 ${entry.count}回`
    : inProgress ? `${finish}を迎えて記録すると、栽培メモを書けます。`
      : `${SEASONS[crop.season]}に植えられます。育て終えると栽培メモを書けます。`;
  $('entry-title').textContent = crop.name;
  $('entry-category').textContent = `${SEASONS[crop.season]}の${CATEGORIES[crop.category]}`;
  $('entry-memo-form').hidden = !entry;
  replaceContent($('entry-body'), `<div class="entry-overview"><div class="specimen-plate" data-kind="${crop.category}"><img src="${specimenPath(crop)}" alt="" width="123" height="120"></div>
    <div class="entry-description"><div class="entry-badges"><span class="book-item-status${entry ? ' done' : inProgress ? ' growing' : ''}">${icon(entry ? 'check' : inProgress ? 'sprout' : CATEGORY_ICONS[crop.category])}${entry ? '完成済み' : inProgress ? '栽培中' : '未完成'}</span>${difficultyChip(crop)}</div>
    <p>${summary}</p><p>${finish}まで約${crop.idealDays}日 ・ ${crop.habit.name}</p><p>土の水分 ${crop.habit.min}〜${crop.habit.max}%</p></div></div>
    ${entry ? `<div class="entry-result"><div><h3>いちばんの出来栄え</h3><span class="stage-chip">${entry.best.grade}</span></div><dl>${resultStats(crop, entry.best)}</dl></div>` : ''}
    ${canPlant ? `<button class="outline-button entry-plant" type="button" data-entry-plant="${openPot}">${icon('sprout')}${plotName(openPot)}でこの苗を選ぶ</button>` : ''}`);
}

function updateMemoLength() {
  $('entry-memo-length').textContent = `${$('entry-memo').value.length} / ${MEMO_LIMIT}`;
}

function openEntry(cropId) {
  const now = Date.now();
  sync(now);
  entryCrop = cropId;
  $('entry-memo').value = state.book[cropId]?.memo ?? '';
  $('entry-notice').textContent = '';
  updateMemoLength();
  renderEntry(now);
  if (!$('entry-dialog').open) $('entry-dialog').showModal();
  $('entry-dialog').scrollTop = 0;
}

function render(now = Date.now()) {
  if (activeView === 'garden') renderGarden(now);
  if (activeView === 'journal') renderJournal(now);
  if (activeView === 'basket') renderBasket();
  if (activeView === 'book') renderBook();
  if ($('nursery-dialog').open) renderNursery(now);
  if ($('entry-dialog').open) renderEntry(now);
}

function navigate(view, options = {}) {
  if (activeView === view && !options.force) return;
  activeView = view;
  document.querySelectorAll('.view').forEach(section => { section.hidden = section.id !== `view-${view}`; });
  document.querySelectorAll('.nav-button').forEach(button => {
    if (button.dataset.nav === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  sync(Date.now());
  render();
  if (!options.initial) window.scrollTo(0, 0);
}

function showEffect(kind) {
  clearTimeout(effectsTimer);
  const effect = $('plant-effect');
  effect.dataset.effect = kind;
  effect.replaceChildren();
  const amount = kind === 'water' ? 10 : 6;
  for (let i = 0; i < amount; i++) {
    const particle = document.createElement('span');
    particle.style.setProperty('--i', i);
    effect.appendChild(particle);
  }
  effectsTimer = setTimeout(() => { effect.replaceChildren(); }, 1050);
}

function withGardenLock(callback) {
  if (navigator.locks) return navigator.locks.request(KEY, callback);
  return callback();
}

function runAction(index, kind, cropId) {
  return withGardenLock(() => {
    followOtherTab();
    const now = Date.now();
    const result = kind ? care(state, index, kind, now) : sow(state, index, cropId, now);
    if (result.ok) state.revision += 1;
    saveGarden();
    if (!kind && result.ok) $('nursery-dialog').close();
    render(now);
    toast(result.message);
    if (!result.ok) return;
    if (result.record) {
      const view = kind === 'complete' ? 'book' : 'basket';
      location.hash = view;
      navigate(view);
      openEntry(result.record.cropId);
    } else if (kind === 'water' || kind === 'feed' || kind === 'pollinate' || cropId) {
      if (!kind) $('care-card').querySelector('[data-care="water"]')?.focus({ preventScroll: true });
      showEffect(kind || 'sow');
    }
  });
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.nav) {
    location.hash = button.dataset.nav;
    navigate(button.dataset.nav);
  } else if (button.dataset.plot !== undefined) {
    const index = Number(button.dataset.plot);
    sync(Date.now());
    chosen = index;
    render();
    document.querySelector(`[data-plot="${index}"]`)?.focus({ preventScroll: true });
  } else if (button.dataset.nursery !== undefined) {
    openNursery(Number(button.dataset.nursery));
  } else if (button.dataset.seed) {
    nurseryCrop = button.dataset.seed;
    renderNursery(Date.now());
  } else if (button.dataset.entry) {
    openEntry(button.dataset.entry);
  } else if (button.dataset.entryPlant !== undefined) {
    const crop = entryCrop;
    const index = Number(button.dataset.entryPlant);
    $('entry-dialog').close();
    location.hash = 'garden';
    navigate('garden');
    openNursery(index, crop);
  } else if (button.dataset.care) {
    void runAction(chosen, button.dataset.care);
  }
});

$('show-help').addEventListener('click', () => $('help-dialog').showModal());
$('nursery-category').addEventListener('change', () => { renderNursery(Date.now()); $('nursery-grid').scrollTop = 0; });
$('nursery-plant').addEventListener('click', () => { if (nurseryCrop) void runAction(nurseryPlot, null, nurseryCrop); });
$('book-search').addEventListener('input', renderBook);
for (const id of ['book-season', 'book-category', 'book-status']) $(id).addEventListener('change', renderBook);
$('entry-memo').addEventListener('input', () => { updateMemoLength(); $('entry-notice').textContent = ''; });
$('entry-memo-form').addEventListener('submit', event => {
  event.preventDefault();
  const cropId = entryCrop;
  const memo = $('entry-memo').value;
  void withGardenLock(() => {
    const now = Date.now();
    sync(now);
    const result = writeMemo(state, cropId, memo);
    let saved = false;
    if (result.ok) {
      state.revision += 1;
      saved = saveGarden();
      render(now);
    }
    if (entryCrop !== cropId) return;
    $('entry-notice').textContent = result.ok && !saved ? 'ブラウザに保存できませんでした。' : result.message;
    if (saved && $('entry-memo').value === memo) $('entry-memo').value = state.book[cropId].memo;
    updateMemoLength();
  });
});
$('journal-filter').addEventListener('change', () => { shownHistory = 15; render(); });
$('more-history').addEventListener('click', () => { shownHistory += 15; render(); });
$('more-harvests').addEventListener('click', () => { shownHarvests += 12; render(); });

function viewFromHash() {
  const name = location.hash.slice(1);
  return ['journal', 'garden', 'basket', 'book'].includes(name) ? name : 'garden';
}

function refresh() {
  const now = Date.now();
  sync(now);
  render(now);
}

function scheduleRefresh() {
  setTimeout(() => {
    refresh();
    scheduleRefresh();
  }, REFRESH_MS - Date.now() % REFRESH_MS);
}

window.addEventListener('hashchange', () => navigate(viewFromHash()));
window.addEventListener('storage', event => {
  if (event.key === KEY) refresh();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh();
});
window.addEventListener('pageshow', refresh);

state = readGarden() ?? readGarden(LEGACY_KEY) ?? newGame(Date.now());
saveGarden();
navigate(viewFromHash(), { initial: true, force: true });
scheduleRefresh();
