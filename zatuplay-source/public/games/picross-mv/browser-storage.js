/* Browser adaptation of the APK save format. No automatic repair or deletion. */
(function () {
  'use strict';
  var KEY = 'picross-mv-port-v1';
  var storage, baseline, blocked = false, pending = null, queued = false;
  var status = 'このブラウザに自動保存します。', statusKind = 'ready';
  var waiters = [], listeners = [], boards = Object.create(null);
  PICROSS_DATA.forEach(function (q) { boards[q.id] = q; });
  function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function keys(value, allowed) { return Object.keys(value).every(function (key) { return allowed.indexOf(key) >= 0; }); }
  function valid(value) {
    if (!record(value) || !keys(value, ['boards', 'cleared']) || !record(value.boards) || !record(value.cleared)) return false;
    if (!Object.keys(value.cleared).every(function (id) { return Object.hasOwn(boards, id) && value.cleared[id] === true; })) return false;
    return Object.keys(value.boards).every(function (id) {
      if (!Object.hasOwn(boards, id)) return false;
      var b = value.boards[id], q = boards[id];
      if (!record(b) || !keys(b, ['cells', 'seconds', 'finished']) || !Array.isArray(b.cells) || b.cells.length !== q.width * q.height) return false;
      if (!b.cells.every(function (v) { return Number.isInteger(v) && v >= 0 && v <= 2; })) return false;
      if (!Number.isSafeInteger(b.seconds) || b.seconds < 0 || typeof b.finished !== 'boolean') return false;
      var complete = q.grid.flat().every(function (v, i) { return (b.cells[i] === 1 ? 1 : 0) === v; });
      if (b.finished !== complete || (b.finished && !value.cleared[id])) return false;
      return true;
    });
  }
  function announce(text, kind) {
    status = text; statusKind = kind;
    listeners.forEach(function (fn) { fn(status, statusKind); });
  }
  function settleWaiters() {
    if (blocked || (!queued && pending === null)) waiters.splice(0).forEach(function (resolve) { resolve(!blocked); });
  }
  function stop(text) {
    blocked = true; pending = null;
    announce(text + ' このタブでの進行は保存されません。元の保存を消さず、他のタブを閉じてから再読込してください。', 'error');
    settleWaiters();
  }
  function load() {
    try {
      storage = window.localStorage;
      baseline = storage.getItem(KEY);
      if (baseline === null) return {boards: {}, cleared: {}};
      var value = JSON.parse(baseline);
      if (!valid(value)) throw new Error('invalid save');
      announce('保存データを読み込みました。', 'ready');
      return value;
    } catch (e) {
      stop('保存データを読み込めないか、形式が壊れています。上書きを停止しました。');
      return {boards: {}, cleared: {}};
    }
  }
  function flush() {
    if (blocked || pending === null) return;
    var next = pending; pending = null;
    try {
      if (storage.getItem(KEY) !== baseline) {
        stop('別のタブで保存内容が変わりました。競合を防ぐため上書きを停止しました。'); return;
      }
      if (next !== baseline) storage.setItem(KEY, next);
      baseline = next;
      announce('保存しました。', 'saved');
    } catch (e) {
      stop('保存に失敗しました。容量不足やブラウザの保存設定を確認してください。');
    }
  }
  function save(value) {
    if (blocked) return false;
    if (!valid(value)) { stop('進行データの形式を確認できないため、上書きを停止しました。'); return false; }
    pending = JSON.stringify(value);
    if (window.navigator && window.navigator.locks && window.navigator.locks.request) {
      announce('保存中… ページを閉じずにお待ちください。', 'pending');
      if (!queued) {
        queued = true;
        try {
          window.navigator.locks.request('zatuplay-' + KEY, function () { flush(); }).then(function () {
            queued = false;
            // A newer user action may arrive after flush but before the lock settles.
            if (pending !== null && !blocked) save(JSON.parse(pending));
            settleWaiters();
          }, function () { queued = false; stop('保存用のロックを取得できませんでした。'); });
        } catch (e) { queued = false; stop('保存用のロックを取得できませんでした。'); }
      }
    } else {
      // Legacy browsers: optimistic comparison + storage events. No atomic CAS API exists.
      flush(); settleWaiters();
    }
    return !blocked;
  }
  window.addEventListener('storage', function (e) {
    if (blocked || (e.storageArea && e.storageArea !== storage)) return;
    if (e.key === KEY || e.key === null) {
      try {
        if (storage.getItem(KEY) !== baseline) stop('別のタブで保存内容が変わりました。競合を防ぐため上書きを停止しました。');
      } catch (error) { stop('保存領域を読み取れなくなりました。'); }
    }
  });
  window.PicrossStorage = {load: load, save: save, isPending: function () { return !blocked && (pending !== null || queued); }, whenIdle: function () { return new Promise(function (resolve) { waiters.push(resolve); settleWaiters(); }); }, subscribe: function (fn) { listeners.push(fn); fn(status, statusKind); }};
})();
