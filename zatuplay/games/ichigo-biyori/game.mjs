import { CROPS, isOrnamental } from './crops.mjs?v=3';
export { CROPS } from './crops.mjs?v=3';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
const JST = 9 * HOUR;
const TICK = HOUR / 4;
export const SEASONS = ['春', '夏', '秋', '冬'];
// Index by the zero-based month of the Japanese calendar date.
const SEASON_BY_MONTH = [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3];
const THRESHOLDS = [0, 0.17, 0.38, 0.60, 0.80, 1];
const PLOT_MILESTONES = [0, 0, 3, 5, 8, 12, 16, 20];
export const MEMO_LIMIT = 600;

const WEATHER = {
  sun: { label: '晴れ', light: 1.16, evaporation: 1.08, rain: 0, offset: 2 },
  cloud: { label: 'くもり', light: 0.93, evaporation: 0.86, rain: 0, offset: 0 },
  rain: { label: '雨', light: 0.75, evaporation: 0.56, rain: 1.9, offset: -2 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rounded = value => Math.round(value * 10) / 10;
const emptyDaily = () => ({ growth: 0, dry: 0, wet: 0, hours: 0 });
const dayNumber = timestamp => Math.floor((timestamp + JST) / DAY);
const localHour = timestamp => Math.floor((timestamp + JST) / HOUR) % 24;
const dayBoundary = timestamp => (dayNumber(timestamp) + 1) * DAY - JST;
const seasonOnDay = day => SEASON_BY_MONTH[new Date(day * DAY).getUTCMonth()];

export function calendar(timestamp) {
  const day = dayNumber(timestamp);
  const hour = localHour(timestamp);
  const period = hour < 5 || hour >= 19 ? 'night' : hour < 10 ? 'morning' : hour < 16 ? 'day' : 'evening';
  return { day, season: seasonOnDay(day), hour, period, nextDay: dayBoundary(timestamp) };
}

export function forecast(state, day) {
  const elapsed = day - dayNumber(state.startedAt);
  let hash = Math.imul(state.seed ^ Math.imul(elapsed + 1, 0x85ebca6b), 0x27d4eb2d);
  hash = (hash ^ (hash >>> 15)) >>> 0;
  const chance = (hash % 1000) / 1000;
  const season = seasonOnDay(day);
  const key = elapsed === 0 || chance < 0.50 ? 'sun' : chance < 0.78 ? 'cloud' : 'rain';
  return { key, ...WEATHER[key], temp: [17, 27, 18, 11][season] + WEATHER[key].offset + (hash % 5) - 2 };
}

function plant(cropId, timestamp) {
  return { cropId, plantedAt: timestamp, moisture: 43, nutrients: 64, position: 'sun',
    growth: 0, dry: 0, wet: 0, lowNutrients: 0, lowLight: 0, lastFeed: null,
    pollinated: false, ripeAt: null, daily: emptyDaily() };
}

export function newGame(now, seed = Math.floor(Math.random() * 0xffffffff)) {
  const state = { version: 2, revision: 0, seed, startedAt: now, lastAt: now,
    plots: Array(PLOT_MILESTONES.length).fill(null), history: [], harvests: [], harvestCount: 0,
    completionCount: 0, book: {} };
  state.plots[0] = plant('strawberry', now);
  log(state, now, 0, 'plant', 'いちごの苗を迎えました。');
  return state;
}

function validRecord(entry) {
  return entry && Object.hasOwn(CROPS, entry.cropId) && ['特上', '良好', 'ふつう'].includes(entry.grade) &&
    [entry.at, entry.index, entry.fruit, entry.grams, entry.score].every(Number.isFinite) &&
    (entry.sugar === null || Number.isFinite(entry.sugar));
}

export function restoreGame(value) {
  const validPlant = item => item && Object.hasOwn(CROPS, item.cropId) && item.daily &&
    ['sun', 'shelter'].includes(item.position) && typeof item.pollinated === 'boolean' &&
    (item.ripeAt === null || Number.isFinite(item.ripeAt)) &&
    (item.lastFeed === null || Number.isFinite(item.lastFeed)) &&
    [item.plantedAt, item.moisture, item.nutrients, item.growth, item.dry, item.wet,
      item.lowLight, item.lowNutrients, item.daily.growth, item.daily.dry, item.daily.wet,
      item.daily.hours].every(Number.isFinite);
  const common = value && Number.isFinite(value.seed) && Number.isFinite(value.startedAt) &&
    Number.isFinite(value.lastAt) && value.lastAt >= value.startedAt &&
    Number.isInteger(value.harvestCount) && value.harvestCount >= 0 &&
    Array.isArray(value.plots) &&
    value.plots.every(item => item === null || validPlant(item)) &&
    Array.isArray(value.history) && value.history.every(entry => entry && Number.isFinite(entry.at) &&
      Number.isInteger(entry.index) && typeof entry.type === 'string' && typeof entry.text === 'string') &&
    Array.isArray(value.harvests) && value.harvests.every(validRecord);
  if (!common) return null;

  if (value.version === 1 && value.plots.length === 3) {
    const migrated = { ...value, version: 2, revision: 0,
      plots: [...value.plots, ...Array(PLOT_MILESTONES.length - 3).fill(null)],
      completionCount: value.harvestCount, book: {} };
    for (const entry of [...value.harvests].reverse()) addToBook(migrated, entry);
    return migrated;
  }

  if (value.version !== 2 || value.plots.length !== PLOT_MILESTONES.length ||
    !Number.isInteger(value.revision) || value.revision < 0 ||
    !Number.isInteger(value.completionCount) || value.completionCount < value.harvestCount ||
    !value.book || typeof value.book !== 'object' || Array.isArray(value.book)) return null;

  const validBook = Object.entries(value.book).every(([id, entry]) => Object.hasOwn(CROPS, id) &&
    entry && Number.isInteger(entry.count) && entry.count > 0 &&
    Number.isFinite(entry.firstAt) && validRecord(entry.best) && entry.best.cropId === id &&
    typeof entry.memo === 'string' && entry.memo.length <= MEMO_LIMIT);
  return validBook ? value : null;
}

export function progressOf(plant) {
  return clamp(plant.growth / CROPS[plant.cropId].idealDays, 0, 1);
}

export function stageOf(plant) {
  return THRESHOLDS.findLastIndex(threshold => progressOf(plant) >= threshold);
}

export function stageProgress(plant) {
  const stage = stageOf(plant);
  if (stage === THRESHOLDS.length - 1) return 1;
  return (progressOf(plant) - THRESHOLDS[stage]) / (THRESHOLDS[stage + 1] - THRESHOLDS[stage]);
}

export function moistureLabel(plant) {
  const { min, max } = CROPS[plant.cropId].habit;
  if (plant.moisture < min - 14) return '乾いている';
  if (plant.moisture < min) return '乾き気味';
  if (plant.moisture <= max) return 'ちょうどいい';
  if (plant.moisture < max + 11) return '湿り気が多め';
  return '水が多すぎる';
}

export function soilLabel(plant) {
  if (plant.nutrients < 42) return '少なめ';
  if (plant.nutrients > 84) return '多め';
  return 'ちょうどいい';
}

export function lightLevel(plant, weather) {
  const light = { sun: 88, cloud: 65, rain: 45 }[weather.key];
  return Math.round(light * (plant.position === 'sun' ? 1 : 0.61));
}

export function feedAvailable(plant, now) {
  return plant.lastFeed === null || now - plant.lastFeed >= 3 * DAY;
}

export const plotMilestone = index => PLOT_MILESTONES[index];
export const plotUnlocked = (state, index) => state.completionCount >= plotMilestone(index);

export function growTip(plant, weather) {
  const crop = CROPS[plant.cropId];
  const { min, max, light } = crop.habit;
  if (plant.ripeAt !== null) {
    if (isOrnamental(crop)) return `${crop.stages[5]}になりました。完成図鑑に記録しましょう。`;
    return crop.sugar === null ? '収穫して、大きさと出来栄えを確かめましょう。' : '収穫して、甘さと大きさを確かめましょう。';
  }

  if (plant.moisture >= max + 8 && weather.key === 'rain' && plant.position === 'sun') return '土がかなり湿っています。軒下に移すと雨を避けられます。';
  if (plant.moisture >= max + 4) return '土に水分が残っています。少し乾くまで様子を見ましょう。';
  if (plant.moisture < min && weather.key === 'rain' && plant.position === 'sun') return '今日は雨が降る日です。水やりの前に、土の湿り具合を見てみましょう。';
  if (plant.moisture < min) return '土が乾き気味です。少し水をあげましょう。';
  if (plant.nutrients < 42) return '土の栄養が減っています。間隔を空けて肥料を足しましょう。';
  if (crop.kind === 'fruit' && stageOf(plant) === 2 && !plant.pollinated) return '花が開きました。受粉を手伝うと実つきがよくなります。';
  if (plant.position === 'shelter' && weather.key !== 'rain' && light >= 1) return '晴れ間のある日は日なたに置くと、光をたっぷり受けられます。';
  return '土の水分と栄養はいい具合。このまま成長を見守りましょう。';
}

function log(state, at, index, type, text) {
  state.history.unshift({ at, index, type, text });
  state.history.length = Math.min(state.history.length, 180);
}

function finishDay(state, at) {
  state.plots.forEach((plant, index) => {
    if (!plant || plant.daily.hours < 1) {
      if (plant) plant.daily = emptyDaily();
      return;
    }

    const { growth, dry, wet } = plant.daily;
    if (growth > 0 || dry > 0 || wet > 0) {
      const crop = CROPS[plant.cropId];
      const percent = rounded(100 * growth / crop.idealDays);
      const result = percent > 0 ? `${crop.name}が ${percent}% 成長しました。` : `${crop.name}の育ちがゆっくりでした。`;
      const note = dry >= 3 ? '乾いた時間が長く、出来栄えに影響しました。'
        : wet >= 3 ? '土が湿りすぎて、出来栄えに影響しました。'
        : '土の水分を見ながら見守りましょう。';
      log(state, at - 1, index, 'daily', result + note);
    }
    plant.daily = emptyDaily();
  });
}

function simulate(plant, forecast, season, hour, from, to) {
  const hours = (to - Math.max(from, plant.plantedAt)) / HOUR;
  if (hours <= 0) return;

  const crop = CROPS[plant.cropId];
  const { min, max, water, light: sunNeed, feed } = crop.habit;
  const daylit = hour >= 6 && hour < 18;
  const sheltered = plant.position === 'shelter';
  const climate = clamp(1 + (forecast.temp - 18) / 25, 0.63, 1.60);
  const evaporates = (daylit ? 1.27 : 0.59) * climate * forecast.evaporation * water * (sheltered ? 0.61 : 1);
  const rain = !sheltered && hour >= 7 && hour < 17 ? forecast.rain : 0;
  const previousMoisture = plant.moisture;
  plant.moisture = clamp(plant.moisture + (rain - evaporates) * hours, 0, 100);
  const moisture = (previousMoisture + plant.moisture) / 2;

  if (plant.ripeAt !== null) return;

  plant.nutrients = clamp(plant.nutrients - (daylit ? 0.15 : 0.095) * hours * feed, 0, 100);
  const dryness = clamp((min - 9 - moisture) / 28, 0, 1);
  const wetness = clamp((moisture - max - 5) / 20, 0, 1);
  const hydration = clamp((moisture - min + 37) / 34, 0.025, 1) * (1 - 0.66 * wetness);
  const nutrition = (0.64 + 0.36 * clamp(plant.nutrients / 49, 0, 1)) *
    (1 - 0.29 * clamp((plant.nutrients - 83) / 17, 0, 1));
  const light = daylit ? (1 + (forecast.light - 1) * sunNeed) * (sheltered ? 1 - 0.31 * sunNeed : 1) : 0.89;
  const seasonFactor = season === crop.season ? 1 : 0.81;
  const earned = Math.min(crop.idealDays - plant.growth, (hours / 24) * hydration * nutrition * light * seasonFactor);

  plant.dry += hours * dryness;
  plant.wet += hours * wetness;
  plant.lowNutrients += hours * clamp((43 - plant.nutrients) / 34, 0, 1);
  plant.lowLight += daylit && sheltered ? hours * 0.56 * sunNeed : 0;
  plant.growth = Math.min(crop.idealDays, plant.growth + earned);
  plant.daily.growth += earned;
  plant.daily.dry += moisture < min - 9 ? hours : 0;
  plant.daily.wet += moisture > max + 5 ? hours : 0;
  plant.daily.hours += hours;

  if (plant.growth >= crop.idealDays) plant.ripeAt = to;
}

export function advance(state, now, exact = false) {
  // Quarter-hour ticks are anchored to the clock so opening the app does not speed up growth.
  const target = exact ? now : Math.floor(now / TICK) * TICK;
  if (target <= state.lastAt) return state;

  let at = state.lastAt;
  while (at < target) {
    const day = calendar(at);
    const weather = forecast(state, day.day);
    const limit = Math.min(target, day.nextDay);

    while (at < limit) {
      const next = Math.min(limit, (Math.floor(at / TICK) + 1) * TICK);
      const hour = localHour(at);
      state.plots.forEach(current => {
        if (current) simulate(current, weather, day.season, hour, at, next);
      });
      at = next;
    }

    if (at === day.nextDay) finishDay(state, at);
  }

  state.lastAt = target;
  return state;
}

function harvestResult(plant, now, index) {
  const crop = CROPS[plant.cropId];
  const aging = isOrnamental(crop) ? 0 : Math.max(0, (now - plant.ripeAt) / DAY - 2);
  const loss = plant.dry * 0.36 + plant.wet * 0.44 + plant.lowNutrients * 0.18 + plant.lowLight * 0.12 + aging * 1.15;
  const score = clamp(95 + (plant.pollinated || crop.kind !== 'fruit' ? 5 : 0) - loss, 30, 100);
  return { at: now, index, cropId: plant.cropId, score: Math.round(score),
    fruit: crop.fruit ? Math.max(1, Math.round(crop.fruit * (0.50 + score / 200) + (plant.pollinated ? 1 : 0))) : 0,
    grams: Math.round(crop.grams * (0.42 + score / 172)),
    sugar: crop.sugar === null ? null : rounded(crop.sugar - (100 - score) * 0.065),
    grade: score >= 86 ? '特上' : score >= 67 ? '良好' : 'ふつう' };
}

function addToBook(state, record) {
  const prior = state.book[record.cropId];
  state.book[record.cropId] = {
    count: (prior?.count ?? 0) + 1,
    firstAt: prior?.firstAt ?? record.at,
    best: prior && prior.best.score > record.score ? prior.best : record,
    memo: prior?.memo ?? '',
  };
}

export function writeMemo(state, cropId, memo) {
  if (!Object.hasOwn(CROPS, cropId) || !Object.hasOwn(state.book, cropId)) {
    return { ok: false, message: '育て終えた植物にメモを書けます。' };
  }
  if (typeof memo !== 'string' || memo.length > MEMO_LIMIT) {
    return { ok: false, message: `メモは${MEMO_LIMIT}文字までです。` };
  }
  state.book[cropId].memo = memo.trim();
  return { ok: true, message: memo.trim() ? '図鑑にメモを保存しました。' : '図鑑のメモを空にしました。' };
}

export function care(state, index, action, now) {
  now = Math.max(now, state.lastAt);
  advance(state, now, true);
  const current = state.plots[index];
  const reject = message => ({ ok: false, message });
  if (!plotUnlocked(state, index) || !current) return reject('先に、鉢に苗を植えましょう。');
  const crop = CROPS[current.cropId];
  let message;
  let record;

  switch (action) {
    case 'water':
      current.moisture = clamp(current.moisture + 23, 0, 100);
      message = current.moisture >= crop.habit.max + 11 ? '水をあげました。土がかなり湿っています。' : '水を100mLあげました。';
      break;
    case 'feed':
      if (!feedAvailable(current, now)) return reject('前回の肥料から3日空けましょう。');
      if (current.ripeAt !== null) return reject('育ちきりました。収穫か図鑑への記録をしましょう。');
      current.nutrients = clamp(current.nutrients + 21, 0, 100);
      current.lastFeed = now;
      message = '肥料を少し足しました。';
      break;
    case 'move':
      current.position = current.position === 'sun' ? 'shelter' : 'sun';
      message = current.position === 'sun' ? '鉢を日なたに移しました。' : '鉢を軒下に移しました。雨を避けられます。';
      break;
    case 'pollinate':
      if (crop.kind !== 'fruit' || stageOf(current) !== 2 || current.pollinated) return reject('実を育てる作物の花が咲いたとき、一度受粉できます。');
      current.pollinated = true;
      message = '花に筆を当てて、受粉を手伝いました。';
      break;
    case 'harvest':
    case 'complete': {
      const ornamental = isOrnamental(crop);
      if (ornamental !== (action === 'complete') || current.ripeAt === null) return reject('育ちきるまで見守りましょう。');
      record = harvestResult(current, now, index);
      addToBook(state, record);
      state.completionCount += 1;
      if (!ornamental) {
        state.harvests.unshift(record);
        state.harvests.length = Math.min(state.harvests.length, 120);
        state.harvestCount += 1;
      }
      state.plots[index] = null;
      message = ornamental ? `${crop.name}を完成図鑑に記録しました。`
        : `${crop.name}を ${record.fruit}${crop.unit} 収穫しました。`;
      break;
    }
    default:
      return reject('お世話の内容を選んでください。');
  }

  log(state, now, index, action, message);
  return { ok: true, message, record };
}

export function sow(state, index, cropId, now) {
  const { season } = calendar(now);
  now = Math.max(now, state.lastAt);
  advance(state, now, true);
  if (!Number.isInteger(index) || index < 0 || index >= state.plots.length ||
    !plotUnlocked(state, index) || state.plots[index]) {
    return { ok: false, message: '植えられる空き鉢を選んでください。' };
  }

  const crop = CROPS[cropId];
  if (!Object.hasOwn(CROPS, cropId) || crop.season !== season) {
    return { ok: false, message: '今の季節に合う苗を選びましょう。' };
  }

  state.plots[index] = plant(cropId, now);
  const message = `${crop.name}の苗を植えました。`;
  log(state, now, index, 'plant', message);
  return { ok: true, message };
}
