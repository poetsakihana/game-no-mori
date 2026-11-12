/*:
 * @plugindesc 2003のイベント盤面55面を遊ぶための移植試作版。原作全編の完全変換ではありません。
 * @author OpenAI
 * @help Original APK plugin: original/PicrossPort.js. Browser adapter 0.1.0-web.1.
 * 正解・座標・採点・クリア履歴は元のAPKと同じ。MVの空シーンではなく同じDOM画面を直接起動します。
 */
(function () {
  'use strict';
  var root, selected = null, mode = 1, state, history = [], timer = null;
  var paused = false, armedCell = null, completedCell = null, focusedCell = 0, lastFocus = null;
  var store = PicrossStorage.load();
  function el(id) { return document.getElementById(id); }
  function save() { return PicrossStorage.save(store); }
  function hints(a) {
    var result = [], n = 0;
    a.forEach(function (v) { if (v) n++; else if (n) { result.push(n); n = 0; } });
    if (n) result.push(n);
    return result.length ? result : [0];
  }
  function banner() {
    return '<header><div><span class="eyebrow">PICROSS / RPG MAKER MV</span><h1>ピクロス大図鑑</h1><span class="muted">PicrossMV ブラウザ版 · 元APKの55面を収録</span></div><nav class="browser-links" aria-label="サイト"><a href="../../browser/">← ZatuPlay 一覧</a><span class="muted">0.1.0-web.1</span></nav></header>' +
      '<div id="storage-status" class="storage-note" role="status" aria-live="polite"></div>';
  }
  var storageText = '', storageKind = '';
  var leaving = false;
  function wireListLink() {
    var link = root.querySelector('header a');
    link.onclick = function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;
      e.preventDefault(); if (leaving) return; leaving = true;
      pause(); save();
      PicrossStorage.whenIdle().then(function (ok) {
        if (ok || confirm('保存できていない進行があります。保存せずにZatuPlay一覧へ戻りますか？')) window.location.assign(link.href);
        leaving = false;
      });
    };
  }
  function paintStorage() {
    var status = el('storage-status');
    if (status) { status.textContent = storageText; status.dataset.kind = storageKind; }
  }
  PicrossStorage.subscribe(function (text, kind) { storageText = text; storageKind = kind; paintStorage(); });
  function clearInput() { armedCell = null; completedCell = null; }
  function menu() {
    if (selected) save();
    selected = null; paused = false; clearInput(); clearInterval(timer); timer = null;
    root.innerHTML = banner() + '<main class="wrap"><section class="panel hero"><div><h2>ひとマスずつ、絵を見つけよう。</h2><p class="muted">縦と横の数字を頼りにマスを塗りましょう。<br>数字は連続する黒マスの数。数字の間には空白が1マス以上入ります。</p><p class="note muted">元APK自体が、2003原作の113マップから55盤面を抽出した部分移植・試作版です。<br>後半の画像式問題・会話・解放条件・音声は元APKにも未収録です。原作全編や500問を収録したものではありません。</p></div><div><span class="big">' + Object.keys(store.cleared).length + ' / 55</span><p class="muted">クリアした盤面</p><button id="about">移植状況・操作方法</button></div></section><div class="toolbar"><label>盤面サイズ <select id="filter"><option value="all">すべて</option><option value="small">5〜10マス</option><option value="large">12〜35マス</option></select></label><span class="muted">同じ絵柄の別マップも原作どおり収録</span></div><div class="levels" id="levels"></div></main>' +
      '<p class="browser-note">途中の盤面・時間・クリア記録をこのブラウザ内に保存します。APKや別端末とは同期しません。同じ作品は1タブで遊んでください。サイトデータ削除で記録が失われます。初回・再読込には通信が必要です。元APKに音声はありません。</p>';
    function levels() {
      el('levels').innerHTML = '';
      PICROSS_DATA.forEach(function (q, i) {
        if (el('filter').value === 'small' && q.width > 10 || el('filter').value === 'large' && q.width <= 10) return;
        var b = document.createElement('button');
        b.className = 'level' + (store.cleared[q.id] ? ' done' : ''); b.dataset.boardId = q.id;
        b.innerHTML = '<span class="muted">BOARD ' + String(i + 1).padStart(2, '0') + '</span><strong>' + q.width + ' × ' + q.height + '</strong><span class="muted">原作 Map' + String(q.id).padStart(4, '0') + (store.cleared[q.id] ? '　✓ クリア' : store.boards[q.id] ? '　続きから' : '') + '</span>';
        b.onclick = function () { open(q); }; el('levels').appendChild(b);
      });
    }
    el('filter').onchange = levels; levels(); paintStorage(); wireListLink();
    el('about').onclick = function () {
      show('操作と移植状況', 'マスをタップして塗ります。「× 印」で空白の目印を付けます。右クリックも×印です。塗ったマスを再度押すと消えます。正解と一致したらクリアです。矢印キーでマスを移動し、Enter / Spaceで入力できます。\n\n途中の盤面・時間・クリア履歴はこのブラウザに自動保存します。やり直すと現在の盤面と時間のみを消し、クリア履歴は残ります。一手戻すの履歴は盤面を開き直すと消えます。\n\n大きい盤面は拡大・縮小し、縦横にスクロールできます。画面から離れた時やEscで一時停止し、戻った後は「再開する」で再開します。停止中は時間を加算しません。\n\n元APK自体が55面を再構築した部分移植・試作版です。原作113マップの全編・500問・後半の画像式問題・会話・解放条件・BGMや効果音は収録していません。元の2003用セーブやAPKの保存は引き継げません。');
    };
  }
  function show(title, msg) {
    var d = document.createElement('dialog'), h = document.createElement('h2'), p = document.createElement('p'), b = document.createElement('button');
    h.textContent = title; p.textContent = msg; p.style.whiteSpace = 'pre-line'; b.textContent = '閉じる';
    function close() { d.close(); d.remove(); el('about').focus(); }
    b.onclick = close; d.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    d.append(h, p, b); root.appendChild(d); d.showModal(); b.focus();
  }
  function pause() {
    clearInput();
    if (!selected || paused || state.finished) return;
    paused = true; lastFocus = document.activeElement; save();
    el('pause-overlay').hidden = false; el('play-area').inert = true;
    el('resume').focus();
  }
  function resume() {
    if (!selected || document.hidden) return;
    paused = false; clearInput(); el('pause-overlay').hidden = true; el('play-area').inert = false;
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({preventScroll: true});
  }
  function open(q) {
    clearInterval(timer); clearInput(); selected = q; mode = 1; history = []; paused = false; focusedCell = 0;
    state = store.boards[q.id];
    if (!state) state = {cells: Array(q.width * q.height).fill(0), seconds: 0, finished: false};
    store.boards[q.id] = state;
    root.innerHTML = banner() + '<main class="wrap" id="play-area"><div class="toolbar"><button id="menu">← 盤面一覧</button><strong>' + q.name + '　' + q.width + ' × ' + q.height + '</strong><span class="stats" id="stats"></span></div><div class="toolbar"><button id="fill" class="active" aria-pressed="true">■ 塗る</button><button id="cross" aria-pressed="false">× 印</button><button id="undo">一手戻す</button><button id="restart">やり直す</button><button id="zoomout">縮小 −</button><button id="zoomin">拡大 ＋</button><button id="pause">一時停止</button></div><p id="notice" role="status" aria-live="polite"></p><div class="boardwrap" tabindex="0" aria-label="盤面。大きい盤面は縦横にスクロールできます"><table id="board" aria-label="ピクロス盤面"></table></div><p class="muted">数字同士の間には、必ず1マス以上の空白が入ります。進行はこのブラウザに自動保存。矢印キーで移動、Enter / Spaceで入力。大きい盤面は拡大・スクロールできます。</p></main><div id="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" hidden><section class="panel"><h2 id="pause-title">一時停止中</h2><p>盤面をそのまま保持しています。停止中の時間は加算しません。</p><button id="resume" class="primary">再開する</button><button id="pause-menu">盤面一覧へ</button></section></div>';
    el('menu').onclick = menu; el('pause-menu').onclick = menu; el('pause').onclick = pause; el('resume').onclick = resume;
    function setMode(next) {
      if (paused) return; mode = next;
      el('fill').classList.toggle('active', mode === 1); el('cross').classList.toggle('active', mode === 2);
      el('fill').setAttribute('aria-pressed', String(mode === 1)); el('cross').setAttribute('aria-pressed', String(mode === 2));
    }
    el('fill').onclick = function () { setMode(1); }; el('cross').onclick = function () { setMode(2); };
    el('undo').onclick = function () {
      if (paused || !history.length) return;
      var h = history.pop(); state.cells[h[0]] = h[1]; state.finished = false; save(); render();
    };
    el('restart').onclick = function () {
      if (paused) return;
      if (confirm('この盤面の途中経過を消して、初めから遊びますか？ クリア履歴は残ります。')) {
        state.cells.fill(0); state.seconds = 0; state.finished = false; history = []; clearInput(); save(); render();
      }
    };
    var zoom = q.width > 20 ? 24 : 32;
    function z() { document.documentElement.style.setProperty('--cell', zoom + 'px'); }
    el('zoomout').onclick = function () { zoom = Math.max(20, zoom - 4); z(); };
    el('zoomin').onclick = function () { zoom = Math.min(52, zoom + 4); z(); };
    z(); render(); paintStorage(); wireListLink(); el('menu').focus();
    timer = setInterval(function () {
      if (paused || document.hidden || !selected || state.finished) return;
      if (state.seconds < Number.MAX_SAFE_INTEGER) state.seconds++;
      stats(); if (state.seconds % 5 === 0) save();
    }, 1000);
    if (document.hidden) pause();
  }
  function stats() {
    var total = selected.grid.flat().reduce(function (a, b) { return a + b; }, 0), filled = state.cells.filter(function (x) { return x === 1; }).length;
    el('stats').textContent = String(Math.floor(state.seconds / 60)).padStart(2, '0') + ':' + String(state.seconds % 60).padStart(2, '0') + '　塗り ' + filled + ' / ' + total;
  }
  function render() {
    var q = selected, b = el('board'), active = document.activeElement;
    var restore = active && active.dataset && active.dataset.index !== undefined ? Number(active.dataset.index) : null;
    b.innerHTML = '';
    var tr = document.createElement('tr'); tr.appendChild(document.createElement('th'));
    for (var x = 0; x < q.width; x++) {
      var th = document.createElement('th'); th.className = 'col'; th.scope = 'col';
      th.textContent = hints(q.grid.map(function (row) { return row[x]; })).join('\n'); tr.appendChild(th);
    }
    b.appendChild(tr);
    q.grid.forEach(function (row, y) {
      var r = document.createElement('tr'); if ((y + 1) % 5 === 0) r.className = 'fifth';
      var h = document.createElement('th'); h.className = 'row'; h.scope = 'row'; h.textContent = hints(row).join(' '); r.appendChild(h);
      row.forEach(function (_, x) {
        var i = y * q.width + x, t = document.createElement('td'); t.dataset.index = i;
        t.className = (state.cells[i] === 1 ? 'filled' : state.cells[i] === 2 ? 'mark' : '') + ((x + 1) % 5 === 0 ? ' fifth' : '');
        t.textContent = state.cells[i] === 2 ? '×' : ''; t.tabIndex = i === focusedCell ? 0 : -1;
        t.setAttribute('role', 'button'); t.setAttribute('aria-pressed', String(state.cells[i] === 1));
        t.setAttribute('aria-label', (y + 1) + '行 ' + (x + 1) + '列 ' + (state.cells[i] === 1 ? '塗り' : state.cells[i] === 2 ? '×' : '空白'));
        t.onpointerdown = function (e) { clearInput(); if (!paused && !document.hidden && e.isPrimary !== false) armedCell = i; };
        t.onpointerup = function () { completedCell = armedCell === i ? i : null; armedCell = null; };
        t.onclick = function (e) { if (e.detail > 0 && completedCell !== i) return; clearInput(); tap(i, mode); };
        t.oncontextmenu = function (e) { e.preventDefault(); clearInput(); tap(i, 2); };
        t.onfocus = function () {
          var old = b.querySelector('td[tabindex="0"]'); if (old) old.tabIndex = -1;
          focusedCell = i; t.tabIndex = 0;
        };
        t.onkeydown = function (e) {
          if (paused || document.hidden || e.repeat) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(i, mode); return; }
          var next = i;
          if (e.key === 'ArrowLeft') next = Math.max(y * q.width, i - 1);
          else if (e.key === 'ArrowRight') next = Math.min((y + 1) * q.width - 1, i + 1);
          else if (e.key === 'ArrowUp') next = Math.max(x, i - q.width);
          else if (e.key === 'ArrowDown') next = Math.min((q.height - 1) * q.width + x, i + q.width);
          else return;
          e.preventDefault(); b.querySelector('[data-index="' + next + '"]').focus();
        };
        r.appendChild(t);
      }); b.appendChild(r);
    });
    stats(); el('undo').disabled = history.length === 0;
    el('notice').textContent = state.finished ? '✓ クリア！　盤面一覧から次の問題へ進めます。' : '';
    if (restore !== null) b.querySelector('[data-index="' + restore + '"]').focus({preventScroll: true});
  }
  function tap(i, m) {
    if (paused || document.hidden || state.finished) return;
    history.push([i, state.cells[i]]); state.cells[i] = state.cells[i] === m ? 0 : m;
    var answer = selected.grid.flat();
    if (answer.every(function (v, k) { return (state.cells[k] === 1 ? 1 : 0) === v; })) {
      state.finished = true; store.cleared[selected.id] = true;
    }
    save(); var box = root.querySelector('.boardwrap'), sx = box.scrollLeft, sy = box.scrollTop;
    render(); box.scrollLeft = sx; box.scrollTop = sy;
  }
  root = document.createElement('div'); root.id = 'port'; document.body.appendChild(root); menu();
  window.addEventListener('beforeunload', function (e) {
    if (PicrossStorage.isPending()) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('blur', pause);
  window.addEventListener('pagehide', function () { pause(); save(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { pause(); save(); } });
  window.addEventListener('pointercancel', clearInput);
  // Touch releases implicit capture after pointerup, before the legitimate click.
  window.addEventListener('lostpointercapture', function () { armedCell = null; });
  document.addEventListener('keydown', function (e) {
    if (!selected) return;
    if (e.key === 'Escape') { e.preventDefault(); pause(); }
    if (paused && e.key === 'Tab') {
      e.preventDefault(); (document.activeElement === el('resume') ? el('pause-menu') : el('resume')).focus();
    }
  });
})();
