const starterCount = 5;
const totalStages = 100;

export function loadRecord(data) {
  const values = Array.isArray(data?.cleared) ? data.cleared : [];
  const cleared = new Set(values.filter(id => Number.isInteger(id) && id > 0 && id <= totalStages));
  const record = { cleared, sound: data?.sound !== false, selected: 1 };
  if (Number.isInteger(data?.selected) && data.selected >= 1 && data.selected <= unlockedCount(record)) {
    record.selected = data.selected;
  }
  return record;
}

export function unlockedCount(record) {
  return Math.min(totalStages, starterCount + record.cleared.size);
}

export function recordClear(record, id) {
  const before = unlockedCount(record);
  if (Number.isInteger(id) && id >= 1 && id <= before) record.cleared.add(id);
  return unlockedCount(record) > before ? before + 1 : null;
}

export function nextUncleared(record, current) {
  const unlocked = unlockedCount(record);
  for (let step = 1; step <= unlocked; step += 1) {
    const id = (current - 1 + step) % unlocked + 1;
    if (!record.cleared.has(id)) return id;
  }
  return null;
}
