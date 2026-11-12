(function(){'use strict';
const $=id=>document.getElementById(id),C=globalThis.FlyBattle;
let game,renderer,store,lockRelease,ownsLock=false,ready=false,memoryOnly=false,failed=false,originalRaw=null,saveClock=0,last=performance.now(),animClock=0,previousAnnouncement='',pendingImport=null,importGeneration=0,focusReturn=null,scoopReadyAt=0;
const nodes=new Map(),lastActions=new Map(),pointerTaken=new Set();
function status(text){$('storage-status').textContent=text;}
function curtain(title,text,options={}){$('curtain').hidden=false;$('curtain-title').textContent=title;$('curtain-text').textContent=text;for(const id of ['begin','memory','reload'])$(id).hidden=!options[id];$('controls').inert=true;}
function hideCurtain(){$('curtain').hidden=true;$('controls').inert=false;}
function download(text,name){try{const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){status('書き出せませんでした。この画面を閉じずに別のブラウザでお試しください。');}}
class Sound {
 constructor(){this.music=null;this.pool=[];this.index=0;this.unavailable=false;}
 init(){if(this.music||this.unavailable)return;try{if(typeof Audio!=='function')throw Error('unsupported');this.music=new Audio('assets/bgm.wav');this.music.loop=true;this.music.volume=.24;this.pool=Array.from({length:4},()=>{const a=new Audio('assets/scoop.wav');a.volume=.65;return a;});this.music.addEventListener('error',()=>this.warning());for(const a of this.pool)a.addEventListener('error',()=>this.warning());}catch(e){this.unavailable=true;this.warning();}}
 warning(){$('audio-status').textContent='音を再生できません。無音でそのまま遊べます。';}
 play(a){try{const result=a.play();if(result&&result.catch)result.catch(()=>this.warning());}catch(e){this.warning();}}
 sync(){if(!game||!ready||!game.s.sound||game.s.paused||!$('curtain').hidden||document.hidden){this.stop();return;}this.init();if(this.music)this.play(this.music);}
 stop(){try{if(this.music)this.music.pause();for(const a of this.pool)a.pause();}catch(e){this.warning();}}
 scoop(q){if(!game.s.sound||this.unavailable)return;this.init();const a=this.pool[this.index++%4];if(!a)return;try{a.currentTime=0;a.playbackRate=q>=90?1.4:1;this.play(a);}catch(e){this.warning();}}
}
const sound=new Sound();
function attachGame(state){game=new C.Game(state);game.onScoop=q=>sound.scoop(q);}
function protect(error){if(failed)return;importGeneration++;pendingImport=null;failed=true;ready=false;if(store&&store.expected!==null)originalRaw=store.expected;$('export-original').hidden=originalRaw===null;if(game)game.pause();sound.stop();status('保存を保護しています。元の記録には上書きしません。');curtain('記録を保護しています',error&&error.message?error.message:String(error),{memory:true,reload:true});draw();}
function save(){if(!game||memoryOnly||!ownsLock||failed)return;try{store.save(game.s);status('このブラウザに保存済み。APK版とは別の記録です。');}catch(e){protect(e);}}
function syncTime(now=performance.now()){const gap=(now-last)/1000;last=now;if(!ready||!game||failed||!$('curtain').hidden)return;if(game.s.screen==='play'&&!game.s.paused){if(gap>.25){pause('処理が中断されたため一時停止しました。再開して続けられます。');return;}const before=game.s.screen;game.advance(Math.max(0,gap));if(before!==game.s.screen){save();sound.sync();}else if(game.s.ticks-saveClock>=60){saveClock=game.s.ticks;save();}}}
function pause(note){if(!game||game.s.screen!=='play'||game.s.paused)return;game.pause();last=performance.now();save();sound.stop();if(note)status(note);draw();}
function openDialog(id){syncTime();pause();focusReturn=document.activeElement;const el=$(id);try{if(typeof el.showModal==='function')el.showModal();else{el.setAttribute('open','');el.open=true;}}catch(e){el.setAttribute('open','');el.open=true;}}
function closeDialog(id){const el=$(id);try{if(typeof el.close==='function')el.close();else{el.removeAttribute('open');el.open=false;}}catch(e){el.removeAttribute('open');el.open=false;}if(focusReturn&&focusReturn.isConnected)focusReturn.focus();last=performance.now();}
function inDialog(){return $('name-dialog').open||$('import-dialog').open;}
function action(id){if(!ready||failed||inDialog()||!$('curtain').hidden)return;syncTime();if(!ready||failed)return;const now=performance.now(),s=game.s;
 if(id.startsWith('food-')){if(now<scoopReadyAt)return;if(now-(lastActions.get(id)??-Infinity)<120)return;lastActions.set(id,now);if(game.take(Number(id.slice(5))))save();draw();return;}
 if(id==='sound'){s.sound=!s.sound;save();sound.sync();draw();return;}
 // Reject navigation actions that no longer belong to the visible screen.
 if(!nodes.has(id)||nodes.get(id).disabled)return;
 if(s.screen==='title'){if(id==='story'){s.page=Math.floor((s.unlocked-1)/20);s.screen='story';}else if(id==='rank')s.screen='rank';else if(id==='name'){$('chef-name').value=s.name;openDialog('name-dialog');$('chef-name').focus();return;}}
 else if(s.screen==='story'){if(id.startsWith('stage-')){game.start(Number(id.slice(6)));saveClock=0;scoopReadyAt=now+180;lastActions.clear();}else if(id==='prev')s.page=Math.max(0,s.page-1);else if(id==='next')s.page=Math.min(4,s.page+1);else if(id==='title')s.screen='title';}
 else if(s.screen==='play'){if(id==='pause'||id==='resume')s.paused=!s.paused;else if(id==='select'){s.page=Math.floor((s.stage-1)/20);s.screen='story';s.paused=false;}}
 else if(s.screen==='result'){if(id==='retry'){game.start(s.stage);saveClock=0;scoopReadyAt=now+180;lastActions.clear();}else if(id==='continue'){if(s.win&&s.stage<100){game.start(s.stage+1);saveClock=0;scoopReadyAt=now+180;lastActions.clear();}else{s.page=Math.floor((s.stage-1)/20);s.screen='story';}}else if(id==='title')s.screen='title';}
 else if(s.screen==='rank'&&id==='title')s.screen='title';
 last=performance.now();save();sound.sync();draw();
}
function draw(){if(!game||!renderer)return;const s=game.s,defs=renderer.draw(s,s.screen==='play'?s.clock:animClock),ids=new Set();
 for(const def of defs){ids.add(def.id);let b=nodes.get(def.id);if(!b){b=document.createElement('button');b.type='button';b.className='game-control';b.dataset.id=def.id;b.addEventListener('click',e=>{if(pointerTaken.has(def.id)){pointerTaken.delete(def.id);if(e.detail!==0)return;}action(def.id);});if(def.id.startsWith('food-')){b.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0||e.isPrimary===false)return;pointerTaken.add(def.id);action(def.id);});b.addEventListener('pointercancel',()=>pointerTaken.delete(def.id));}nodes.set(def.id,b);$('controls').append(b);}
  if(b.textContent!==def.label)b.textContent=def.label;b.setAttribute('aria-label',def.label);b.disabled=!def.enabled;b.style.left=def.x/10+'%';b.style.top=def.y/6.5+'%';b.style.width=def.w/10+'%';b.style.height=def.h/6.5+'%';}
 for(const [id,node]of nodes)if(!ids.has(id)){node.remove();nodes.delete(id);pointerTaken.delete(id);}
 $('record-summary').textContent=`解放 ${s.unlocked} / 100面 · BEST ${s.best}点`;
 let announcement='';if(s.screen==='play')announcement=`STAGE ${s.stage}、${C.RIVALS[Math.floor((s.stage-1)/25)]}と対戦。残り${Math.ceil(45-s.ticks/120)}秒。得点${s.points}、あなたの精度${(s.count?s.sum/s.count:0).toFixed(1)}％、CPU ${(s.count?s.cpuSum/s.count:0).toFixed(1)}％。${s.paused?'一時停止中。':''}`;else if(s.screen==='result')announcement=`${s.msg} 獲得${s.points}点。あなたの精度${(s.count?s.sum/s.count:0).toFixed(1)}％、CPU ${(s.count?s.cpuSum/s.count:50).toFixed(1)}％。`;else announcement=({title:'揚げどき！フライバトル。タイトル。',story:`ステージ選択、${s.page+1}ページ。`,rank:'端末内ランキング、TOP10。'})[s.screen];
 if(announcement!==previousAnnouncement){$('battle-status').textContent=announcement;previousAnnouncement=announcement;}
}
function frame(now){try{syncTime(now);if(ready&&!document.hidden)animClock+=1/60;draw();}catch(e){protect(e);}requestAnimationFrame(frame);}
async function initialize(){try{if(!C||!globalThis.FlyRenderer)throw Error('ゲームのファイルを読み込めませんでした。');const ctx=$('game').getContext('2d');if(!ctx)throw Error('Canvasを利用できません。');renderer=new FlyRenderer(ctx);attachGame(C.fresh());
 const load=()=>{try{store=new C.SaveStore(localStorage);const state=store.load();originalRaw=store.expected;if(state.screen==='play')state.paused=true;attachGame(state);draw();curtain('揚げどき！フライバトル',state.screen==='play'?'途中の戦況を読み込みました。停止状態から再開できます。':'100％の揚げごろを狙って、全100面に挑戦！',{begin:true});$('begin').textContent=state.screen==='play'?'つづきから':'はじめる';status(memoryOnly?'安全な保存機能がないため、保存せずに遊びます。記録の書き出しはできます。':'記録を読み込みました。');}catch(e){try{originalRaw=localStorage.getItem(C.KEY);}catch(ignored){}protect(e);}};
 if(navigator.locks&&typeof navigator.locks.request==='function'){navigator.locks.request(C.KEY+'.writer',{mode:'exclusive',ifAvailable:true},async lock=>{if(!lock){curtain('別のタブで使用中です','同じゲームの別タブを閉じてから再読込してください。保存せずに遊ぶこともできます。',{memory:true,reload:true});status('保存済み記録は保護されています。');draw();return;}ownsLock=true;load();await new Promise(resolve=>{lockRelease=resolve;});ownsLock=false;}).catch(e=>protect(e));}
 else{memoryOnly=true;load();}
 requestAnimationFrame(frame);
 }catch(e){$('load-error').hidden=false;curtain('起動できませんでした',e.message,{reload:true});}}
