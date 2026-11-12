(function () {
  'use strict';
  const $ = id => document.getElementById(id), KEY = 'zatuplay-iraira-bo-v1';
  let game, canvas, ctx, storage, baseline = null, revision = 0, saving = Promise.resolve();
  let blocked = false, conflict = false, writeFailed = false, fatal = false, dirty = false, savedAt = 0;
  let pointer = null, lastPoint = null, lastTime = performance.now(), saveClock = 0, buttonsSignature = '';
  const keys = new Set(), heldPointers = new Map();
  let audio = null, audioReady = false, audioEpoch = 0;
  const oscillators = new Set();
  function status(text, warning = false) { $('save-status').textContent = text; $('save-status').dataset.warning = String(warning); }
  function stopAudio() {
    audioReady = false; audioEpoch++;
    for (const o of oscillators) { try { o.stop(); } catch (_) {} }
    oscillators.clear();
    if (audio) { try { Promise.resolve(audio.suspend()).catch(() => {}); } catch (_) {} }
  }
  function unlockAudio() {
    if (!game.state.sound) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) throw Error('音声非対応');
      audio ||= new C();
      const wanted = game.state.sound, epoch = audioEpoch;
      Promise.resolve(audio.resume()).then(() => { if (epoch === audioEpoch && wanted && game.state.sound && !document.hidden && !fatal) { audioReady = true; $('audio-status').textContent = ''; } }).catch(() => { $('audio-status').textContent = '効果音を再生できません。音ボタンで再試行できます。'; });
    } catch (_) { $('audio-status').textContent = 'この環境では効果音を再生できません。ゲームは続けられます。'; }
  }
  function beep(win) {
    if (!game.state.sound || !audioReady || !audio) return;
    try {
      const o = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(win ? 1200 : 300, t);
      if (win) o.frequency.setValueAtTime(1800, t + .08);
      gain.gain.setValueAtTime(.12,t); gain.gain.exponentialRampToValueAtTime(.001,t + .16);
      o.connect(gain); gain.connect(audio.destination); oscillators.add(o);
      o.onended = () => { oscillators.delete(o); o.disconnect(); gain.disconnect(); };
      o.start(t); o.stop(t + .16);
    } catch (_) { $('audio-status').textContent = '効果音を再生できません。ゲームは続けられます。'; }
  }
  function releaseInputs() {
    const id = pointer; pointer = null; lastPoint = null; keys.clear();
    try { if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); } catch (_) {}
    for (const [id, node] of heldPointers) { try { if (node.hasPointerCapture(id)) node.releasePointerCapture(id); } catch (_) {} }
    heldPointers.clear();
  }
  function markConflict() {
    conflict = true; blocked = true; game.pause(); releaseInputs(); stopAudio();
    status('別のタブで保存が変わりました。上書きを止めました。保存を読み直してから続けてください。', true);
    $('reload').hidden = false; $('retry-save').hidden = true; render();
  }
  function save() {
    if (blocked || fatal) return Promise.resolve(false);
    dirty = true;
    saving = saving.then(async () => {
      if (blocked || fatal) return false;
      const snapshot = game.snapshot();
      try {
        return await navigator.locks.request(KEY, () => {
          if (blocked || fatal) return false;
          if (storage.getItem(KEY) !== baseline) { markConflict(); return false; }
          NeonMaze.validateState(snapshot);
          const raw = JSON.stringify({version:1, revision:revision + 1, state:snapshot});
          storage.setItem(KEY,raw);
          // Detect read failures and unexpected concurrent writers; do not report success.
          if (storage.getItem(KEY) !== raw) { markConflict(); return false; }
          baseline = raw; revision++; writeFailed = false; dirty = false; savedAt = Date.now();
          $('retry-save').hidden = true;
          status('このブラウザに保存しました' + (snapshot.screen === 2 ? '（再読み込み後は停止状態で再開）' : ''));
          return true;
        });
      } catch (_) {
        writeFailed = true; $('retry-save').hidden = false;
        status('保存できませんでした。この回の進行はまだ画面にあります。保存を再試行してください。', true);
        return false;
      }
    });
    return saving;
  }
  function transition(oldScreen) {
    if (oldScreen === 2 && [4,5].includes(game.state.screen)) {
      releaseInputs(); beep(game.state.screen === 5);
      if (game.state.screen === 4) { try { navigator.vibrate?.(100); } catch (_) {} }
      save();
    }
  }
  function tick(now) {
    const delta = Math.max(0, now - lastTime); lastTime = now;
    if (game.state.screen !== 2 || conflict || fatal) return;
    const old = game.state.screen;
    game.tick(delta);
    if (game.state.screen === 2 && keys.size) {
      let dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      let dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
      const n = Math.hypot(dx,dy), speed = keys.has('Shift') ? 30 : 90;
      if (n) game.move(game.state.x + dx/n*speed*delta/1000,game.state.y + dy/n*speed*delta/1000);
    }
    transition(old); saveClock += delta;
    if (saveClock >= 1000 && game.state.screen === 2) { saveClock = 0; save(); }
  }
  function pause() {
    if (!game || fatal) return;
    tick(performance.now()); const wasPlaying = game.state.screen === 2;
    game.pause(); releaseInputs(); stopAudio();
    if (wasPlaying) save(); render();
  }
  function action(id) {
    if (conflict || fatal) return;
    tick(performance.now());
    if (id === 105) { pause(); return; }
    if (id === 107 && game.state.screen === 3 && !confirm('このステージの途中位置を捨て、最初からやり直しますか？')) return;
    releaseInputs();
    if (!game.action(id)) return;
    lastTime = performance.now(); saveClock = 0;
    if (game.state.sound) unlockAudio(); else stopAudio();
    save(); render();
  }
  const C = {cyan:'#27e5d2',white:'#eaf4ff',muted:'#92a6bc',gold:'#ffd166'};
  function text(s,x,y,size,color=C.white) { ctx.fillStyle=color;ctx.font=`${size}px sans-serif`;ctx.textAlign='center';ctx.fillText(s,x,y); }
  function line(points,color,width) { ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(); }
  function circle(x,y,r,color) { ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill(); }
  function box(x,y,w,h,color) { ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,16);ctx.fill(); }
  let specs = [];
  function button(label,x,y,w,h,id,enabled=true) { specs.push({label,x,y,w,h,id,enabled:enabled&&!conflict&&!fatal}); }
  function render() {
    if (!ctx || fatal) return;
    const s = game.state; specs = [];
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,360,800);ctx.fillStyle='#070f1d';ctx.fillRect(0,0,360,800);
    ctx.strokeStyle='#0f1d2e';ctx.lineWidth=1;ctx.beginPath();
    for(let x=0;x<360;x+=24){ctx.moveTo(x,0);ctx.lineTo(x,800);}for(let y=0;y<800;y+=24){ctx.moveTo(0,y);ctx.lineTo(360,y);}ctx.stroke();
    if (s.screen===0) {
      text('NEON MAZE',180,105,16,C.cyan);text('イライラ棒',180,166,43);text('壁にふれず、光の道を進め。',180,205,16,C.muted);
      line([{x:82,y:360},{x:82,y:280},{x:180,y:280},{x:180,y:386},{x:280,y:386},{x:280,y:270}],C.cyan,26);circle(180,332,10,C.gold);
      button('冒険をはじめる',40,445,280,60,100);button('効果音 '+(s.sound?'ON':'OFF'),40,520,280,52,101);
      text('棒の近くをタッチして、指をスライド',180,617,15);text('動かした分だけ棒が移動するよ',180,644,14,C.muted);
      text('30ステージ ・ ブラウザ版 ・ 広告なし',180,724,13,C.cyan);
    } else if (s.screen===1) {
      text('ステージセレクト',180,72,27);text('クリアすると次の道が開く',180,104,15,C.muted);
      for(let i=0;i<10;i++){
        const n=s.page*10+i,x=i%2*155+30,y=Math.floor(i/2)*103+142,unlocked=n<s.unlocked;
        button((unlocked?'STAGE ':'LOCK ')+(n+1),x,y,145,64,200+n,unlocked);
        text(s.best[n]===null?'—':`BEST ${(s.best[n]/1000).toFixed(2)} s`,x+72.5,y+86,12,C.muted);
      }
      button('◀',30,680,60,48,102,s.page>0);text(`${s.page+1} / 3`,180,711,18);button('▶',270,680,60,48,103,s.page<2);button('タイトルへ',80,745,200,40,104);
    } else {
      text(`STAGE ${s.level+1}`,90,47,21);button('一時停止',220,18,120,44,105,s.screen===2);
      const remaining=Math.max(0,game.course.limit-s.elapsed/1000);
      text(`残り ${remaining.toFixed(1)} 秒`,180,101,23,remaining<10?C.gold:C.cyan);
      line(game.course.line,C.cyan,game.course.width+5);line(game.course.line,'#112636',game.course.width);
      const goal=game.course.line[220];circle(goal.x,goal.y,15,C.cyan);text('G',goal.x,goal.y+5,14,'#000');text('GOAL',goal.x,goal.y-40,12,C.cyan);
      ctx.shadowColor=C.gold;ctx.shadowBlur=14;circle(s.x,s.y,8,C.gold);ctx.shadowBlur=0;circle(s.x,s.y,3,C.white);
      text(pointer===null?'棒の近くをタッチして動かそう':'慎重に、その調子！',180,738,15);
      text('指を離すと棒が停止 ・ 壁に触れたら失敗',180,766,12,C.muted);
      if (s.screen>=3) {
        box(12,210,336,370,'#0a1627');
        if (s.screen===3) {text('ひとやすみ',180,269,31);text('タイマーも止まっているよ',180,309,15,C.muted);button('つづける',45,342,270,54,106);}
        if (s.screen===4) {text(s.reason,180,275,29,C.gold);text('落ち着いて、もう一回！',180,316,16,C.muted);button('リトライ',45,350,270,54,107);}
        if (s.screen===5) {
          text(s.level===29?'全ステージ制覇！':'CLEAR!',180,269,31,C.cyan);text(`タイム ${(s.elapsed/1000).toFixed(2)} 秒`,180,310,22);
          text(s.level===29?'あなたこそ、ネオン迷路の達人！':'次のステージが開いた！',180,342,15,C.gold);
          button(s.level===29?'ステージを選ぶ':'次のステージ',45,370,270,54,108);
        }
        if(s.screen!==5)button('最初から',45,420,270,48,107);
        button('ステージ選択',45,490,270,48,109);
      }
    }
    const sig=JSON.stringify(specs);
    if(sig!==buttonsSignature){
      const active=document.activeElement?.dataset?.action;buttonsSignature=sig;$('buttons').replaceChildren();
      for(const b of specs){const el=document.createElement('button');el.type='button';el.textContent=b.label;el.dataset.action=String(b.id);el.disabled=!b.enabled;el.style.cssText=`left:${b.x/3.6}%;top:${b.y/8}%;width:${b.w/3.6}%;height:${b.h/8}%;`;el.addEventListener('click',()=>action(b.id));$('buttons').append(el);}
      if(active)$('buttons').querySelector(`[data-action="${active}"]:not(:disabled)`)?.focus({preventScroll:true});
      $('game-status').textContent=s.screen===0?'イライラ棒。30ステージ。':s.screen===1?`ステージ選択。${s.unlocked}面まで解放。${s.best.filter(b=>b!==null).length}/30クリア。`:`ステージ${s.level+1}。${['','','プレイ中','一時停止中',s.reason,s.level===29?'全ステージ制覇':'クリア'][s.screen]}`;
    }
    $('pause').disabled=s.screen!==2||conflict;$('sound').disabled=conflict;$('sound').textContent='効果音 '+(s.sound?'ON':'OFF');
    for(const b of document.querySelectorAll('[data-direction]'))b.disabled=s.screen!==2||conflict;
  }
  function fatalError() { fatal=true; if(game)game.pause(); releaseInputs();stopAudio();$('load-error').hidden=false;$('load-error').textContent='ゲームの読み込み・描画で問題が起きました。保存は上書きせず停止しています。通信を確認して再読み込みしてください。'; }
  try {
    if(!globalThis.NeonMaze)throw Error('model missing');
    canvas=$('game');ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas unavailable');
    let saved;
    try {
      storage=localStorage;baseline=storage.getItem(KEY);
      if(baseline!==null){const data=NeonMaze.decode(baseline);saved=data.state;revision=data.revision;}
      if(!navigator.locks?.request){blocked=true;status('この環境は安全な保存に対応していません。この回は保存せず遊びます。',true);}
      else status(saved?'保存を読み込みました。途中のプレイは「つづける」で再開します。':'まだ保存はありません。開始後に自動保存します。');
    } catch(_){blocked=true;status('保存を読み込めませんでした。元の保存は上書きせず、この回だけ保存なしで遊びます。',true);$('reload').hidden=false;}
    game=new NeonMaze.Game(saved);
    $('game-frame').hidden=false;$('load-error').hidden=true;
    const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*800/r.height};};
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||pointer!==null||game.state.screen!==2||conflict||fatal)return;
      e.preventDefault();tick(performance.now());if(game.state.screen!==2)return;
      const p=point(e);if(Math.hypot(p.x-game.state.x,p.y-game.state.y)>=65)return;
      unlockAudio();pointer=e.pointerId;lastPoint=p;canvas.setPointerCapture(pointer);canvas.focus({preventScroll:true});render();
    });
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==pointer||!lastPoint||game.state.screen!==2||conflict||fatal)return;
      e.preventDefault();tick(performance.now());if(game.state.screen!==2)return;
      const p=point(e),old=game.state.screen;game.drag(p.x-lastPoint.x,p.y-lastPoint.y);lastPoint=p;transition(old);render();
    });
    canvas.addEventListener('pointerup',e=>{if(e.pointerId!==pointer)return;releaseInputs();save();render();});
    canvas.addEventListener('pointercancel',e=>{if(e.pointerId===pointer)pause();});
    canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointer)pause();});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    const keyName=e=>({w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight'}[e.key.toLowerCase()]||e.key);
    window.addEventListener('keydown',e=>{
      if(e.isComposing||e.ctrlKey||e.altKey||e.metaKey)return;
      if((e.key==='Escape'||e.key===' ')&&game.state.screen===2){e.preventDefault();pause();return;}
      const k=keyName(e);if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift'].includes(k)||game.state.screen!==2||conflict||fatal)return;
      e.preventDefault();tick(performance.now());keys.add(k);unlockAudio();
    });
    window.addEventListener('keyup',e=>{const k=keyName(e);if(keys.has(k)){tick(performance.now());keys.delete(k);save();}});
    for(const b of document.querySelectorAll('[data-direction]')){
      b.addEventListener('pointerdown',e=>{if(b.disabled||e.button!==0||conflict||fatal)return;e.preventDefault();tick(performance.now());heldPointers.set(e.pointerId,b);b.setPointerCapture(e.pointerId);keys.add(b.dataset.direction);unlockAudio();});
      const up=e=>{if(heldPointers.get(e.pointerId)!==b)return;tick(performance.now());keys.delete(b.dataset.direction);heldPointers.delete(e.pointerId);try{b.releasePointerCapture(e.pointerId);}catch(_){}save();};
      b.addEventListener('pointerup',up);b.addEventListener('pointercancel',()=>pause());b.addEventListener('lostpointercapture',e=>{if(heldPointers.has(e.pointerId))pause();});
      // The same direction buttons can be activated with Enter/Space for small steps.
      b.addEventListener('click',e=>{if(e.detail!==0||b.disabled||conflict||fatal)return;const [dx,dy]={ArrowUp:[0,-2],ArrowDown:[0,2],ArrowLeft:[-2,0],ArrowRight:[2,0]}[b.dataset.direction];tick(performance.now());const old=game.state.screen;game.move(game.state.x+dx,game.state.y+dy);transition(old);save();render();});
    }
    $('pause').addEventListener('click',pause);$('sound').addEventListener('click',()=>action(101));
    $('help-button').addEventListener('click',()=>{const open=$('help').hidden;if(open)pause();$('help').hidden=!open;$('help-button').setAttribute('aria-expanded',String(open));});
    $('retry-save').addEventListener('click',()=>save());
    $('reload').addEventListener('click',()=>{if(confirm('この回の未保存の変更を破棄し、保存を読み直しますか？'))location.reload();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    window.addEventListener('blur',pause);window.addEventListener('pagehide',pause);
    window.addEventListener('pageshow',()=>{lastTime=performance.now();});
    window.addEventListener('storage',e=>{if(e.storageArea&&e.storageArea!==storage)return;if(e.key!==KEY&&e.key!==null)return;if(e.key===null||e.newValue!==baseline)markConflict();});
    window.addEventListener('error',fatalError);
    render();
    function frame(now){if(fatal)return;try{tick(now);render();requestAnimationFrame(frame);}catch(_){fatalError();}}
    requestAnimationFrame(frame);
  } catch(_) {fatalError();}
})();
