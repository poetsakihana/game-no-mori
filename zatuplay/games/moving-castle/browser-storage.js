/* Browser save validation. Game data and balance remain in the original game. */
(function (root) {
  'use strict';
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const finite = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e12;
  const integer = x => finite(x) && Number.isInteger(x);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  function normalize(data, template, worlds) {
    if (!object(data) || ![1, 2].includes(data.version) || !object(data.player) || !object(data.castle) || !object(data.resources) || !Array.isArray(data.data)) return null;
    if (!integer(data.chapter) || data.chapter < 0 || data.chapter >= worlds.length || !data.data.length || data.data.length > worlds.length) return null;
    if (data.maxUnlocked !== undefined && (!integer(data.maxUnlocked) || data.maxUnlocked < 0 || data.maxUnlocked >= worlds.length)) return null;
    const out = template;
    for (const key of ['player', 'castle']) {
      for (const field of Object.keys(template[key])) {
        if (data[key][field] === undefined) continue;
        if (!finite(data[key][field])) return null;
        out[key][field] = data[key][field];
      }
    }
    const p = out.player, c = out.castle;
    for (const [state, fields] of [[p, ['maxHp', 'maxSp', 'level', 'nextXp', 'atk', 'weapon', 'armor']], [c, ['maxHp', 'engine', 'hull', 'workshop']]]) {
      if (fields.some(k => !integer(state[k]) || state[k] < 1)) return null;
    }
    if (!integer(p.xp) || p.xp < 0 || !integer(p.potions) || p.potions < 0 || !integer(c.turret) || c.turret < 0) return null;
    if (p.weapon > 6 || p.armor > 5 || c.engine > 4 || c.turret > 4 || c.hull > 4 || c.workshop > 3) return null;
    p.x = clamp(p.x, 35, 2645); p.y = clamp(p.y, 40, 1560);
    c.x = clamp(c.x, 112, 2580); c.y = clamp(c.y, 145, 1525);
    p.hp = clamp(p.hp, 1, p.maxHp); p.sp = clamp(p.sp, 0, p.maxSp); c.hp = clamp(c.hp, 1, c.maxHp);
    for (const k of ['attackTimer', 'dodgeTimer', 'dodgeCD', 'skillCD', 'invuln']) p[k] = 0;
    c.fireCD = 0;
    for (const k of ['wood', 'ore', 'crystal']) {
      if (!integer(data.resources[k]) || data.resources[k] < 0) return null;
      out.resources[k] = data.resources[k];
    }
    for (const k of ['totalKills', 'saves', 'seconds']) {
      if (data[k] !== undefined && (!finite(data[k]) || data[k] < 0 || (k !== 'seconds' && !integer(data[k])))) return null;
      out[k] = data[k] ?? 0;
    }
    for (let i = 0; i < worlds.length; i++) {
      const d = data.data[i];
      if (d === undefined) continue; // v1 contained fewer regions.
      if (!object(d) || (d.cleared !== undefined && typeof d.cleared !== 'boolean') || (d.kills !== undefined && (!integer(d.kills) || d.kills < 0))) return null;
      if (d.collected !== undefined && !Array.isArray(d.collected)) return null;
      const allowed = new Set(worlds[i].nodes.map(n => n.id));
      out.data[i] = { cleared: d.cleared === true, kills: d.kills ?? 0, collected: [...new Set((d.collected || []).filter(id => typeof id === 'string' && allowed.has(id)))] };
    }
    out.chapter = data.chapter;
    out.maxUnlocked = Math.max(data.maxUnlocked || 0, data.chapter);
    out.storySeen = worlds.map((_, i) => data.storySeen?.[i] === true || i <= out.chapter);
    out.completed = out.data[worlds.length - 1].cleared; // Repairs the original final-boss save-order bug.
    out.version = 2; out.mode = 'hero';
    return out;
  }
  root.WalkingCastleStorage = Object.freeze({ normalize });
})(typeof window !== 'undefined' ? window : globalThis);
