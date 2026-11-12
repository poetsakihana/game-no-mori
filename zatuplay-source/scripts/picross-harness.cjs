'use strict';
// DOM + deterministic timers, not a real browser or CSS layout engine.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {parseHTML} = require('linkedom');
const root = path.resolve(__dirname, '../public/games/picross-mv');
const KEY = 'picross-mv-port-v1';
class MemoryStorage {
  constructor(data = {}) { this.data = new Map(Object.entries(data)); this.failRead = false; this.failWrite = false; this.writes = 0; }
  getItem(k) { if (this.failRead) throw Error('read denied'); return this.data.get(k) ?? null; }
  setItem(k, v) { if (this.failWrite) throw Error('quota'); this.data.set(k, String(v)); this.writes++; }
}
function lockManager() {
  let tail = Promise.resolve();
  return {request(name, fn) { const task = tail.then(fn); tail = task.catch(() => {}); return task; }};
}
function createHarness({storage = new MemoryStorage(), deniedGetter = false, locks = null} = {}) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), dom = parseHTML(html), document = dom.document;
  const navigations = [];
  let active = document.body, hidden = false, confirmResult = true, clock = 0, seq = 0;
  const timers = new Map(), listeners = {};
  Object.defineProperty(document, 'activeElement', {get: () => active});
  Object.defineProperty(document, 'hidden', {get: () => hidden});
  dom.HTMLElement.prototype.focus = function () { active = this; this.dispatchEvent(new dom.Event('focus')); };
  dom.HTMLElement.prototype.showModal = function () { this.open = true; };
  dom.HTMLElement.prototype.close = function () { this.open = false; };
  Object.defineProperty(dom.HTMLSelectElement.prototype, 'value', {get() { return this._value ?? this.querySelector('option')?.value ?? ''; }, set(v) { this._value = String(v); }});
  const sandbox = {document, console, location: {assign(url) { navigations.push(url); }}, navigator: {locks}, confirm: () => confirmResult,
    setInterval(fn, ms) { const id = ++seq; timers.set(id, {fn, ms, at: clock + ms}); return id; },
    clearInterval(id) { timers.delete(id); },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }
  };
  sandbox.window = sandbox;
  Object.defineProperty(sandbox, 'localStorage', {get() { if (deniedGetter) throw Error('blocked getter'); return storage; }});
  vm.createContext(sandbox);
  for (const [, src] of html.matchAll(/<script src="([^"]+)"><\/script>/g)) vm.runInContext(fs.readFileSync(path.join(root, src.split('?')[0]), 'utf8'), sandbox, {filename: src});
  const get = selector => document.querySelector(selector);
  function emit(node, type, props = {}) {
    if (!node) throw Error('missing event target: ' + type);
    const event = new dom.Event(type, {bubbles: true, cancelable: true}); Object.assign(event, props); node.dispatchEvent(event); return event;
  }
  function click(selector, props = {}) { const node = typeof selector === 'string' ? get(selector) : selector; if (node.disabled) throw Error('disabled button'); return emit(node, 'click', {detail: 0, ...props}); }
  function cell(i) { return get('[data-index="' + i + '"]'); }
  function tap(i, props = {}) { return click(cell(i), props); }
  function open(id) { click('[data-board-id="' + id + '"]'); }
  function windowEvent(type, props = {}) { for (const fn of listeners[type] || []) fn({type, ...props}); }
  function visibility(value) { hidden = value; emit(document, 'visibilitychange'); }
  function advance(ms) {
    const target = clock + ms;
    while (true) { const entry = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]; if (!entry || entry[1].at > target) break; clock = entry[1].at; entry[1].at += entry[1].ms; entry[1].fn(); }
    clock = target;
  }
  async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
  return {document, get, emit, click, tap, cell, open, windowEvent, visibility, advance, storage, settle, navigations, data: sandbox.PICROSS_DATA,
    setConfirm: v => { confirmResult = v; }, status: () => get('#storage-status').textContent,
    value: () => JSON.parse(storage.data.get(KEY) ?? 'null')};
}
module.exports = {createHarness, MemoryStorage, lockManager, root, KEY};
