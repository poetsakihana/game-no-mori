import { ENEMIES, migrateCatalogSave } from './catalog.js';

export const SAVE = 'ehrgeiz-quest-reborn-v2';
export const SETTINGS = 'ehrgeiz-quest-settings';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min, max) => number(value, min, max) && Number.isInteger(value);
const unique = values => [...new Set(values)];

export function normalizeSettings(value) {
  const data = record(value) ? value : {};
  return {
    volume: number(data.volume, 0, 1) ? data.volume : .3,
    difficulty: data.difficulty === 'normal' ? 'normal' : 'easy',
    quality: data.quality === 'standard' ? 'standard' : 'light',
    shake: typeof data.shake === 'boolean' ? data.shake : true,
  };
}

// Never evaluate save contents or insert their strings into markup. Invalid saves
// stay in storage until the player explicitly confirms a new adventure.
export function normalizeSave(value) {
  if (!record(value) || value.version !== 2 || !['masuda', 'claire'].includes(value.kind) ||
      !integer(value.floor, 1, 21) || !integer(value.seed, 0, 0x7fffffff) || !record(value.hero)) return null;
  const h = value.hero;
  if (!number(h.maxHp, 1, 1e9) || !number(h.maxMp, 1, 1e9) ||
      !number(h.hp, 0, h.maxHp) || !number(h.mp, 0, h.maxMp) ||
      !number(h.x, -100, 100) || !number(h.z, -100, 100)) return null;
  const data = {
    version: 2, kind: value.kind, seed: value.seed, floor: value.floor,
    catalogRevision: integer(value.catalogRevision, 0, 1000) ? value.catalogRevision : 0,
    level: integer(value.level, 1, 1e6) ? value.level : 1,
    xp: number(value.xp, 0, 1e12) ? value.xp : 0,
    gold: number(value.gold, 0, 1e12) ? value.gold : 0,
    potions: integer(value.potions, 0, 1e9) ? value.potions : 0,
    weapon: integer(value.weapon, 0, 1e6) ? value.weapon : 0,
    armor: integer(value.armor, 0, 1e6) ? value.armor : 0,
    magic: ['fire', 'ice', 'lightning'].includes(value.magic) ? value.magic : 'fire',
    kills: {},
    opened: unique((Array.isArray(value.opened) ? value.opened : []).filter(id => id === 2 || id === 5)),
    dead: unique((Array.isArray(value.dead) ? value.dead : []).filter(id => typeof id === 'string' && /^(?:[13]-[012]|4-0)$/.test(id))),
    rooms: unique([0, ...(Array.isArray(value.rooms) ? value.rooms : []).filter(id => integer(id, 0, 6))]),
    key: value.key === true,
    completed: value.completed === true && value.floor === 21,
    playtime: number(value.playtime, 0, 1e12) ? value.playtime : 0,
    savedAt: number(value.savedAt, 0, 1e15) ? value.savedAt : 0,
    hero: {
      x: h.x, z: h.z, hp: h.hp, maxHp: h.maxHp, mp: h.mp, maxMp: h.maxMp,
      st: number(h.st, 0, 100) ? h.st : 100,
      angle: number(h.angle, -1e9, 1e9) ? h.angle : Math.PI,
      y: 0, vy: 0, attack: 0, combo: 0, comboTime: 0, attackCd: 0,
      dodge: 0, dodgeCd: 0, iframes: 1, magicCd: 0, blocking: false,
      blockTime: 0, dx: 0, dz: -1, status: {},
    },
  };
  if (record(value.kills)) for (const [id, count] of Object.entries(value.kills)) {
    if (Object.hasOwn(ENEMIES, id) && integer(count, 0, 1e12)) data.kills[id] = count;
  }
  if (record(h.status)) for (const key of ['poison', 'burn', 'chill', 'tick']) {
    if (number(h.status[key], 0, 60)) data.hero.status[key] = h.status[key];
  }
  return migrateCatalogSave(data);
}

// Access the localStorage property inside try/catch too: some browsers reject
// the getter itself, before getItem/setItem can be called.
export function createSaveStore(getStorage, notify = () => {}) {
  function read(key) {
    try { return getStorage().getItem(key); }
    catch { notify('このブラウザでは保存領域を利用できません。進行は画面を閉じると失われます。'); return null; }
  }
  function parse(key) {
    const raw = read(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); }
    catch { notify('保存データを読み込めません。記録は削除していません。新しい冒険を始めると上書きします。'); return null; }
  }
  return {
    readSettings: () => normalizeSettings(parse(SETTINGS)),
    hasAnySave: () => read(SAVE) !== null,
    readSave() {
      const raw = parse(SAVE);
      const data = normalizeSave(raw);
      if (raw !== null && data === null) notify('保存データの形式を確認できません。記録は削除していません。新しい冒険を始めると上書きします。');
      return data;
    },
    write(key, data) {
      try { getStorage().setItem(key, JSON.stringify(data)); return true; }
      catch { notify('保存できませんでした。保存設定・空き容量を確認してください。今回の変更は再読込で失われることがあります。'); return false; }
    },
  };
}
