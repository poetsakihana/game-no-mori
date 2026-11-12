/* NEON MAZE native rules, transcribed from the supplied 1.0 APK.
   Pure model; no browser, storage, or test-only progression shortcuts. */
(function (root) {
  'use strict';
  const f = Math.fround;
  const WIDTH = 360, HEIGHT = 800, LEVELS = 30;
  function course(level) {
    if (!Number.isInteger(level) || level < 0 || level >= LEVELS) throw Error('不正なステージ');
    const line = [];
    for (let i = 0; i <= 220; i++) {
      const t = f(i / 220), a = t * Math.PI;
      const wave = f(f(f(75 + f(Math.min(level, 20) * f(1.4))) * f(Math.sin((level % 6 + 2) * a + .59 * level))) + f(f(Math.sin(a * 10 + level)) * 22));
      line.push({x: f(f(f(Math.sin(a)) * wave) + 180), y: f(666 - f(t * 500))});
    }
    return {line, width: f(74 - f(level * f(1.12))), limit: 75 - level};
  }
  function distance(line, x, y) {
    let d = 10000;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i], dx = f(b.x - a.x), dy = f(b.y - a.y);
      const t = Math.max(0, Math.min(1, f(f(f(f(x - a.x) * dx) + f(f(y - a.y) * dy)) / f(f(dx * dx) + f(dy * dy)))));
      const rx = f(f(x - a.x) - f(dx * t)), ry = f(f(y - a.y) - f(dy * t));
      d = Math.min(d, f(Math.sqrt(f(f(rx * rx) + f(ry * ry)))));
    }
    return d;
  }
  class Game {
    constructor(saved) {
      this.state = saved ? structuredClone(saved) : {screen: 0, level: 0, page: 0, unlocked: 1, sound: true, deaths: 0, best: Array(30).fill(null), x: 180, y: 666, elapsed: 0, reason: ''};
      if (this.state.screen === 2) this.state.screen = 3;
      this.course = course(this.state.level);
    }
    snapshot() { return structuredClone(this.state); }
    start(level) {
      if (!Number.isInteger(level) || level < 0 || level >= this.state.unlocked) return false;
      this.course = course(level);
      Object.assign(this.state, {screen: 2, level, x: this.course.line[0].x, y: this.course.line[0].y, elapsed: 0, reason: ''});
      return true;
    }
    pause() { if (this.state.screen === 2) this.state.screen = 3; }
    resume() { if (this.state.screen === 3) this.state.screen = 2; }
    tick(ms) {
      if (this.state.screen !== 2 || !Number.isFinite(ms)) return;
      this.state.elapsed = Math.min(Number.MAX_SAFE_INTEGER, this.state.elapsed + Math.max(0, ms));
      if (this.state.elapsed > this.course.limit * 1000) this.fail('時間切れ！');
    }
    fail(reason) {
      if (this.state.screen !== 2) return;
      this.state.screen = 4; this.state.reason = reason; this.state.deaths++;
    }
    win() {
      if (this.state.screen !== 2) return;
      const s = this.state, ms = Math.max(1, Math.round(s.elapsed));
      s.elapsed = ms; s.screen = 5;
      if (s.best[s.level] === null || ms < s.best[s.level]) s.best[s.level] = ms;
      s.unlocked = Math.max(s.unlocked, Math.min(30, s.level + 2));
    }
    move(x, y) {
      if (this.state.screen !== 2 || !Number.isFinite(x) || !Number.isFinite(y)) return;
      const s = this.state, dx = f(f(x) - s.x), dy = f(f(y) - s.y);
      const n = Math.max(1, Math.ceil(Math.sqrt(f(f(dx * dx) + f(dy * dy))) / 2));
      if (n > 5000) { this.fail('壁に当たった！'); return; }
      const ox = s.x, oy = s.y, goal = this.course.line[220];
      for (let i = 1; i <= n; i++) {
        const nx = f(f(f(dx * i) / n) + ox), ny = f(f(f(dy * i) / n) + oy);
        if (distance(this.course.line, nx, ny) > f(f(this.course.width / 2) - 8)) { this.fail('壁に当たった！'); return; }
        s.x = nx; s.y = ny;
        if (Math.hypot(f(nx - goal.x), f(ny - goal.y)) < 15) { this.win(); return; }
      }
    }
    drag(dx, dy) { this.move(f(this.state.x + f(f(dx) * f(.8))), f(this.state.y + f(f(dy) * f(.8)))); }
    action(id) {
      const s = this.state;
      if (id >= 200) return s.screen === 1 && this.start(id - 200);
      switch (id) {
        case 100: if (s.screen !== 0) return false; s.screen = 1; break;
        case 101: s.sound = !s.sound; break;
        case 102: if (s.screen !== 1) return false; s.page = Math.max(0, s.page - 1); break;
        case 103: if (s.screen !== 1) return false; s.page = Math.min(2, s.page + 1); break;
        case 104: s.screen = 0; break;
        case 105: this.pause(); break;
        case 106: this.resume(); break;
        case 107: if (![3,4].includes(s.screen)) return false; return this.start(s.level);
        case 108: if (s.screen !== 5) return false; if (s.level < 29) return this.start(s.level + 1); s.screen = 1; s.page = 2; break;
        case 109: s.screen = 1; s.page = Math.floor(s.level / 10); break;
        default: return false;
      }
      return true;
    }
  }
  function validateState(s) {
    const keys = ['screen','level','page','unlocked','sound','deaths','best','x','y','elapsed','reason'];
    if (!s || typeof s !== 'object' || Array.isArray(s) || Object.keys(s).length !== keys.length || !keys.every(k => Object.hasOwn(s,k))) throw Error('保存項目が一致しません');
    const int = (n,a,b) => Number.isInteger(n) && n >= a && n <= b;
    if (!int(s.screen,0,5) || !int(s.level,0,29) || !int(s.page,0,2) || !int(s.unlocked,1,30) || !int(s.deaths,0,1e9) || typeof s.sound !== 'boolean' || !Array.isArray(s.best) || s.best.length !== 30 || s.best.some((b,i) => b !== null && !int(b,1,(75-i)*1000))) throw Error('保存値が不正です');
    const cleared = s.best.findIndex(b => b === null), count = cleared < 0 ? 30 : cleared;
    if (s.best.slice(count).some(b => b !== null) || s.unlocked !== Math.min(30,count + 1) || s.level >= s.unlocked) throw Error('解放記録が一致しません');
    const c = course(s.level);
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || s.x < 0 || s.x > 360 || s.y < 100 || s.y > 720 || !Number.isFinite(s.elapsed) || s.elapsed < 0 || s.elapsed > Number.MAX_SAFE_INTEGER || !['','壁に当たった！','時間切れ！'].includes(s.reason)) throw Error('途中記録が不正です');
    if (s.screen >= 2 && distance(c.line,s.x,s.y) > c.width/2 - 8 + .001) throw Error('棒の位置が不正です');
    if ([2,3,5].includes(s.screen) && s.elapsed > c.limit*1000) throw Error('制限時間が不正です');
    if (s.screen === 4 && !s.reason || s.screen === 5 && (s.best[s.level] === null || Math.hypot(s.x-c.line[220].x,s.y-c.line[220].y) >= 15.001)) throw Error('結果記録が不正です');
    return structuredClone(s);
  }
  function decode(raw) {
    if (typeof raw !== 'string' || raw.length > 10000) throw Error('保存ファイルが不正です');
    const v = JSON.parse(raw);
    if (!v || Object.keys(v).sort().join(',') !== 'revision,state,version' || v.version !== 1 || !Number.isSafeInteger(v.revision) || v.revision < 1) throw Error('保存形式に対応していません');
    return {version: 1, revision: v.revision, state: validateState(v.state)};
  }
  root.NeonMaze = {Game, course, distance, validateState, decode, WIDTH, HEIGHT, LEVELS};
})(globalThis);
