/*
 * SakuraEventCalendar: deterministic, offline game-prototype schedules.
 * All calendar boundaries are JST (UTC+09:00), computed with UTC methods only.
 * These are proposed annually repeating game dates, not verified live events.
 * The device clock is the only time source. No network requests are made.
 *
 * daily(nowMs?), characterEvent(nowMs?), characterEvents(nowMs?),
 * eventAvailableOn(id, nowMs?), eventById(id), tower(nowMs?),
 * status(eventId, nowMs?), jst(nowMs?)
 * daily() is the immutable historical v10 six-character schedule. New character
 * event menus use characterEvents(): five of 50 authored variants per day,
 * reusing six character casts and existing enemy artwork. All 50 events and all
 * seven selectable tiers are reachable in ten days. characterEvent() retains
 * the single-event, recommended-tier 350-day schedule for older consumers.
 * Omitting nowMs uses Date.now(). Inputs must be finite integer milliseconds.
 * Every result has `valid`; invalid clocks never unlock content.
 * Period endMs is ALWAYS exclusive; startMs is inclusive.
 */
(function (root) {
  'use strict';

  const DAY_MS = 86400000;
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const CHARACTER_IDS = Object.freeze(['sakura', 'ranka', 'fukki', 'wanchoka', 'kagura', 'shiratori']);
  const TIER_NAMES = Object.freeze(['簡単', '普通', '難関', '爆難', '轟難', '黎難', '滅難']);
  const CHARACTER_EVENT_VERSION = 1;
  const CHARACTER_EVENT_CYCLE_DAYS = 350;
  const DAILY_CHARACTER_EVENT_CYCLE_DAYS = 10;
  const DAILY_CHARACTER_EVENT_COUNT = 5;
  const AVAILABLE_TIER_INDICES = Object.freeze([0, 1, 2, 3, 4, 5, 6]);
  // Stable order is part of the save contract. Never reorder existing entries.
  // The first six variants preserve the six original character identities.
  // These are distinct story/layout variants, not fifty new character models.
  const EVENT_STORIES = Object.freeze([
    ['桜便りの丘', '咲華は風に散った春の手紙を追う。丘の妖精を越え、最後の一通を届けよう。'],
    ['鈴音の小径', 'ランカーの鈴が森の奥で鳴っている。迷った音をたどり、帰り道を取り戻そう。'],
    ['若葉の約束', 'ふっきーが育てた若葉に黒いインクが落ちた。木漏れ日の道で小さな約束を守ろう。'],
    ['夕焼けの足跡', 'わんちょかが夕空の下で不思議な足跡を発見した。丘の向こうの友だちを迎えに行こう。'],
    ['星守りの夜', 'カグラの星図から光がこぼれた。夜道の妖精を退け、星座をもう一度つなごう。'],
    ['白鳥の水鏡', 'シラトリの映る湖面に波紋が広がる。静かな岸辺で水鏡の詩を取り戻そう。'],
    ['花びらの渡し舟', '川へ流れた花びらの舟に願いの詩が乗っている。岸を巡って舟の行方を見届けよう。'],
    ['風車の丘', '止まった風車に春の風を集めよう。丘を守る妖精の向こうで新しい風が待っている。'],
    ['雨粒の楽譜', '水たまりに映る音符が雨で消えそうだ。光線をくぐり、雨上がりの旋律を守ろう。'],
    ['虹のかけ橋', '虹の根元に落ちた七色のしおりを探そう。輪の罠を抜けて、空への便りを完成させよう。'],
    ['月影の灯台', '灯台の明かりが月の影に隠された。海辺の三つの関門を越え、光を呼び戻そう。'],
    ['朝露の庭', '朝露の庭に残された詩はまだ眠っている。妖精を静め、最初の朝日を迎えよう。'],
    ['青空の郵便', '青い封筒が空から舞い降りた。宛先のない手紙を抱え、雲を望む道を進もう。'],
    ['こもれび列車', '森の小さな列車が妖精に止められた。線路沿いの関門を越え、旅の続きを助けよう。'],
    ['潮風の貝殻', '浜辺の貝殻が遠い海の歌を覚えている。波音に耳を澄ませ、失われた一節を探そう。'],
    ['蛍火の帰り道', '帰り道の蛍がインクの霧に隠れてしまった。足元の罠をよけて、小さな灯りを連れ帰ろう。'],
    ['星屑の砂時計', '星屑の砂時計が止まり、夜が長く続いている。三つの関門を越えて時の詩をつなごう。'],
    ['雪どけの泉', '泉の底で冬の名残がほどけ始めた。冷たい道の妖精を退け、春の水音を聞こう。'],
    ['紅葉のしおり', '落ち葉に挟まれた大切なしおりを探そう。赤い森の奥で、忘れかけた言葉が待っている。'],
    ['風鈴の坂道', '坂道の風鈴が一つだけ鳴らなくなった。風を閉じ込める妖精を追って音を取り戻そう。'],
    ['綿雲の見晴台', '見晴台へ続く道に雲の影が落ちている。罠を抜け、空いっぱいの白い詩に会いに行こう。'],
    ['ひだまり図書室', '図書室の窓から本の言葉が逃げ出した。ひだまりを巡り、ページの続きを集めよう。'],
    ['三日月の調べ', '三日月に捧げる歌の終わりが見つからない。夜の小径を進み、最後の音を探そう。'],
    ['白羽の橋', '橋に落ちた白い羽が向こう岸を指している。水辺の妖精を退け、羽の持ち主を追おう。'],
    ['桃色の約束', '桃色のリボンに結んだ約束が風に飛ばされた。花咲く道で、明日へつながる結び目を探そう。'],
    ['こだまの谷', '谷のこだまが誰かの名前を繰り返している。岩陰の罠をよけて、声のもとへたどり着こう。'],
    ['芽吹きの石段', '古い石段の間から小さな芽が顔を出した。道をふさぐ妖精を静め、芽吹きの行く先を守ろう。'],
    ['金色の遠回り', '金色に染まる道でいつもと違う景色を探そう。遠回りの先に、新しい友だちの詩がある。'],
    ['流星の停留所', '流星が立ち寄る停留所に影が集まった。星の旅人が迷わないように、道の灯りを守ろう。'],
    ['静湖の舞台', '湖畔の小さな舞台で一夜だけの詩会が開かれる。静けさを乱す妖精を退け、幕を上げよう。'],
    ['花冠の広場', '広場の花冠から一輪だけ花が抜けた。花の香りをたどって、みんなの輪を完成させよう。'],
    ['鈴草の迷路', '鈴のように鳴る草が道を教えてくれる。光線と輪の間を進み、森の出口を見つけよう。'],
    ['翠風の畑', '畑を渡る翠色の風が妖精にせき止められた。実りの詩を届け、風の通り道を開こう。'],
    ['雲間の散歩', '雲間から差す光を追うと知らない道に出た。足跡を確かめながら、帰り道の詩を見つけよう。'],
    ['宵星の鍵', '宵星を映す扉の鍵が夜の道に落ちている。三つの関門を越え、星明かりの扉を開こう。'],
    ['薄氷のワルツ', '薄氷の湖にやさしいワルツが響いている。岸辺の危険を避けて、春を待つ旋律を守ろう。'],
    ['桜雨の石畳', '桜と雨が石畳に短い詩を書いている。妖精の足音に消される前に、言葉をつなごう。'],
    ['夜風のオルゴール', '夜風の中で止まったオルゴールを探そう。森の関門の向こうに、懐かしい旋律が眠っている。'],
    ['木の実の贈り物', '木の実を詰めた小さな贈り物が届かない。森の道を整えて、待っている友だちへ運ぼう。'],
    ['波音のかくれんぼ', '波音にまぎれて誰かの笑い声がする。海辺の罠を抜け、かくれんぼの続きを始めよう。'],
    ['銀河の手紙', '銀河の向こうから届いた手紙は星文字で書かれている。星の道を進み、その意味を読み解こう。'],
    ['白花の誓い', '白い花の前で交わした誓いを思い出そう。湖へ続く三つの関門が心の強さを試している。'],
    ['春待ちの窓辺', '窓辺のつぼみが春の便りを待っている。寒い道の妖精を退け、最初の花の詩を届けよう。'],
    ['朝焼けの呼び声', '朝焼けの丘から仲間の呼び声が届いた。明るくなる道を進み、新しい一日の歌を探そう。'],
    ['緑陰の休み場所', '森の休み場所を覆うインクを払おう。木々の影の下に、旅人を癒やす言葉が残っている。'],
    ['夕凪の探検', '風が止まった海辺で小さな探検が始まる。潮だまりを巡り、夕空に似た宝物を見つけよう。'],
    ['天の川の道標', '天の川の道標が暗い雲に隠された。夜道の妖精を越えて、星たちの帰る方角を示そう。'],
    ['白夜の詩会', '明けない白い夜に仲間の詩が集まる。最後の関門を越え、静かな詩会へ言葉を届けよう。'],
    ['花灯りの終着駅', '花灯りがともる終着駅で一通の手紙が待っている。旅の道を振り返り、最後の思いを受け取ろう。'],
    ['鈴の音の明日', '明日を知らせる鈴がまだ鳴っていない。道の妖精を退け、新しい旅の始まりを響かせよう。']
  ].map(row => Object.freeze(row)));
  const EVENT_COLORS = Object.freeze(['#b778a0', '#897dc4', '#719b81', '#c69069', '#788dbd', '#8aa9b9', '#bc8096', '#9b8dbb', '#81a29a', '#bb966f']);
  const CHARACTER_EVENTS = Object.freeze(EVENT_STORIES.map((row, index) => Object.freeze({
    id: 'event-' + String(index + 1).padStart(2, '0'),
    eventId: 'event-' + String(index + 1).padStart(2, '0'),
    index, eventIndex: index, layout: index, eventVersion: CHARACTER_EVENT_VERSION,
    characterId: CHARACTER_IDS[index % CHARACTER_IDS.length],
    title: row[0], story: row[1],
    // All coordinates fit the existing 9,600-pixel route. The gate layout is
    // unique for every variant; the existing three encounter/trap types recur.
    gateXs: Object.freeze([700 + index % 10 * 45, 4200 + Math.floor(index / 10) * 140 + index % 5 * 30, 9350]),
    trapXs: Object.freeze([2100 + index % 5 * 100, 5400 + Math.floor(index / 5) % 5 * 100, 7900 + index % 10 * 70]),
    trapOffset: index % 3,
    enemyColor: EVENT_COLORS[index % EVENT_COLORS.length],
    enemyHpMultiplier: 1 + index % 5 * 0.03,
    enemySpeed: 28 + index % 6,
    reuseNote: '既存６人のキャラクターと敵画像を使った物語・配置バリエーション'
  })));
  const CHARACTER_EVENT_LOOKUP = Object.freeze(Object.fromEntries(CHARACTER_EVENTS.map(event => [event.id, event])));
  const DISCLOSURE = '年間日程（仮）・端末時計。開催日は仮の提案です。端末の時計を日本時間（JST）に換算して判定します。季節イベントは毎年同じ期間に繰り返します。実在するサービスの開催情報ではありません。';
  const SCHEDULES = Object.freeze({
    spring: Object.freeze({id: 'spring', title: '春の桜', startMonth: 3, startDay: 1, endMonth: 6, endDay: 1, annualRange: '毎年3月1日～5月31日', proposal: true}),
    summer: Object.freeze({id: 'summer', title: '海辺の花火', startMonth: 6, startDay: 1, endMonth: 9, endDay: 1, annualRange: '毎年6月1日～8月31日', proposal: true}),
    autumn: Object.freeze({id: 'autumn', title: '秋刀魚と落ち葉', startMonth: 9, startDay: 1, endMonth: 12, endDay: 1, annualRange: '毎年9月1日～11月30日', proposal: true}),
    winter: Object.freeze({id: 'winter', title: '雪の散歩', startMonth: 12, startDay: 1, endMonth: 3, endDay: 1, annualRange: '毎年12月1日～翌年2月末日（うるう年は29日）', proposal: true}),
    holiday: Object.freeze({id: 'holiday', title: '星の贈りもの', startMonth: 12, startDay: 20, endMonth: 1, endDay: 6, annualRange: '毎年12月20日～翌年1月5日', proposal: true})
  });
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const mod = (n, d) => ((n % d) + d) % d;
  const pad = n => String(n).padStart(2, '0');
  const yearText = y => String(y).padStart(4, '0');
  const dateKey = (y, m, d) => yearText(y) + '-' + pad(m) + '-' + pad(d);

  function readClock(nowMs) {
    let value = nowMs;
    if (value === undefined) {
      try { value = Date.now(); } catch (_) { return null; }
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) return null;
    const shifted = new Date(value + JST_OFFSET_MS);
    if (!Number.isFinite(shifted.getTime())) return null;
    const year = shifted.getUTCFullYear();
    // Four-digit civil dates and enough headroom for the following annual range.
    // Extreme or corrupted clocks return unavailable rather than an invalid date.
    if (year < 1 || year > 9998) return null;
    const monthNumber = shifted.getUTCMonth() + 1;
    const day = shifted.getUTCDate();
    return {
      nowMs: value,
      year,
      monthNumber,
      day,
      month: yearText(year) + '-' + pad(monthNumber),
      today: dateKey(year, monthNumber, day),
      epochDay: Math.floor((value + JST_OFFSET_MS) / DAY_MS)
    };
  }

  function unavailable(eventId, reason) {
    return {
      valid: false, eventId: eventId || null, active: false, current: false,
      upcoming: false, state: 'unavailable', status: 'unavailable',
      today: null, epochDay: null, month: null, characterId: null,
      tierIndex: null, tierName: null, startMs: null, endMs: null,
      nextStartMs: null, period: null, periodLabel: '日時を確認できません（JST）',
      dateRangeLabel: '日時を確認できません（JST）',
      reason: reason || 'invalid_clock', timezone: 'Asia/Tokyo',
      clockSource: 'device', proposal: true, disclosure: DISCLOSURE
    };
  }

  function base(clock, eventId) {
    return {
      valid: true, eventId, today: clock.today, epochDay: clock.epochDay,
      month: clock.month, year: clock.year, monthNumber: clock.monthNumber,
      day: clock.day, timezone: 'Asia/Tokyo', clockSource: 'device',
      proposal: true, disclosure: DISCLOSURE
    };
  }

  // setUTCFullYear avoids Date.UTC's special 1900 offset for years 0 through 99.
  function midnight(year, month, day) {
    const d = new Date(0);
    d.setUTCFullYear(year, month - 1, day);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime() - JST_OFFSET_MS;
  }

  function dateAt(ms) {
    const d = new Date(ms + JST_OFFSET_MS);
    return dateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  function makePeriod(startMs, endMs) {
    const startDate = dateAt(startMs);
    const endDate = dateAt(endMs - 1);
    const endExclusiveDate = dateAt(endMs);
    const label = startDate.replace(/-/g, '/') + ' 00:00 ～ ' + endExclusiveDate.replace(/-/g, '/') + ' 00:00（JST・終了時刻は含みません）';
    const dateRangeLabel = startDate.replace(/-/g, '/') + ' ～ ' + endDate.replace(/-/g, '/') + '（JST）';
    return {startMs, endMs, startDate, endDate, endExclusiveDate, label, dateRangeLabel};
  }

  function withPeriod(result, period) {
    return Object.assign(result, {
      period, startMs: period.startMs, endMs: period.endMs,
      periodLabel: period.label, dateRangeLabel: period.dateRangeLabel
    });
  }

  function jst(nowMs) {
    const clock = readClock(nowMs);
    return clock ? base(clock, null) : unavailable(null);
  }

  function daily(nowMs) {
    const clock = readClock(nowMs);
    if (!clock) return unavailable('daily');
    const startMs = clock.epochDay * DAY_MS - JST_OFFSET_MS;
    const tierIndex = mod(clock.epochDay, TIER_NAMES.length);
    const characterIndex = mod(clock.epochDay, CHARACTER_IDS.length);
    return withPeriod(Object.assign(base(clock, 'daily'), {
      active: true, current: true, upcoming: false, state: 'current', status: 'current',
      characterId: CHARACTER_IDS[characterIndex], characterIndex,
      tierIndex, tierName: TIER_NAMES[tierIndex], cycleDays: 42,
      nextStartMs: startMs + DAY_MS, annualRepeat: false, repeat: 'daily'
    }), makePeriod(startMs, startMs + DAY_MS));
  }

  function eventById(id) {
    return typeof id === 'string' && own(CHARACTER_EVENT_LOOKUP, id) ? CHARACTER_EVENT_LOOKUP[id] : null;
  }

  function characterEvent(nowMs) {
    const clock = readClock(nowMs);
    if (!clock) return Object.assign(unavailable('character'), {
      eventId: null, date: null, eventIndex: null,
      eventVersion: CHARACTER_EVENT_VERSION, cycleDays: CHARACTER_EVENT_CYCLE_DAYS
    });
    const startMs = clock.epochDay * DAY_MS - JST_OFFSET_MS;
    // 50 and 7 are coprime: both residues visit every event/tier pair exactly
    // once per 350 days, including for civil dates before the Unix epoch.
    const eventIndex = mod(clock.epochDay, CHARACTER_EVENTS.length);
    const event = CHARACTER_EVENTS[eventIndex];
    const tierIndex = mod(clock.epochDay, TIER_NAMES.length);
    return withPeriod(Object.assign(base(clock, event.id), event, {
      active: true, current: true, upcoming: false, state: 'current', status: 'current',
      date: clock.today, tierIndex, tierName: TIER_NAMES[tierIndex],
      cycleDays: CHARACTER_EVENT_CYCLE_DAYS,
      nextStartMs: startMs + DAY_MS, annualRepeat: false, repeat: 'daily'
    }), makePeriod(startMs, startMs + DAY_MS));
  }

  function characterEvents(nowMs) {
    const clock = readClock(nowMs);
    if (!clock) return [];
    const startMs = clock.epochDay * DAY_MS - JST_OFFSET_MS;
    const firstIndex = mod(clock.epochDay, DAILY_CHARACTER_EVENT_CYCLE_DAYS) * DAILY_CHARACTER_EVENT_COUNT;
    const tierIndex = mod(clock.epochDay, TIER_NAMES.length);
    return CHARACTER_EVENTS.slice(firstIndex, firstIndex + DAILY_CHARACTER_EVENT_COUNT).map(event =>
      withPeriod(Object.assign(base(clock, event.id), event, {
        active: true, current: true, upcoming: false, state: 'current', status: 'current',
        date: clock.today, tierIndex, tierName: TIER_NAMES[tierIndex],
        recommendedTierIndex: tierIndex, recommendedTierName: TIER_NAMES[tierIndex],
        availableTierIndices: AVAILABLE_TIER_INDICES, tierSelection: 'all',
        scheduleVersion: 2, cycleDays: DAILY_CHARACTER_EVENT_CYCLE_DAYS,
        dailyEventCount: DAILY_CHARACTER_EVENT_COUNT,
        nextStartMs: startMs + DAY_MS, annualRepeat: false, repeat: 'daily'
      }), makePeriod(startMs, startMs + DAY_MS))
    );
  }

  function eventAvailableOn(id, nowMs) {
    const event = eventById(id);
    const clock = readClock(nowMs);
    return Boolean(event && clock && Math.floor(event.index / DAILY_CHARACTER_EVENT_COUNT) === mod(clock.epochDay, DAILY_CHARACTER_EVENT_CYCLE_DAYS));
  }

  function tower(nowMs) {
    const clock = readClock(nowMs);
    if (!clock) return unavailable('tower');
    const currentStartMs = midnight(clock.year, clock.monthNumber, 15);
    const currentEndMs = midnight(clock.year, clock.monthNumber, 21);
    const active = clock.nowMs >= currentStartMs && clock.nowMs < currentEndMs;
    const hasEnded = clock.nowMs >= currentEndMs;
    const startMs = hasEnded ? midnight(clock.year, clock.monthNumber + 1, 15) : currentStartMs;
    const endMs = hasEnded ? midnight(clock.year, clock.monthNumber + 1, 21) : currentEndMs;
    const state = active ? 'current' : 'upcoming';
    return withPeriod(Object.assign(base(clock, 'tower'), {
      active, current: active, upcoming: !active, state, status: state,
      windowMonth: dateAt(startMs).slice(0, 7), currentStartMs, currentEndMs,
      nextStartMs: active ? midnight(clock.year, clock.monthNumber + 1, 15) : startMs,
      annualRepeat: false, repeat: 'monthly',
      scheduleLabel: '年間日程（仮）・端末時計｜毎月15日00:00 ～ 21日00:00（JST・21日は開催外）'
    }), makePeriod(startMs, endMs));
  }

  function annualPeriod(schedule, year) {
    const crossesYear = schedule.endMonth < schedule.startMonth ||
      (schedule.endMonth === schedule.startMonth && schedule.endDay <= schedule.startDay);
    return makePeriod(midnight(year, schedule.startMonth, schedule.startDay),
      midnight(year + (crossesYear ? 1 : 0), schedule.endMonth, schedule.endDay));
  }

  function status(eventId, nowMs) {
    if (eventId === 'daily') return daily(nowMs);
    if (eventId === 'tower') return tower(nowMs);
    const id = eventId === 'sakura' ? 'spring' : eventId;
    if (typeof id !== 'string' || !own(SCHEDULES, id)) return unavailable(typeof id === 'string' ? id : null, 'unknown_event');
    const clock = readClock(nowMs);
    if (!clock) return unavailable(id);
    const schedule = SCHEDULES[id];
    const candidates = [clock.year - 1, clock.year, clock.year + 1].map(year => annualPeriod(schedule, year));
    let period = candidates.find(p => clock.nowMs >= p.startMs && clock.nowMs < p.endMs);
    const active = Boolean(period);
    if (!period) period = candidates.find(p => p.startMs > clock.nowMs);
    if (!period) return unavailable(id);
    const state = active ? 'current' : 'upcoming';
    return withPeriod(Object.assign(base(clock, id), {
      active, current: active, upcoming: !active, state, status: state,
      title: schedule.title, annualRange: schedule.annualRange,
      nextStartMs: active ? annualPeriod(schedule, Number(period.startDate.slice(0, 4)) + 1).startMs : period.startMs,
      annualRepeat: true, repeat: 'annual',
      scheduleLabel: '年間日程（仮）・端末時計｜' + schedule.annualRange + '（JST）'
    }), period);
  }

  const api = Object.freeze({
    daily, tower, status, jst, DAY_MS, JST_OFFSET_MS, CHARACTER_IDS,
    TIER_NAMES, SCHEDULES, DISCLOSURE, CYCLE_DAYS: 42,
    characterEvent, characterEvents, eventAvailableOn, eventById, CHARACTER_EVENTS,
    CHARACTER_EVENT_VERSION, CHARACTER_EVENT_CYCLE_DAYS,
    DAILY_CHARACTER_EVENT_CYCLE_DAYS, DAILY_CHARACTER_EVENT_COUNT, AVAILABLE_TIER_INDICES
  });
  root.SakuraEventCalendar = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
