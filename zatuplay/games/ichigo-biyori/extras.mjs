import { DAY, advance, calendar, newGame, restoreGame } from './game.mjs?v=4';
import { CROP_IDS } from './crops.mjs?v=3';

const JST = 9 * 3600000;
export const BACKUP_KEY = 'ichigo-biyori.garden.v2.before-reset';
const tasks = [
  { label: '朝露のしおり', requirements: [['water', '日を分けて水やり', 2], ['feed', '肥料を足す', 1]] },
  { label: '窓辺のしおり', requirements: [['water', '日を分けて水やり', 2], ['move', '鉢を移す', 1]] },
  { label: '芽吹きのしおり', requirements: [['water', '日を分けて水やり', 3]] },
];
export function weeklyGarden(state, now) {
  const d = calendar(now).day;
  const monday = d - ((d + 3) % 7 + 7) % 7;
  const week = Math.floor(monday / 7);
  const task = tasks[((week % tasks.length) + tasks.length) % tasks.length];
  const start = monday * DAY - JST, end = start + 7 * DAY;
  const counts = task.requirements.map(([type, name, goal]) => {
    const days = new Set(state.history.filter(h => h.type === type && h.at >= start && h.at < end && h.at <= now).map(h => calendar(h.at).day));
    return { name, goal, count: Math.min(days.size, goal) };
  });
  return { title: task.label, start, end, counts, done: counts.every(c => c.count === c.goal) };
}
export const bookComplete = state => CROP_IDS.every(id => Object.hasOwn(state.book, id));

export function decodeGarden(raw) {
  if (typeof raw !== 'string') return null;
  try { return restoreGame(JSON.parse(raw)); } catch { return null; }
}
export const sameGarden = (a, b) => a.startedAt === b.startedAt && (a.gardenGeneration ?? '') === (b.gardenGeneration ?? '');

export function replaceGarden(storage, key, expected, now, generation, restoring = false, expectedBackup = null) {
  const live = storage.getItem(key);
  if (live !== expected) throw new Error('他の画面で記録が変わりました。開き直して確認してください。');
  const current = decodeGarden(live);
  if (!current) throw new Error('保存済みの庭を確認できないため、記録は変更していません。');
  const backupRaw = storage.getItem(BACKUP_KEY);
  if (restoring && backupRaw !== expectedBackup) throw new Error('復元する庭が変わりました。開き直して確認してください。');
  const backup = restoring ? decodeGarden(backupRaw) : null;
  if (restoring && !backup) throw new Error('復元できる記録がありません。');
  const transitionAt = Math.max(now, current.lastAt);
  const revision = Math.max(current.revision, backup?.revision ?? 0) + 1;
  if (!Number.isSafeInteger(revision)) throw new Error('記録の世代を安全に更新できません。');
  // Keep the cursor monotonic so already-open v4 tabs also follow this save
  // instead of re-writing their older garden at the next scheduled tick.
  const next = { ...(backup ?? newGame(transitionAt)), revision, gardenGeneration: generation };
  advance(next, transitionAt, true);
  const serialized = JSON.stringify(next);
  storage.setItem(BACKUP_KEY, live);
  try { storage.setItem(key, serialized); }
  catch(error) {
    try { if (backupRaw === null) storage.removeItem(BACKUP_KEY); else storage.setItem(BACKUP_KEY, backupRaw); } catch {}
    throw error;
  }
  return next;
}
