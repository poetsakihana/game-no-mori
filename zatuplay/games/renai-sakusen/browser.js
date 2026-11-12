'use strict';
// Browser adapter. Story, thresholds, random selection and portrait pixels remain original.
const BROWSER_VERSION = '0.2.0-web.1';
const SAVE_KEY = 'zatuplay.renai-sakusen.browser.v1';
const SAVE_FORMAT = 'zatuplay-renai-sakusen-v1';
const BACKUP_FORMAT = 'zatuplay-renai-sakusen-backup-v1';
const MAX_FILE_BYTES = 2_000_000;
// Bound each original-style memory entry so all 4 current + 4 recovery states
// always fit a portable full backup. No original dialogue is truncated.
const MAX_LOG_BYTES = 1024;
const encoder = new TextEncoder();
const utf8Size = text => encoder.encode(text).length;
const clone = value => JSON.parse(JSON.stringify(value));
const integer = (n, lo, hi) => Number.isSafeInteger(n) && n >= lo && n <= hi;
const plain = o => !!o && typeof o === 'object' && !Array.isArray(o);
const textField = (s, max, min = 0) => typeof s === 'string' && s.length >= min && s.length <= max;
const allowedKeys = (o, names) => plain(o) && Object.keys(o).every(k => names.includes(k));
function parseJSON(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_FILE_BYTES || utf8Size(raw) > MAX_FILE_BYTES) throw Error('size');
  return JSON.parse(raw, (key, value) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('unsafe key');
    return value;
  });
}
function validateState(s) {
  const names = ['v','hero','name','target','twin','seed','episode','love','trust','courage','gap','relation','paths','currentTrack','met','log','ended','graduation'];
  if (!allowedKeys(s,names) || s.v !== 2 || ![0,1].includes(s.hero) || !integer(s.target,0,23) || CAST[s.hero].gender === CAST[s.target].gender || !textField(s.name,12,1) || !s.name.trim() || typeof s.twin !== 'boolean' || !integer(s.seed,0,Number.MAX_SAFE_INTEGER) || !integer(s.episode,0,150) || !['love','trust','courage','gap'].every(k=>integer(s[k],0,100)) || !['片思い','恋の途中','両思い'].includes(s.relation) || !Array.isArray(s.paths) || s.paths.length !== 6 || !s.paths.every(n=>integer(n,0,150)) || s.paths.reduce((a,b)=>a+b,0)>s.episode || ![null,0,1,2,3,4,5].includes(s.currentTrack) || ![0,1].includes(s.graduation) || !Array.isArray(s.met) || s.met.length<2 || s.met.length>24 || !s.met.every(n=>integer(n,0,23)) || new Set(s.met).size!==s.met.length || !s.met.includes(s.hero) || !s.met.includes(s.target) || !Array.isArray(s.log) || s.log.length>s.episode || typeof s.ended!=='boolean' || s.ended && s.episode!==150) return null;
  let last = 0;
  for (const l of s.log) {
    if (!allowedKeys(l,['episode','title','choice','reply','option','node','track']) || !integer(l.episode,1,s.episode) || l.episode<=last || !['title','choice','reply'].every(k=>textField(l[k],4000)) || l.option!==undefined && ![0,1].includes(l.option) || l.node!==undefined && !/^base-(?:[0-9]|[1-8][0-9]|9[0-8])$|^branch-(?:[0-9]|10)-[0-4]$/.test(l.node) || l.track!==undefined && !integer(l.track,0,5)) return null;
    if (utf8Size(JSON.stringify(l)) > MAX_LOG_BYTES) return null;
    last=l.episode;
  }
  return clone(s);
}
function migrateState(s) {
  if (s?.v === 2) return validateState(s);
  if (!allowedKeys(s,['v','hero','name','target','twin','seed','episode','love','trust','courage','gap','relation','log','ended','graduation']) || s.v!==1 || ![0,1].includes(s.hero) || !integer(s.target,0,3) || CAST[s.hero].gender===CAST[s.target].gender || !textField(s.name,12,1) || !s.name.trim() || typeof s.twin!=='boolean' || !integer(s.seed,0,Number.MAX_SAFE_INTEGER) || !integer(s.episode,0,99) || !['love','trust','courage','gap'].every(k=>integer(s[k],0,100)) || typeof s.ended!=='boolean' || s.ended && s.episode!==99 || !Array.isArray(s.log) || s.log.length>s.episode || s.relation!==undefined && !['片思い','恋の途中','両思い'].includes(s.relation) || s.graduation!==undefined&&![0,1].includes(s.graduation)) return null;
  const n = fresh(s.hero,s.name,s.target,s.twin,s.seed);
  Object.assign(n,{love:s.love,trust:s.trust,courage:s.courage,gap:s.gap,relation:s.relation||'片思い',episode:s.episode===99?150:TIMELINE.findIndex(e=>e.kind==='base'&&e.baseIndex===s.episode),ended:s.ended,log:clone(s.log)});
  return validateState(n);
}
function validateActive(a) {
  if (a===null) return null;
  if (!allowedKeys(a,['state','phase','sceneTrack']) || !['scene','reply','ending'].includes(a.phase)) throw Error('active');
  const s=validateState(a.state);
  if(s?.ended&&s.relation!==relation(s))throw Error('ending relation');
  if (!s || a.phase==='ending' && !s.ended || a.phase!=='ending' && s.ended || a.phase==='scene' && s.episode>=150 || a.phase==='reply' && (!integer(a.sceneTrack,0,5)||s.episode<1||s.log.at(-1)?.episode!==s.episode) || a.phase!=='reply' && a.sceneTrack!==null) throw Error('phase');
  return {state:s,phase:a.phase,sceneTrack:a.sceneTrack};
}
function validateEndings(a) {
  if (!Array.isArray(a) || a.length>100 || new Set(a).size!==a.length || !a.every(id=>typeof id==='string'&&ENDINGS.some(e=>e.id===id))) throw Error('endings');
  return [...a];
}
function validateLegacy(a) {
  if (!Array.isArray(a) || a.length>100 || !a.every(v=>textField(v,160,1)||integer(v,0,99)) || new Set(a).size!==a.length) throw Error('legacy');
  return [...a];
}
function blankSnapshot() { return {active:null,slots:[null,null,null],endings:[],legacyEndings:[],settings:{sound:false}}; }
function snapshot(b) { return clone({active:b.active,slots:b.slots,endings:b.endings,legacyEndings:b.legacyEndings,settings:b.settings}); }
function validateSnapshot(b) {
  if (!allowedKeys(b,['active','slots','endings','legacyEndings','settings']) || !Array.isArray(b.slots) || b.slots.length!==3 || !allowedKeys(b.settings,['sound']) || typeof b.settings.sound!=='boolean') throw Error('snapshot');
  const result={active:validateActive(b.active),slots:b.slots.map(validateActive),endings:validateEndings(b.endings),legacyEndings:validateLegacy(b.legacyEndings),settings:{sound:b.settings.sound}};
  for(const a of [result.active,...result.slots])if(a?.phase==='ending'&&!result.endings.includes(getEnding(a.state).id))throw Error('missing ending record');
  return result;
}
function blankBook() { return {format:SAVE_FORMAT,revision:0,...blankSnapshot(),recovery:null}; }
function validateBook(b) {
  if (!allowedKeys(b,['format','revision','active','slots','endings','legacyEndings','settings','recovery']) || b.format!==SAVE_FORMAT || !integer(b.revision,0,Number.MAX_SAFE_INTEGER-1)) throw Error('book');
  const result={format:SAVE_FORMAT,revision:b.revision,...validateSnapshot(snapshot(b)),recovery:b.recovery===null?null:validateSnapshot(b.recovery)};
  // Match the actual pretty-printed export envelope, with room for its timestamp.
  const portable=JSON.stringify({format:BACKUP_FORMAT,version:BROWSER_VERSION,exportedAt:'2000-01-01T00:00:00.000Z',data:result},null,2);
  if(utf8Size(portable)>MAX_FILE_BYTES-128)throw Error('portable size');
  return result;
}
function oldActive(s) {
  const n=migrateState(s); if(!n)throw Error('legacy state');
  // Android did not persist the response screen. Resume at its saved next scene.
  if(n.episode===150){n.ended=true;n.relation=relation(n);}
  return {state:n,phase:n.ended?'ending':'scene',sceneTrack:null};
}
function decodeBackup(data, current) {
  let result;
  if (data?.format===BACKUP_FORMAT) {
    if(!allowedKeys(data,['format','version','exportedAt','data'])||!textField(data.version,40,1)||!textField(data.exportedAt,80,1))throw Error('backup');
    result=validateBook(data.data);
  } else if (data?.format===SAVE_FORMAT) result=validateBook(data);
  else {
    result=clone(current);
    const wrapped=['renai-backup-v1','renai-backup-v2'].includes(data?.format);
    if(wrapped&&!allowedKeys(data,['format','state','endings','legacyEndings']))throw Error('old backup');
    result.active=oldActive(wrapped?data.state:data);
    if(wrapped&&data.endings!==undefined) {
      if(data.format==='renai-backup-v1')result.legacyEndings=validateLegacy(data.endings);
      else result.endings=validateEndings(data.endings);
    }
    if(wrapped&&data.legacyEndings!==undefined)result.legacyEndings=validateLegacy(data.legacyEndings);
    if(result.active.phase==='ending'){const id=getEnding(result.active.state).id;if(!result.endings.includes(id))result.endings.push(id);}
  }
  // Import never removes already collected endings, even when loading an older backup.
  result.endings=[...new Set([...current.endings,...result.endings])];
  result.legacyEndings=[...new Set([...current.legacyEndings,...result.legacyEndings])];
  return validateBook(result);
}
const activeVoices=new Set();
let book=blankBook(), diskRaw=null, saveMode='persistent', saveReason='', viewEpoch=0, opSerial=0, operation=false, importSerial=0, confirmation=null, modalEpoch=0, toastTimer=null, screen='home', unfocused=false, soundFault=false, soundGeneration=0;
try {
  diskRaw=localStorage.getItem(SAVE_KEY);
  if(diskRaw!==null)book=validateBook(parseJSON(diskRaw));
} catch { saveMode='memory';saveReason=diskRaw!==null?'保存データに問題があるため、元データを保護しています。':'このブラウザの保存領域を利用できません。'; }
if(saveMode==='persistent'&&typeof navigator.locks?.request!=='function'){saveMode='memory';saveReason='安全な同時保存の機能を利用できません。';}
state=book.active?.state||null;sound=book.settings.sound;
function saveStatus() {
  const el=document.querySelector('#save-status');
  el.classList.toggle('warning',saveMode!=='persistent');
  el.textContent=operation?'保存処理を待っています。画面を移動・閉じると未完了の操作は中止します。':saveMode==='persistent'?'ブラウザ内保存：有効 / 0.2.0-web.1 / 大切な記録は設定からJSONを書き出してください。':`${saveReason} このタブ内だけで続行します。端末には保存されません。閉じる前に設定からJSONを書き出してください。`;
}
function toast(t) {const el=document.querySelector('#toast');clearTimeout(toastTimer);el.textContent=t;el.style.opacity=1;toastTimer=setTimeout(()=>el.style.opacity=0,5000);}
function suspendSound() {soundGeneration++;clearInterval(timer);timer=null;for(const o of activeVoices){try{o.stop();o.disconnect();}catch{}}activeVoices.clear();try{const p=audio?.suspend();p?.catch(()=>{});}catch{} }
function changedView() {viewEpoch++;importSerial++;confirmation=null;stopPending();suspendSound();}
function stopPending(){opSerial++;operation=false;document.body.classList.remove('working');saveStatus();}
function modal(html) {changedView();modalEpoch++;const d=document.querySelector('#modal');document.querySelector('#dialogBody').innerHTML=html;if(!d.open)d.showModal();}
function closeModal() {changedView();modalEpoch++;document.querySelector('#modal').close();if(screen==='game')viewActive();else resumeSound();}
function home(){changedView();screen='home';renderHome();resumeSound();}
function setup(){changedView();screen='setup';renderSetup();resumeSound();}
function settings(){renderSettings();}
function cleared(){return [...book.endings];}
function savedMessage(){return saveMode==='persistent'?'このブラウザに保存しました。':'このタブ内に記録しました。端末には保存されていません。';}
function canAct(){return !operation&&!document.hidden&&!unfocused&&!document.querySelector('#modal').open;}
async function transact(make, {recover=false,expected=viewEpoch,allowModal=false}={}) {
  if(operation||expected!==viewEpoch||document.hidden||unfocused||!allowModal&&document.querySelector('#modal').open)return false;
  const token=++opSerial;operation=true;document.body.classList.add('working');saveStatus();suspendSound();
  const stillCurrent=()=>token===opSerial&&expected===viewEpoch&&!document.hidden&&!unfocused;
  let outcome=false;
  const commit=()=>{
    if(!stillCurrent())return;
    let next=clone(book);
    make(next);
    if(recover)next.recovery=snapshot(book);
    next.revision=book.revision+1;next=validateBook(next);
    if(saveMode==='persistent') {
      const now=localStorage.getItem(SAVE_KEY);
      if(now!==diskRaw){saveMode='memory';saveReason='別のタブで保存が変更されました。上書きを防止しています。';throw Error('conflict');}
      const encoded=JSON.stringify(next);
      localStorage.setItem(SAVE_KEY,encoded); // Atomic single-key write, under the same-origin Web Lock.
      diskRaw=encoded;
    }
    book=next;state=book.active?.state||null;sound=book.settings.sound;outcome=true;
  };
  try {
    if(saveMode==='persistent')await navigator.locks.request(SAVE_KEY,{mode:'exclusive'},commit);
    else commit();
  } catch {
    if(stillCurrent()) {
      if(saveMode==='persistent'){saveMode='memory';saveReason='保存に失敗しました。既存の保存は変更していません。';}
      toast('操作は反映されませんでした。保存状態を確認してから、もう一度操作してください。');
    }
  } finally {
    if(token===opSerial){operation=false;document.body.classList.remove('working');saveStatus();resumeSound();}
  }
  return outcome&&stillCurrent();
}
function ask(title,detail,action){
  modal(`<h2>${esc(title)}</h2><p>${esc(detail)}</p><p class="muted">変更前の全データを「操作直前のバックアップ」として残します。前回の復元用バックアップは置き換わります。必要なら先にJSONを書き出してください。</p><button onclick="exportSave()">現在の全データを書き出す</button><button class="primary" id="confirm-action">確認して実行</button><button onclick="closeModal()">キャンセル</button>`);
  const epoch=viewEpoch;
  confirmation={epoch,action};
  document.querySelector('#confirm-action').onclick=async()=>{
    if(!confirmation||confirmation.epoch!==epoch||operation||document.hidden||unfocused)return;
    const fn=confirmation.action;confirmation=null;
    document.querySelector('#confirm-action').disabled=true;
    const done=await fn(epoch);
    if(done&&viewEpoch===epoch){closeModal();viewActive();toast(savedMessage());}
    else if(viewEpoch===epoch&&!operation){closeModal();toast('操作は中止されました。データは変更していません。');}
  };
}
function start(){
  if(!canAct()||screen!=='setup')return;
  const hero=chosen,name=(document.querySelector('#playerName')?.value.trim()||CAST[hero].short).slice(0,12);
  ask('新しい恋をはじめますか？','自動保存を新しい物語に置き換えます。手動3枠と結末の記録は残ります。',epoch=>transact(b=>{
    const pool=CAST.filter(c=>c.gender!==CAST[hero].gender);
    const s=fresh(hero,name,pool[Math.floor(Math.random()*pool.length)].id,Math.random()<.08,Math.floor(Math.random()*99999));
    b.active={state:s,phase:'scene',sceneTrack:null};
  },{recover:true,expected:epoch,allowModal:true}));
}
function resume(){if(!canAct())return;if(!book.active)return toast('有効な保存がありません。');viewActive();}
function viewActive(){
  changedView();screen='game';state=book.active?.state||null;busy=false;
  if(!state)return home();
  if(book.active.phase==='reply')renderReply();else if(book.active.phase==='ending')renderEnding();else renderScene();
  resumeSound();
}
function renderReply(){
  const a=book.active,s=a.state,c=CAST[s.target],l=s.log.at(-1),e=sceneFor({...s,episode:s.episode-1,currentTrack:a.sceneTrack});
  app.innerHTML=`<div class="game"><div class="status"><span>${esc(s.name)} × ${c.short} / ${esc(s.relation)} ${s.twin?'✦ 特別な縁':''}</span><button class="sub" onclick="slots()">セーブ / ロード</button></div><div class="journey"><span>${CHAPTERS[e.chapter][0]} / 返答</span><span>選択 ${s.episode} / 150</span></div><div class="progress"><i style="width:${s.episode/150*100}%"></i></div><section class="stage stage-v2 response-stage"><div class="character-focus">${portrait(c,'stage-portrait')}</div><div class="chapter">${CHAPTERS[e.chapter][1]} / ${e.place}</div><div class="scene"><span class="eyebrow">${e.kind==='branch'?'BRANCH STORY':'SCHOOL DAYS'}</span><h2>${esc(l.title)}</h2><p>${e.text}</p></div></section><section class="dialogue" aria-live="polite"><button class="speaker character-link" onclick="profile(${c.id})">${c.name} ↗</button><p>「${esc(l.reply)}」</p><p>あなた：${esc(l.choice)}</p><p class="muted response-saved">${savedMessage()} 現在の分岐：${TRACKS[mainTrack(s)].name}</p><button class="primary" onclick="nextScene(${viewEpoch})">${s.episode>=150?'ふたりの結末へ':'次の場面へ →'}</button><div class="metrics">${metric('love','好意')}${metric('trust','信頼')}${metric('courage','勇気')}${metric('gap','すれ違い')}</div></section></div>`;
}
function advanceChoice(s,o){
  const e=sceneFor(s),c=CAST[s.target],sceneTrack=mainTrack(s),d=apply(s,o);
  let reply=e.reply?e.reply[o]:d.love>=2?c.voice:'その考え方も、ちゃんと聞きたい。少しずつお互いを知っていこう。';
  if(s.twin&&e.kind==='base'&&[20,29,47,56,75,84].includes(e.baseIndex))reply='大切だからこそ、近づくのが怖くなる。少し、自分で考える時間もほしい。';
  if(e.kind==='base'&&[62,71,89].includes(e.baseIndex)){
    s.relation=relation(s);
    reply=s.relation==='両思い'?'私も、あなたが好き。これからは、ふたりで歩いていきたい。':s.relation==='恋の途中'?'あなたは大切な人。でも、恋と呼べるかは、もう少し考えたい。':'気持ちは嬉しい。でも、今は同じ気持ちとは言えない。';
  }
  s.log.push({episode:s.episode+1,title:e.title,choice:e.choices[o],reply,option:o,node:e.id,track:mainTrack(s)});s.episode++;
  return {state:s,phase:'reply',sceneTrack};
}
async function choose(o,epoch){
  if(!canAct()||screen!=='game'||epoch!==viewEpoch||book.active?.phase!=='scene'||![0,1].includes(o))return;
  if(await transact(b=>{b.active=advanceChoice(b.active.state,o);},{expected:epoch})){viewActive();tone();}
}
async function nextScene(epoch){
  if(!canAct()||screen!=='game'||epoch!==viewEpoch||book.active?.phase!=='reply')return;
  if(await transact(b=>{
    const s=b.active.state;
    if(s.episode===150){s.ended=true;s.relation=relation(s);const id=getEnding(s).id;if(!b.endings.includes(id))b.endings.push(id);b.active={state:s,phase:'ending',sceneTrack:null};}
    else b.active={state:s,phase:'scene',sceneTrack:null};
  },{expected:epoch}))viewActive();
}
function slots(){modal(`<h2>セーブ / ロード</h2><p>返答画面も含めて保存する3枠です。自動保存とは別に残ります。</p>${book.slots.map((a,i)=>`<div class="log">枠${i+1}　${a?esc(a.state.name)+' × '+CAST[a.state.target].short+' / 完了選択 '+a.state.episode+' / '+({scene:'場面',reply:'返答',ending:'結末'}[a.phase]):'空き'}<br><button onclick="saveSlot(${i})" ${book.active?'':'disabled'}>保存</button><button onclick="loadSlot(${i})" ${a?'':'disabled'}>ロード</button></div>`).join('')}`);}
function saveSlot(i){
  if(operation||!integer(i,0,2)||!book.active)return;
  ask(`枠${i+1}に保存しますか？`,book.slots[i]?'この枠の記録を現在の物語で置き換えます。':'現在の物語と返答画面をこの枠に保存します。',epoch=>transact(b=>{b.slots[i]=clone(b.active);},{recover:true,expected:epoch,allowModal:true}));
}
function loadSlot(i){
  if(operation||!integer(i,0,2)||!book.slots[i])return;
  ask(`枠${i+1}をロードしますか？`,'現在の自動保存をこの枠の物語で置き換えます。結末の回収記録は減りません。',epoch=>transact(b=>{b.active=clone(b.slots[i]);},{recover:true,expected:epoch,allowModal:true}));
}
function resetPrompt(){ask('全セーブを初期化しますか？','このブラウザ版の自動保存、手動3枠、結末帳、旧版結末記録、音設定を空にします。元のAndroid用保存領域は変更しません。',epoch=>transact(b=>Object.assign(b,blankSnapshot()),{recover:true,expected:epoch,allowModal:true}));}
function restoreRecovery(){
  if(!book.recovery||operation)return;
  ask('操作直前の記録へ戻しますか？','前回の置換操作の直前にあった全データへ戻します。現在の全データが次の復元用バックアップになります。',epoch=>transact(b=>Object.assign(b,clone(b.recovery)),{recover:true,expected:epoch,allowModal:true}));
}
function download(data,name){
  let url;
  try {url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();toast('JSONのダウンロードを開始しました。保存先でファイルを確認してください。');}
  catch {toast('書き出しを開始できませんでした。ブラウザのダウンロード設定を確認してください。');}
  finally {if(url)setTimeout(()=>URL.revokeObjectURL(url),30000);}
}
function exported(b){return {format:BACKUP_FORMAT,version:BROWSER_VERSION,exportedAt:new Date().toISOString(),data:clone(b)};}
function exportOriginal(){if(diskRaw!==null)download(diskRaw,'renai-sakusen-preserved-storage.json');}
function exportSave(){download(exported(book),'renai-sakusen-browser-backup.json');}
function exportRecovery(){if(book.recovery)download(exported({...blankBook(),...clone(book.recovery)}),'renai-sakusen-before-change.json');}
async function importSave(input){
  const token=++importSerial,epoch=viewEpoch;
  const file=input.files?.[0];input.value=''; // Same-file reselection works after success, failure and cancellation.
  if(!file||operation)return;
  if(file.size>MAX_FILE_BYTES)return toast('ファイルが大きすぎます（上限2MB）。');
  toast('JSONを確認しています。まだ保存は変更していません。');
  try {
    const raw=await file.text();
    if(token!==importSerial||epoch!==viewEpoch||!input.isConnected||!document.querySelector('#modal').open||document.hidden)return;
    const imported=decodeBackup(parseJSON(raw),book);
    ask('JSONから復元しますか？',`有効なデータです。自動保存、ブラウザ版バックアップ内の手動3枠と音設定を復元します。現在の結末帳は統合して残します。旧APK形式では手動枠と音設定は変えません。`,confirmEpoch=>transact(b=>{
      const currentEnds=b.endings,currentLegacy=b.legacyEndings;
      Object.assign(b,snapshot(imported));
      b.endings=[...new Set([...currentEnds,...b.endings])];b.legacyEndings=[...new Set([...currentLegacy,...b.legacyEndings])];
    },{recover:true,expected:confirmEpoch,allowModal:true}));
  } catch {
    if(token===importSerial&&epoch===viewEpoch)toast('このJSONは読み込めません。全データは変更していません。');
  }
}
function tone(freq=660,d=.12){
  if(!sound||!audio||soundFault||document.hidden||unfocused||document.querySelector('#modal').open||operation)return;
  try {const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d);o.connect(g).connect(audio.destination);activeVoices.add(o);o.onended=()=>{activeVoices.delete(o);try{o.disconnect();g.disconnect();}catch{}};o.start();o.stop(audio.currentTime+d);}
  catch{soundFault=true;suspendSound();toast('音を再生できません。音なしで続けられます。');}
}
async function resumeSound(){
  if(!sound||soundFault||!audio||document.hidden||unfocused||document.querySelector('#modal').open||operation||timer!==null)return;
  const epoch=viewEpoch,generation=++soundGeneration;
  try {await audio.resume();if(generation!==soundGeneration)return;if(epoch!==viewEpoch||!sound||document.hidden||unfocused||document.querySelector('#modal').open||operation)return suspendSound();if(timer!==null)return;let n=0,notes=[261.63,329.63,392,493.88,440,392,329.63,293.66];timer=setInterval(()=>tone(notes[n++%notes.length],1.4),900);}
  catch{if(generation===soundGeneration){soundFault=true;suspendSound();toast('音を再生できません。音なしで続けられます。');}}
}
async function toggleSound(){
  if(operation)return;
  const enabled=!book.settings.sound,epoch=viewEpoch;
  if(enabled){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error();audio??=new Audio();soundFault=false;}catch{soundFault=true;return toast('この環境では音を使えません。ゲームは続けられます。');}}
  if(await transact(b=>{b.settings.sound=enabled;},{expected:epoch,allowModal:true})){settings();toast(`${enabled?'音をオンにしました。メニューを閉じると再生します。':'音をオフにしました。'} ${savedMessage()}`);}
}
// All view changes invalidate reads, queued writes and detached button handlers.
for(const name of ['roster','profile','showAlbum','showEndings','routeMap']){
  const original=window[name];
  window[name]=function(...args){if(operation)return;changedView();if(name==='roster'||name==='showEndings')screen=name;return original(...args);};
}
document.querySelector('#modal').addEventListener('cancel',event=>{event.preventDefault();closeModal();});
document.querySelector('#modal').addEventListener('close',()=>{resumeSound();});
function interrupt(){const cancel=!!confirmation||operation;unfocused=true;changedView();if(cancel)document.querySelector('#modal').close();}
function reactivate(){unfocused=document.hidden;if(screen==='game')viewActive();else resumeSound();}
window.addEventListener('blur',interrupt);
window.addEventListener('focus',reactivate);
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();else reactivate();});
window.addEventListener('pagehide',interrupt);
window.addEventListener('pageshow',()=>{reactivate();saveStatus();});
window.addEventListener('storage',event=>{if(event.key!==SAVE_KEY&&event.key!==null)return;if(saveMode==='persistent'){saveMode='memory';saveReason='別のタブで保存が変更されました。上書きを防止しています。';changedView();if(screen==='game'&&!document.querySelector('#modal').open)viewActive();toast('別タブの変更を検出しました。このタブはJSONを書き出して保管できます。');}});
window.addEventListener('beforeunload',event=>{if(operation||saveMode!=='persistent'&&(book.active||book.endings.length||book.slots.some(Boolean))){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}},true);
document.addEventListener('cancel',event=>{if(event.target?.matches?.('[data-import]'))importSerial++;},true);
document.addEventListener('click',event=>{if(event.target?.matches?.('[data-import]'))importSerial++;},true);
function unlockSound(){
  if(!sound||audio||soundFault||!canAct())return;
  try{audio=new(window.AudioContext||window.webkitAudioContext)();resumeSound();}
  catch{soundFault=true;toast('音を再生できません。音なしで続けられます。');}
}
document.addEventListener('pointerdown',unlockSound,{passive:true});
document.addEventListener('keydown',event=>{if(!event.repeat&&['Enter',' '].includes(event.key))unlockSound();},true);
saveStatus();home();
