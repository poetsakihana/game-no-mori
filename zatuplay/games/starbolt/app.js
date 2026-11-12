import {Game,FixedClock,NAMES,AREAS,COLORS,WEAPONS,ENDING} from './core.js?v=1.0-web.1';
import {draw} from './render.js?v=1.0-web.1';
import {SaveStore,STORAGE_KEY,MAX_BYTES,exportBackup,importBackup} from './storage.js?v=1.0-web.1';
const $=id=>document.getElementById(id);
const canvas=$('c'),ctx=canvas.getContext('2d'),settings=$('settings');
let game,clock,importGeneration=0,audio=null,audioFailed=false,sound=true;
const heldKeys=new Set(),pointers=new Map(),physicalKeys=new Set();
const labels={loading:'保存領域を確認中…',ready:'撃破記録と音設定：このブラウザに自動保存します。途中のステージは保存されません。',saving:'撃破記録と音設定を保存中…', 'memory-no-lock':'一時プレイ：安全な保存ロックが使えないため、このページ内だけの記録です。バックアップを利用してください。','memory-corrupt':'一時プレイ：保存記録の形式が不正です。元データは変更せず保護しています。バックアップを利用してください。','memory-denied':'一時プレイ：保存へのアクセスが拒否されました。このページ内だけの記録です。','memory-full':'一時プレイ：保存領域が不足しています。既存の記録は残しています。バックアップを利用してください。',conflict:'一時プレイ：別のタブで記録が変わりました。上書きを止めています。必要ならバックアップして再読み込みしてください。'};
const store=new SaveStore({storage:{getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)},locks:navigator.locks,onStatus:status=>{
  $('save-status').textContent=labels[status]||labels['memory-denied'];
  if(status==='ready')$('notice').textContent='';
  if(game&&status==='conflict') interrupt();
}});
const saved=store.open(); sound=saved.sound;
function audioStatus(message) { $('audio-status').textContent=message; }
function unlockAudio() {
  if(!sound||audioFailed) return;
  try {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio) throw new Error('unsupported');
    if(!audio) audio=new Audio();
    Promise.resolve(audio.resume()).catch(()=>{audioFailed=true;audioStatus('音を開始できませんでした。ゲームは音なしで続けられます。音をONにし直すと再試行します。');});
  } catch { audioFailed=true; audioStatus('この環境では音を開始できません。ゲームは音なしで続けられます。'); }
}
function beep(f=440,d=.06) {
  if(!sound||!audio||audioFailed||audio.state!=='running') return;
  try {
    const o=audio.createOscillator(),gain=audio.createGain(); o.type='square'; o.frequency.value=f; gain.gain.value=.025;
    o.connect(gain); gain.connect(audio.destination); o.onended=()=>{o.disconnect();gain.disconnect();}; o.start(); o.stop(audio.currentTime+d);
  } catch { audioFailed=true; audioStatus('効果音を再生できませんでした。ゲームは続けられます。'); }
}
function persist() { return store.setData({cleared:game.cleared,sound}); }
function renderMenu() {
  $('grid').replaceChildren(...NAMES.map((name,i)=>{
    const b=document.createElement('button'); b.style.borderColor=COLORS[i]; b.dataset.stage=String(i);
    const title=document.createElement('span'); title.textContent=(game.cleared.includes(i)?'✓ ':'')+name;
    const area=document.createElement('small'); area.textContent=AREAS[i]; b.append(title,area);
    b.addEventListener('click',()=>{unlockAudio();clearInput();game.start(i);clock.reset();focusGame();}); return b;
  })); $('clear-count').textContent=`撃破済み：${game.cleared.length} / 8　すべての要塞を最初から選べます`;
}
function updateUI() {
  const playing=game.mode==='play'||game.mode==='pause';
  $('menu').hidden=game.mode!=='select'; $('msg').hidden=game.mode!=='result';
  $('pause').textContent=game.mode==='pause'?'再開':'一時停止';
  $('pause').disabled=!playing; $('weapon').disabled=!playing; $('select').disabled=game.mode==='select';
  $('weapon').textContent='武器：'+WEAPONS[game.weapon];
  for(const b of document.querySelectorAll('[data-key]')) b.disabled=game.mode!=='play';
  $('sound').textContent='音：'+(sound?'ON':'OFF'); $('sound').setAttribute('aria-pressed',String(sound));
  $('game-status').textContent=game.mode==='select'?'ステージを選んでください':`${AREAS[game.stage]} · ${game.mode==='pause'?'一時停止中':game.mode==='result'?'挑戦終了':`HP ${Math.max(0,game.player.hp)} / 28`}${game.checkpoint?' · ボス前チェックポイント（この挑戦中のみ）':''}`;
  if(game.mode==='select') renderMenu();
  if(game.mode==='result') {
    $('result-title').textContent=game.win?(game.cleared.length===8?'全8ボス撃破！':'STAGE CLEAR'):'もう一度、挑戦！';
    $('result-text').textContent=game.win?`${NAMES[game.stage]}を撃破！\n${WEAPONS[game.stage+1]}を獲得`:`${game.checkpoint?'ボス前':'スタート'}から再開できます`;
    $('ending').textContent=game.win&&game.cleared.length===8?ENDING:''; $('retry').hidden=game.win;
  }
}
game=new Game({cleared:saved.cleared,beep,change:type=>{if(type!=='weapon'){clearPhysicalInput();if(clock)clock.reset();}if(type==='win')void persist();updateUI();}});
clock=new FixedClock(game);
function clearPhysicalInput() {
  physicalKeys.clear();heldKeys.clear();
  for(const [id,b] of pointers) { try {if(b.hasPointerCapture?.(id)) b.releasePointerCapture(id);} catch {} }
  pointers.clear(); for(const b of document.querySelectorAll('[data-key]')) b.dataset.held='false';
}
function clearInput() { clearPhysicalInput();game.clearInput(); }
function interrupt() { clearInput();game.pause();clock.reset(); }
function focusGame() { canvas.focus({preventScroll:true}); }
function refreshHeld() {
  const keys={}; for(const action of heldKeys) keys[action]=true; for(const b of pointers.values()) keys[b.dataset.key]=true;
  game.keys=keys; for(const b of document.querySelectorAll('[data-key]')) b.dataset.held=String(!!keys[b.dataset.key]);
}
const keymap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',KeyZ:'fire'};
// Track physical keys separately so releasing A does not release a held Left arrow.
function clearAllPhysical() { clearPhysicalInput(); }
// All lifecycle paths dispatch this event before a later key repeat can be accepted.
window.addEventListener('keydown',e=>{
  if(settings.open||document.hidden||e.ctrlKey||e.altKey||e.metaKey||e.isComposing) return;
  if(e.target instanceof Element&&e.target.closest('button,input,summary,a,select,textarea')) return;
  const action=keymap[e.code];
  if(action) {
    if(game.mode!=='play') return; e.preventDefault();
    if(e.repeat&&!physicalKeys.has(e.code)) return;
    unlockAudio();physicalKeys.add(e.code);heldKeys.clear();for(const code of physicalKeys) heldKeys.add(keymap[code]);refreshHeld();
  } else if(!e.repeat&&e.code==='KeyX') { e.preventDefault();unlockAudio();game.cycle(); }
  else if(!e.repeat&&e.code==='KeyP') { e.preventDefault();togglePause(); }
});
window.addEventListener('keyup',e=>{if(keymap[e.code]){physicalKeys.delete(e.code);heldKeys.clear();for(const code of physicalKeys) heldKeys.add(keymap[code]);refreshHeld();}});
for(const b of document.querySelectorAll('[data-key]')) {
  b.addEventListener('pointerdown',e=>{
    if(game.mode!=='play'||settings.open||document.hidden||e.button!==0) return;
    e.preventDefault();unlockAudio();focusGame();
    try { b.setPointerCapture(e.pointerId); } catch { return; }
    pointers.set(e.pointerId,b);refreshHeld();
  });
  const release=e=>{pointers.delete(e.pointerId);refreshHeld();};
  b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
  b.addEventListener('contextmenu',e=>e.preventDefault());
}
function togglePause() { clearAllPhysical();clearInput();clock.reset();if(game.mode==='pause'&&!document.hidden&&!settings.open){unlockAudio();game.resume();focusGame();}else game.pause(); }
$('pause').addEventListener('click',togglePause);
$('weapon').addEventListener('click',()=>{unlockAudio();game.cycle();focusGame();});
function selectMenu() {
  const inRun=game.mode==='play'||game.mode==='pause';interrupt();clearAllPhysical();
  if(inRun&&!window.confirm('ステージ選択へ戻りますか？ この挑戦の途中状態・ボス前チェックポイントは失われます。撃破記録は残ります。')) return;
  game.checkpoint=false;game.select();
}
$('select').addEventListener('click',selectMenu);$('result-select').addEventListener('click',selectMenu);
$('retry').addEventListener('click',()=>{if(game.mode!=='result'||game.win)return;unlockAudio();clearAllPhysical();game.start(game.stage,true);focusGame();});
const lifecycle=()=>{cancelImport();clearAllPhysical();interrupt();};
window.addEventListener('blur',lifecycle);window.addEventListener('pagehide',()=>{cancelImport();lifecycle();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)lifecycle();});
window.addEventListener('pageshow',()=>{clock.reset();clearAllPhysical();clearInput();});
window.addEventListener('storage',e=>store.checkExternal(e.key));
function cancelImport() { importGeneration++;$('import-file').value='';$('cancel-import').hidden=true;$('import-status').textContent=''; }
$('records').addEventListener('click',()=>{lifecycle();cancelImport();settings.showModal();});
function closeSettings() {cancelImport();settings.close();clearAllPhysical();clearInput();clock.reset();if(game.mode==='pause')focusGame();}
$('close-settings').addEventListener('click',closeSettings);
settings.addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
settings.addEventListener('close',()=>{cancelImport();clearAllPhysical();clearInput();clock.reset();});
$('sound').addEventListener('click',()=>{sound=!sound;if(sound){audioFailed=false;audioStatus('');unlockAudio();}else{audioStatus('');try{Promise.resolve(audio?.suspend()).catch(()=>{});}catch{}}void persist();updateUI();});
function downloadBackup(suffix='backup') {
  let url=null;
  try {
    const blob=new Blob([exportBackup({cleared:game.cleared,sound})],{type:'application/json'});
    url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`starbolt-${suffix}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    document.body.append(a);a.click();a.remove();const savedURL=url;setTimeout(()=>URL.revokeObjectURL(savedURL),60000);return true;
  } catch { if(url)URL.revokeObjectURL(url);$('import-status').textContent='バックアップを書き出せませんでした。記録は変更していません。';return false; }
}
$('export').addEventListener('click',()=>{cancelImport();if(downloadBackup())$('import-status').textContent='バックアップのダウンロードを開始しました。端末の保存先を確認してください。';});
$('choose-import').addEventListener('click',()=>{
  cancelImport();$('cancel-import').hidden=false;$('import-status').textContent='JSONファイルを選択してください。キャンセルすると記録は変わりません。';$('import-file').click();
});
$('cancel-import').addEventListener('click',cancelImport);$('import-file').addEventListener('cancel',cancelImport);
$('import-file').addEventListener('change',async()=>{
  const file=$('import-file').files?.[0],generation=++importGeneration;$('import-file').value='';
  if(!file){cancelImport();return;}
  $('cancel-import').hidden=false;$('import-status').textContent='バックアップを確認中…';
  try {
    if(file.size>MAX_BYTES) throw new Error('ファイルは4 KB以下にしてください');
    const text=await file.text();if(generation!==importGeneration||!settings.open||document.hidden)return;
    const data=importBackup(text);
    if(!downloadBackup('before-import'))return;
    const temporary=store.status!=='ready'&&store.status!=='saving';
    if(!window.confirm(`現在の記録のバックアップをダウンロードしました。保存先を確認してから進んでください。\n撃破記録を ${data.cleared.length} / 8、音を ${data.sound?'ON':'OFF'} に置き換え、ステージ選択へ戻りますか？ 途中の状態は失われます。${temporary?'\n現在は一時プレイのため、読込内容はこのページ内だけに反映します。':''}`)) {cancelImport();return;}
    if(generation!==importGeneration||!settings.open||document.hidden)return;
    game.cleared=[...data.cleared];sound=data.sound;game.checkpoint=false;clearAllPhysical();game.select();void persist();updateUI();
    if(!sound){try{Promise.resolve(audio?.suspend()).catch(()=>{});}catch{}}
    $('import-status').textContent='記録を読み込みました。保存状況は画面下の表示を確認してください。';
  } catch(error) {if(generation===importGeneration)$('import-status').textContent='読み込めませんでした：'+(error?.message||'ファイルを確認してください')+'。記録は変更していません。';}
  finally {if(generation===importGeneration)$('cancel-import').hidden=true;}
});
$('reset').addEventListener('click',()=>{
  cancelImport();if(!downloadBackup('before-reset'))return;
  if(!window.confirm('現在の記録のバックアップをダウンロードしました。保存先を確認してから進んでください。\n撃破記録をすべてリセットし、ステージ選択へ戻りますか？ 途中の状態も失われます。音設定は残します。'))return;
  game.cleared=[];game.checkpoint=false;clearAllPhysical();game.select();void persist();$('import-status').textContent='撃破記録をリセットしました。保存状況は画面下の表示を確認してください。';
});
$('return-link').addEventListener('click',e=>{
  const running=game.mode==='play'||game.mode==='pause';lifecycle();cancelImport();
  if(store.status==='saving'){e.preventDefault();$('notice').textContent='記録を保存中です。保存完了後に、もう一度「一覧」を押してください。';return;}
  if((running||store.status!=='ready')&&!window.confirm('一覧へ戻りますか？ 途中のステージは保存されません。一時プレイの記録は、必要なら先にバックアップしてください。'))e.preventDefault();
});
canvas.tabIndex=0;updateUI();
if(!ctx) { $('notice').textContent='この環境ではCanvas 2Dを使用できません。対応するブラウザで開いてください。';for(const b of $('grid').children)b.disabled=true; }
else { let lastUI='';const frame=now=>{clock.frame(now);draw(ctx,game);const ui=[game.mode,game.stage,game.player?.hp,game.checkpoint,game.weapon].join('|');if(ui!==lastUI){lastUI=ui;updateUI();}requestAnimationFrame(frame);};requestAnimationFrame(frame); }
