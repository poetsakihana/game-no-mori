'use strict';
// Logic/scene harness, not a WebGL or real-browser rendering test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../public/games/quest-reborn');

class MemoryStorage {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); this.failRead = false; this.failWrite = false; this.writes = 0; }
  getItem(key) { if (this.failRead) throw new Error('read denied'); return this.data.get(key) ?? null; }
  setItem(key, value) { if (this.failWrite) throw new Error('quota denied'); this.data.set(key, String(value)); this.writes++; }
}
function events(target = {}) {
  target.listeners = {};
  target.addEventListener = (name, callback) => (target.listeners[name] ||= []).push(callback);
  target.emit = (name, event = {}) => { for (const fn of target.listeners[name] || []) fn(event); };
  return target;
}
async function createHarness({ storage = new MemoryStorage(), deniedGetter = false, noWebGL = false } = {}) {
  const models = await import(pathToFileURL(path.join(root, 'models.js')));
  const core = await import(pathToFileURL(path.join(root, 'core.js')));
  const browser = await import(pathToFileURL(path.join(root, 'browser-storage.js')));
  const nodes = new Map();
  const noop = () => {};
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop: noop }) }, { get: (obj, key) => key in obj ? obj[key] : noop });
  const document = events({ hidden: false, activeElement: null });
  class Element {
    constructor(id = '', attrs = '') {
      events(this); this.id = id; this.style = {}; this.dataset = {}; this.value = attrs.match(/\bvalue="([^"]*)"/)?.[1] || '';
      this.checked = /\bchecked\b/.test(attrs); this.disabled = /\bdisabled\b/.test(attrs); this.textContent = ''; this._html = '';
      this.captures = new Set();
      const classes = new Set((attrs.match(/\bclass="([^"]*)"/)?.[1] || '').split(/\s+/));
      this.classList = { add: (...values) => values.forEach(x => classes.add(x)), remove: (...values) => values.forEach(x => classes.delete(x)), contains: value => classes.has(value), toggle: (value, force) => { const on = force ?? !classes.has(value); on ? classes.add(value) : classes.delete(value); return on; } };
      const action = attrs.match(/data-action="([^"]*)"/); if (action) this.dataset.action = action[1];
    }
    set innerHTML(value) { this._html = value; parse(value); }
    get innerHTML() { return this._html; }
    focus() { document.activeElement = this; }
    getContext(kind) { return kind === '2d' ? ctx : null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
    setPointerCapture(id) { this.captures.add(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    releasePointerCapture(id) { this.captures.delete(id); this.onlostpointercapture?.({ pointerId: id }); }
  }
  function parse(html) {
    for (const [, attrs] of html.matchAll(/<(?:[a-z][a-z0-9]*)\b([^>]*)>/gi)) {
      const id = attrs.match(/\bid="([^"]*)"/)?.[1];
      const action = attrs.match(/data-action="([^"]*)"/)?.[1];
      if (id || action) nodes.set(id || `action-${action}`, new Element(id || `action-${action}`, attrs));
    }
  }
  parse(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  document.getElementById = id => nodes.get(id) || null;
  document.createElement = tag => new Element(tag);
  document.querySelectorAll = selector => selector === '[data-action]' ? [...nodes.values()].filter(e => e.dataset.action) : [];
  const window = events({});
  Object.defineProperty(window, 'localStorage', { get() { if (deniedGetter) throw new Error('SecurityError'); return storage; } });
  class FakeRenderer {
    constructor() { if (noWebGL) throw new Error('No WebGL 2'); this.shadowMap = {}; this.renders = 0; }
    setSize() {} setPixelRatio(value) { this.pixelRatio = value; } render() { this.renders++; }
  }
  const errors = [];
  const sandbox = { ...models, ...core, ...browser, T: { ...models.T, WebGLRenderer: FakeRenderer },
    window, document, console: { log() {}, error: error => errors.push(String(error)), warn() {} },
    innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1, performance: { now: () => 0 },
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame() {},
  };
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(root, 'game.js'), 'utf8').replace(/^import .*?;\n/gm, '');
  vm.runInContext(source, sandbox, { filename: 'quest-reborn/game.js' });
  return {
    storage, window, document, nodes, errors,
    run: text => vm.runInContext(text, sandbox),
    click: id => { const element = nodes.get(id); if (!element) throw new Error(`Missing #${id}`); if (element.disabled) throw new Error(`Disabled #${id}`); if (!element.onclick) throw new Error(`Unbound #${id}`); element.onclick(); },
    press: code => window.emit('keydown', { code, repeat: false, preventDefault() {} }),
    release: code => window.emit('keyup', { code }),
    pointer: (id, type = 'down', pointerId = 1, x = 80, y = 50) => nodes.get(id)[`onpointer${type}`]?.({ pointerId, clientX: x, clientY: y, preventDefault() {} }),
    snapshot: () => JSON.parse(vm.runInContext('JSON.stringify({state,hero,mode,paused,graphicsLost,keys,joy,actions:[...inputActions],joystickPointer})', sandbox)),
  };
}
module.exports = { createHarness, MemoryStorage, root };
