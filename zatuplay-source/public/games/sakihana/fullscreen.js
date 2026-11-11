/* Fullscreen control for 咲華と失われた詩. Mount once per page. */
(function (global) {
  'use strict';
  function mount(options) {
    options = options || {};
    var doc = options.document || global.document;
    var parent = options.parent;
    var target = options.target;
    if (!doc || !parent || !target) throw new Error('fullscreen: parent and target are required');
    var button = doc.createElement('button');
    var status = doc.createElement('p');
    button.type = 'button';
    button.className = 'top-btn sakura-fullscreen-button';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = '全画面';
    status.className = 'sakura-fullscreen-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.classList.add('sakura-fullscreen-sr-only');
    parent.appendChild(button);
    parent.appendChild(status);
    var pending = false, desired = false, timer = null, destroyed = false, sequence = 0;
    var standard = typeof target.requestFullscreen === 'function' && typeof doc.exitFullscreen === 'function' && doc.fullscreenEnabled !== false;
    var webkit = typeof target.webkitRequestFullscreen === 'function' && typeof doc.webkitExitFullscreen === 'function' && doc.webkitFullscreenEnabled !== false;
    var request = standard ? target.requestFullscreen : webkit ? target.webkitRequestFullscreen : null;
    var exit = standard ? doc.exitFullscreen : webkit ? doc.webkitExitFullscreen : null;
    function current() { return doc.fullscreenElement || doc.webkitFullscreenElement || null; }
    function active() { return current() === target; }
    function supported() {
      return !!request && !!exit;
    }
    function message(text, visible) {
      status.textContent = text;
      status.classList.toggle('sakura-fullscreen-sr-only', !visible);
    }
    function resetPending() {
      pending = false;
      button.disabled = false;
      if (timer !== null) { global.clearTimeout(timer); timer = null; }
    }
    function restoreGameFocus() {
      if (doc.activeElement !== button || typeof options.getFocusTarget !== 'function') return;
      try {
        var focusTarget = options.getFocusTarget();
        if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });
      } catch (error) { /* Focus is optional; the control remains usable. */ }
    }
    function showFailure() {
      message('全画面に切り替えられませんでした。ブラウザの設定をご確認ください。iPhoneではSafariの共有メニューから「ホーム画面に追加」で広く使える場合があります（対応状況は環境によります）。', true);
      restoreGameFocus();
    }
    function sync(fromChange) {
      if (destroyed) return;
      var on = active();
      button.textContent = on ? '全画面を終了' : '全画面';
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      target.classList.toggle('sakura-fullscreen-active', on);
      if (fromChange && pending && on !== desired) {
        resetPending();
        showFailure();
      } else if (fromChange) {
        resetPending();
        message(on ? '全画面表示中です。' : '全画面を終了しました。', false);
        // The canvas owns keyboard gameplay. Restore focus only after a button-
        // initiated change, and only when the host reports that gameplay exists.
        restoreGameFocus();
      }
    }
    function onChange() { sync(true); }
    function onError() {
      if (!pending || destroyed) return;
      sequence++;
      resetPending();
      showFailure();
    }
    function click() {
      if (pending || destroyed) return;
      if (!supported()) {
        message('このブラウザでは全画面表示を利用できません。iPhoneではSafariの共有メニューから「ホーム画面に追加」で広く使える場合があります（対応状況は環境によります）。', true);
        restoreGameFocus();
        return;
      }
      var isExit = active();
      desired = !isExit;
      var operation = isExit ? exit : request;
      var receiver = isExit ? doc : target;
      var id = ++sequence;
      pending = true;
      button.disabled = true;
      message('切り替えを確認しています。', false);
      // Do not await anything before the call: browsers require user activation.
      var result;
      try { result = operation.call(receiver); }
      catch (error) { onError(); return; }
      if (result && typeof result.then === 'function') {
        result.then(function () {
          // State is confirmed only by fullscreenchange, never by a resolved promise.
        }, function () { if (!destroyed && pending && id === sequence) onError(); });
      }
      // Some implementations fail silently and never send an event.
      if (pending && id === sequence) timer = global.setTimeout(function () {
        if (!destroyed && pending && id === sequence) {
          resetPending();
          showFailure();
        }
      }, 4000);
    }
    button.addEventListener('click', click);
    doc.addEventListener('fullscreenchange', onChange);
    doc.addEventListener('webkitfullscreenchange', onChange);
    doc.addEventListener('fullscreenerror', onError);
    doc.addEventListener('webkitfullscreenerror', onError);
    sync(false);
    return {
      button: button,
      status: status,
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        sequence++;
        resetPending();
        button.removeEventListener('click', click);
        doc.removeEventListener('fullscreenchange', onChange);
        doc.removeEventListener('webkitfullscreenchange', onChange);
        doc.removeEventListener('fullscreenerror', onError);
        doc.removeEventListener('webkitfullscreenerror', onError);
        target.classList.remove('sakura-fullscreen-active');
        button.remove();
        status.remove();
      }
    };
  }
  global.SakuraFullscreen = Object.freeze({ mount: mount });
})(window);