$('begin').addEventListener('click',()=>{if(failed)return;ready=true;hideCurtain();last=performance.now();saveClock=game.s.ticks;save();sound.sync();draw();});
$('memory').addEventListener('click',()=>{importGeneration++;pendingImport=null;memoryOnly=true;failed=false;ready=true;hideCurtain();if(game.s.screen==='play')game.s.paused=true;last=performance.now();status('保存せずに遊んでいます。元の記録は変更しません。終了前に記録を書き出してください。');sound.sync();draw();});
$('reload').addEventListener('click',()=>location.reload());
$('export').addEventListener('click',()=>{if(!game)return;syncTime();pause();try{const raw=C.encode(game.s);download(raw,'fly-battle-save.json');}catch(e){status(e.message);}});
$('export-original').addEventListener('click',()=>{if(originalRaw!==null)download(originalRaw,'fly-battle-original-save.json');});
$('name-form').addEventListener('submit',e=>{e.preventDefault();if(!ready||failed)return;const value=$('chef-name').value.slice(0,12).trim();game.s.name=value||'料理人';closeDialog('name-dialog');save();draw();});$('name-cancel').addEventListener('click',()=>closeDialog('name-dialog'));
$('import').addEventListener('change',async()=>{
 const generation=++importGeneration,input=$('import'),file=input.files&&input.files[0];input.value='';pendingImport=null;
 if($('import-dialog').open)closeDialog('import-dialog');if(!file)return;syncTime();pause();
 if(memoryOnly||!ownsLock){status('この画面では安全に保存できないため、復元はできません。保存機能の使えるブラウザで開いてください。');return;}
 status('復元するファイルを読み込んでいます。');
 try{if(file.size>2000000)throw Error('ファイルが大きすぎます。');const raw=await file.text();
  if(generation!==importGeneration||memoryOnly||!ownsLock)return;
  const value=C.decode(raw);pendingImport=raw;$('import-info').textContent=`${value.state.name} · 解放 ${value.state.unlocked}面 · BEST ${value.state.best}点`;openDialog('import-dialog');status('内容を確認して復元するか選んでください。');
 }catch(e){if(generation===importGeneration)status('読み込めません：'+e.message);}
});
function cancelImport(){importGeneration++;pendingImport=null;closeDialog('import-dialog');status('復元をキャンセルしました。記録の置き換えは行っていません。');}
$('import-cancel').addEventListener('click',cancelImport);
$('import-confirm').addEventListener('click',()=>{const raw=pendingImport;importGeneration++;pendingImport=null;if(!raw||memoryOnly||!ownsLock)return;closeDialog('import-dialog');try{const s=store.import(raw);originalRaw=store.expected;if(s.screen==='play')s.paused=true;attachGame(s);sound.stop();failed=false;ready=false;draw();curtain('記録を復元しました','はじめるを押して進んでください。途中の戦況は停止状態です。',{begin:true});$('begin').textContent='はじめる';status('記録を復元しました。以前の記録もバックアップに保管しています。');}catch(e){protect(e);}});
$('import-dialog').addEventListener('cancel',e=>{e.preventDefault();cancelImport();});
$('name-dialog').addEventListener('cancel',()=>{last=performance.now();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();else if($('board').requestFullscreen)await $('board').requestFullscreen();else status('このブラウザでは全画面に対応していません。横向きでお遊びください。');}catch(e){status('全画面に切り替えられませんでした。通常表示で遊べます。');}});
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||inDialog()||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;const key=e.key.toLowerCase();if(/^[1-4]$/.test(key)&&game&&game.s.screen==='play'){e.preventDefault();action('food-'+(Number(key)-1));}else if(key==='m'){e.preventDefault();action('sound');}else if(key==='p'||key==='escape'){if(game&&game.s.screen==='play'){e.preventDefault();action('pause');}else if(key==='escape'&&ready&&!failed){game.s.screen='title';save();draw();}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){syncTime();pause('画面を離れたため一時停止しました。');sound.stop();}last=performance.now();});
addEventListener('blur',()=>{syncTime();pause('画面を離れたため一時停止しました。');sound.stop();});
addEventListener('pagehide',()=>{importGeneration++;pendingImport=null;syncTime();pause();save();sound.stop();ready=false;if(lockRelease){lockRelease();lockRelease=null;}ownsLock=false;});
addEventListener('pageshow',e=>{if(e.persisted){ready=false;curtain('記録を確認してください','戻ってきた画面のため、安全に続けるには再読込してください。',{reload:true});}});
addEventListener('storage',e=>{if(e.key===C.KEY||e.key===null){if(ownsLock&&!memoryOnly)protect(Error('ほかの画面で記録が変わりました。再読込してください。'));}});
addEventListener('error',()=>{if(ready)protect(Error('動作が中断しました。再読込で保存済みの状態に戻れます。'));});
initialize();
})();
