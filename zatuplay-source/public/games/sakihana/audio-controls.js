/* Accessible, non-modal audio settings. No audio or game state is owned here.
 * createAudioControls({ canvas, audio, onOpen?, onClose?, triggerParent? })
 * audio: getSettings(), setSettings(partial), unlock(event), getStatus?().
 * Returns { isOpen(), setVisible(boolean), destroy() }. Volumes use 0–1.
 */
(function (root) {
  'use strict';
  let nextId = 0;

  root.createAudioControls = function createAudioControls(options) {
    options = options || {};
    const canvas = options.canvas;
    const doc = (canvas && canvas.ownerDocument) || root.document;
    if (!doc || !doc.body || !doc.createElement) {
      return { isOpen: function () { return false; }, setVisible: function () {}, destroy: function () {} };
    }
    const audio = options.audio;
    const triggerParent = options.triggerParent && options.triggerParent.appendChild ? options.triggerParent : null;
    const id = 'sakura-audio-' + (++nextId);
    let opened = false, destroyed = false, visibleByHost = true, pendingLayout = 0, resizeObserver = null;
    let previousFocus = null, interactionError = '', settingsError = false;
    const listeners = [];
    const controls = {};
    const defaults = { bgmEnabled: true, seEnabled: true, bgmVolume: 0.5, seVolume: 0.6 };
    let settings = Object.assign({}, defaults);

    function node(tag, className, text) {
      const el = doc.createElement(tag);
      if (className) el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    }
    function listen(target, type, callback, capture) {
      if (!target || !target.addEventListener) return;
      target.addEventListener(type, callback, capture || false);
      listeners.push(function () { target.removeEventListener(type, callback, capture || false); });
    }
    function focus(el) {
      if (!el || !el.focus || el.isConnected === false) return;
      try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
    }
    function finiteVolume(value, fallback) {
      return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    }
    function readSettings() {
      try {
        const saved = audio && typeof audio.getSettings === 'function' ? audio.getSettings() : null;
        if (saved && typeof saved === 'object') {
          ['bgmEnabled', 'seEnabled'].forEach(function (key) {
            if (typeof saved[key] === 'boolean') settings[key] = saved[key];
          });
          ['bgmVolume', 'seVolume'].forEach(function (key) {
            settings[key] = finiteVolume(saved[key], settings[key]);
          });
        }
        settingsError = false;
      } catch (_) { settingsError = true; }
      return settings;
    }
    function readStatus() {
      if (!audio || typeof audio.getSettings !== 'function' || typeof audio.setSettings !== 'function') {
        return { available: false };
      }
      try { return typeof audio.getStatus === 'function' ? audio.getStatus() || {} : {}; }
      catch (_) { return {}; }
    }

    const host = node('div');
    host.id = id;
    if (triggerParent) host.className = 'sa-docked';
    host.lang = 'ja';
    const style = node('style');
    style.textContent = `
#${id}{position:fixed;left:0;top:0;width:0;height:0;z-index:50;pointer-events:none;color:#473449;font:14px/1.5 system-ui,-apple-system,"Hiragino Kaku Gothic ProN","Meiryo",sans-serif}
#${id} *{box-sizing:border-box}
#${id}[hidden]{display:none!important}
#${id} [hidden]{display:none!important}
#${id} button,#${id} input{font:inherit}
#${id} button{min-height:44px;border:1px solid #a56b88;border-radius:12px;background:#fff8fb;color:#5e3d56;padding:8px 13px;cursor:pointer;font-weight:700;touch-action:manipulation}
#${id} button:hover{background:#ffe9f2}
#${id} button:focus-visible,#${id} input:focus-visible{outline:3px solid #5b47b6;outline-offset:3px}
#${id} .sa-toggle{position:fixed;pointer-events:auto;min-width:70px;height:44px;box-shadow:0 2px 8px #6f3d5526;font-size:13px}
#${id}.sa-docked{position:relative;display:inline-block;width:auto;height:auto;vertical-align:middle;z-index:50}
#${id}.sa-docked .sa-toggle{position:static}
#${id} .sa-panel{position:fixed;pointer-events:auto;width:300px;max-width:calc(100vw - 16px);overflow:auto;overscroll-behavior:contain;border:2px solid #d5a0ba;border-radius:17px;padding:14px;background:#fff8fb;box-shadow:0 10px 32px #40223740;text-align:left}
#${id} .sa-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
#${id} h2{font-size:17px;line-height:1.4;margin:0}
#${id} .sa-close{font-size:13px;flex-shrink:0}
#${id} .sa-group{border:1px solid #e3c3d1;border-radius:12px;margin:10px 0;padding:9px 12px 10px;min-width:0}
#${id} legend{padding:0 4px;font-size:14px;font-weight:700;color:#64415a}
#${id} .sa-enabled{display:flex;align-items:center;gap:9px;min-height:44px;cursor:pointer;font-weight:600}
#${id} input[type=checkbox]{width:21px;height:21px;margin:0;accent-color:#9c4c78;flex-shrink:0}
#${id} .sa-volume-label{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px}
#${id} output{font-variant-numeric:tabular-nums;font-size:13px;color:#65425b}
#${id} input[type=range]{display:block;width:100%;min-width:0;height:44px;margin:0;accent-color:#9c4c78;cursor:pointer;touch-action:pan-y}
#${id} input:disabled{cursor:not-allowed;opacity:.5}
#${id} .sa-status{margin:10px 0 0;font-size:12px;color:#76556d;overflow-wrap:anywhere}
@media (max-height:420px){#${id} .sa-panel{padding:10px}#${id} .sa-group{margin:6px 0;padding:2px 10px 4px}#${id} .sa-head{margin-bottom:2px}#${id} .sa-status{margin-top:6px}}
`;
    const toggle = node('button', 'sa-toggle', '音設定');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', '音の設定を開く');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', id + '-panel');
    const panel = node('section', 'sa-panel');
    panel.id = id + '-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', id + '-title');
    const head = node('div', 'sa-head');
    const title = node('h2', '', '音の設定');
    title.id = id + '-title';
    const closeButton = node('button', 'sa-close', '閉じる');
    closeButton.type = 'button';
    head.append(title, closeButton);
    panel.append(head);
    const status = node('p', 'sa-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');

    function refresh() {
      if (destroyed || !visibleByHost) return;
      readSettings();
      const state = readStatus();
      const unavailable = state.available === false || state.supported === false || state.destroyed === true || state.state === 'destroyed' || state.state === 'closed';
      ['bgm', 'se'].forEach(function (key) {
        const c = controls[key];
        if (!c) return;
        c.checkbox.checked = settings[key + 'Enabled'];
        c.checkbox.disabled = unavailable;
        c.range.disabled = unavailable;
        const percent = Math.round(settings[key + 'Volume'] * 100);
        c.range.value = String(percent);
        c.range.setAttribute('aria-valuetext', percent + 'パーセント');
        c.output.textContent = percent + '%';
        c.enabledText.textContent = settings[key + 'Enabled'] ? '有効（ON）' : '無効（OFF）';
      });
      let message = 'BGMと効果音を個別に調整できます。';
      if (unavailable) message = 'この環境では音声を利用できません。音なしで遊べます。';
      else if (settingsError) message = '音の設定を読み取れませんでした。';
      else if (interactionError) message = interactionError;
      else if (state.audioError === 'resume-failed' || state.audioError === 'context-failed') message = '音声を開始できませんでした。もう一度、設定を操作してください。';
      else if (state.storageError || state.storageAvailable === false) message = '設定を保存できません。この画面を閉じても今回の設定は使えます。';
      else if (state.locked === true || state.unlocked === false) message = '音を出すには、BGMや効果音の設定を操作してください。';
      if (status.textContent !== message) status.textContent = message;
    }

    // This is called only by actual input listeners, never by construction,
    // rendering, resize, timers, focus changes, or the host's pause lifecycle.
    function unlock(event) {
      if (!event || event.isTrusted === false || !audio || typeof audio.unlock !== 'function') return;
      try {
        const pending = audio.unlock(event);
        if (pending && typeof pending.then === 'function') {
          pending.then(function () { if (!destroyed) refresh(); }, function () {
            if (destroyed) return;
            interactionError = '音声を開始できませんでした。もう一度、設定を操作してください。';
            refresh();
          });
        }
      } catch (_) {
        interactionError = '音声を開始できませんでした。もう一度、設定を操作してください。';
      }
    }
    function save(key, value, event) {
      if (destroyed || !audio || typeof audio.setSettings !== 'function') return;
      interactionError = '';
      unlock(event);
      try {
        const partial = {};
        partial[key] = value;
        const result = audio.setSettings(partial);
        if (result && result.ok === false) interactionError = '音の設定を変更できませんでした。';
        else settings[key] = value;
      } catch (_) { interactionError = '音の設定を変更できませんでした。'; }
      refresh();
    }
    function addGroup(key, label) {
      const group = node('fieldset', 'sa-group');
      group.append(node('legend', '', label));
      const enabled = node('label', 'sa-enabled');
      const checkbox = node('input');
      checkbox.type = 'checkbox';
      checkbox.id = id + '-' + key + '-enabled';
      checkbox.setAttribute('aria-label', label + 'を有効にする');
      const enabledText = node('span');
      enabled.append(checkbox, enabledText);
      const volumeLabel = node('label', 'sa-volume-label');
      const range = node('input');
      range.type = 'range';
      range.id = id + '-' + key + '-volume';
      range.min = '0'; range.max = '100'; range.step = '1';
      range.setAttribute('aria-label', label + 'の音量');
      volumeLabel.htmlFor = range.id;
      const output = node('output');
      output.setAttribute('for', range.id);
      output.setAttribute('aria-hidden', 'true');
      volumeLabel.append(node('span', '', '音量'), output);
      group.append(enabled, volumeLabel, range);
      panel.append(group);
      controls[key] = { checkbox: checkbox, range: range, output: output, enabledText: enabledText };
      listen(checkbox, 'change', function (event) { save(key + 'Enabled', checkbox.checked, event); });
      listen(range, 'input', function (event) { save(key + 'Volume', finiteVolume(Number(range.value) / 100, 0), event); });
    }
    addGroup('bgm', 'BGM（背景音楽）');
    addGroup('se', 'SE（効果音）');
    panel.append(status);
    host.append(style, toggle, panel);
    (triggerParent || doc.body).appendChild(host);

    function layout() {
      pendingLayout = 0;
      if (destroyed || !visibleByHost) return;
      const viewport = root.visualViewport;
      const vw = Math.max(1, viewport ? viewport.width : root.innerWidth || doc.documentElement.clientWidth || 320);
      const vh = Math.max(1, viewport ? viewport.height : root.innerHeight || doc.documentElement.clientHeight || 480);
      const vx = viewport ? viewport.offsetLeft : 0, vy = viewport ? viewport.offsetTop : 0;
      const rect = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      const visible = !rect || (rect.width > 0 && rect.height > 0 && rect.bottom > vy && rect.top < vy + vh && rect.right > vx && rect.left < vx + vw);
      toggle.hidden = !visible;
      if (!visible) { if (opened) close(false); return; }
      const margin = 8;
      const width = toggle.offsetWidth || 70, height = toggle.offsetHeight || 44;
      let x = Math.max(vx + margin, Math.min(rect ? rect.left + margin : vx + margin, vx + vw - width - margin));
      // Position above the canvas when possible, keeping all painted game HUD
      // controls unobstructed. At the very top of a page use a small inset.
      const preferredTop = rect ? (rect.top >= vy + height + margin ? rect.top - height - 4 : rect.top + margin) : vy + margin;
      let y = Math.max(vy + margin, Math.min(preferredTop, vy + vh - height - margin));
      if (triggerParent) {
        const buttonRect = toggle.getBoundingClientRect();
        x = buttonRect.left; y = buttonRect.top;
      } else {
        toggle.style.left = Math.round(x) + 'px';
        toggle.style.top = Math.round(y) + 'px';
      }
      if (!opened) return;
      const panelWidth = Math.max(1, Math.min(300, vw - margin * 2));
      panel.style.width = panelWidth + 'px';
      panel.style.maxHeight = Math.max(1, vh - margin * 2) + 'px';
      const panelHeight = panel.offsetHeight || 360;
      const px = Math.max(vx + margin, Math.min(x, vx + vw - panelWidth - margin));
      let py = y + height + 6;
      if (py + panelHeight > vy + vh - margin) py = Math.max(vy + margin, vy + vh - panelHeight - margin);
      panel.style.left = Math.round(px) + 'px';
      panel.style.top = Math.round(py) + 'px';
    }
    function scheduleLayout() {
      if (destroyed || pendingLayout) return;
      if (root.requestAnimationFrame) pendingLayout = root.requestAnimationFrame(layout);
      else layout();
    }
    function open() {
      if (destroyed || !visibleByHost || opened) return;
      previousFocus = doc.activeElement;
      opened = true;
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', '音の設定を閉じる');
      refresh();
      layout();
      if (typeof options.onOpen === 'function') options.onOpen();
      focus(closeButton);
    }
    function close(restoreFocus) {
      if (!opened) return;
      opened = false;
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '音の設定を開く');
      if (typeof options.onClose === 'function') options.onClose();
      if (restoreFocus !== false && !destroyed) focus(previousFocus && previousFocus.isConnected !== false ? previousFocus : toggle);
    }
    listen(toggle, 'click', function (event) {
      event.stopPropagation();
      interactionError = '';
      unlock(event);
      if (opened) close(); else open();
    });
    listen(closeButton, 'click', function (event) { event.stopPropagation(); close(); });
    listen(host, 'pointerdown', function (event) { event.stopPropagation(); unlock(event); });
    ['pointerup', 'pointermove', 'pointercancel', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend'].forEach(function (type) {
      listen(host, type, function (event) { event.stopPropagation(); });
    });
    listen(host, 'keydown', function (event) {
      event.stopPropagation();
      if (event.key === 'Escape' && opened) { event.preventDefault(); close(); return; }
      if (!event.repeat && event.key !== 'Tab') unlock(event);
    });
    listen(host, 'keyup', function (event) { event.stopPropagation(); });
    // A non-modal disclosure must not trap Tab. Leaving it closes the panel,
    // preserving the natural focus destination rather than pulling focus back.
    listen(host, 'focusout', function (event) {
      if (!opened) return;
      if (event.relatedTarget) { if (!host.contains(event.relatedTarget)) close(false); }
      else Promise.resolve().then(function () {
        if (!destroyed && opened && !host.contains(doc.activeElement)) close(false);
      });
    });
    listen(root, 'resize', scheduleLayout);
    listen(root, 'scroll', scheduleLayout, true);
    listen(root.visualViewport, 'resize', scheduleLayout);
    listen(root.visualViewport, 'scroll', scheduleLayout);
    if (root.ResizeObserver && canvas) {
      resizeObserver = new root.ResizeObserver(scheduleLayout);
      resizeObserver.observe(canvas);
    }
    refresh();
    layout();
    return {
      isOpen: function () { return !destroyed && opened; },
      setVisible: function (value) {
        const next = value !== false;
        if (destroyed || visibleByHost === next) return;
        visibleByHost = next;
        host.hidden = !next;
        if (!next) close(false);
        else layout();
      },
      destroy: function () {
        if (destroyed) return;
        // Destruction must not resume a game that its owner is tearing down.
        destroyed = true;
        opened = false;
        if (pendingLayout && root.cancelAnimationFrame) root.cancelAnimationFrame(pendingLayout);
        if (resizeObserver) resizeObserver.disconnect();
        listeners.forEach(function (remove) { remove(); });
        host.remove();
      }
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
