/* DOM controller: no network, purchase, payment, conversion or native bridge. */
'use strict';
const C=SlotTenCore,S=SlotTenStore,$=id=>document.getElementById(id);
let slotState=C.validate(S.initial),auto=false,writing=false,settling=false,halted=false;
let frameID=null,gapID=null,animationEpoch=0,importEpoch=0,ctx=null;
const oscillators=new Set(),reelNodes=[...document.querySelectorAll('.reel')];
const statusText={ready:'このブラウザに自動保存します。',saved:'保存済み · このブラウザのみ',unsupported:'安全な排他保存に非対応です。このタブ内だけの記録です。閉じる前に書き出してください。',unavailable:'保存が利用できません。このタブ内だけの記録です。閉じる前に書き出してください。',quota:'保存容量が不足しています。未保存分はこのタブ内だけです。閉じる前に書き出してください。',corrupt:'保存データが壊れているか未対応の版です。原文を保持中。このタブ内だけで遊べます。設定から退避・復元できます。',conflict:'別タブで記録が変わりました。回転と上書きを停止しました。今の記録を書き出して再読込してください。'};
function say(text){$('result').textContent=text;$('settingsNotice').textContent=text}
function stopAudio(){
 for(const o of oscillators){try{o.stop()}catch{}try{o.disconnect()}catch{}}oscillators.clear();
 if(ctx){try{const p=ctx.suspend();p?.catch?.(()=>{})}catch{}}
}
function tone(f,d){
 if(!slotState.sound||halted||document.hidden||$('settingsDialog').open)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctx=ctx||new Audio();const p=ctx.resume();p?.catch?.(()=>{});
  const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=f;g.gain.setValueAtTime(.04,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+d);oscillators.add(o);o.onended=()=>{oscillators.delete(o);try{o.disconnect();g.disconnect()}catch{}};o.start();o.stop(ctx.currentTime+d);
 }catch{}
}
function cancelAnimation(){animationEpoch++;if(frameID!==null)cancelAnimationFrame(frameID);frameID=null;reelNodes.forEach(r=>r.classList.remove('rolling'))}
function stopAuto(){auto=false;if(gapID!==null)clearTimeout(gapID);gapID=null;renderControls()}
function invalidateImport(){importEpoch++;$('fileInput').value=''}
function renderControls(){
 const busy=writing||!!slotState.pending||settling,conflict=S.phase==='conflict',modal=$('settingsDialog').open;
 for(const k of ['coins','spins','wins','earned'])$(k).textContent=slotState[k].toLocaleString();
 $('auto').textContent=auto?'■ 自動回転を停止':'▶ 自動スタート';$('auto').setAttribute('aria-pressed',String(auto));
 // Stop always remains available, even while a Web Lock is awaited.
 $('auto').disabled=!auto&&(busy||modal||conflict||document.hidden);
 $('manual').disabled=busy||auto||modal||conflict||document.hidden;
 $('bet').value=String(slotState.bet);$('speed').value=String(slotState.speed);
 $('bet').disabled=$('speed').disabled=busy||modal||conflict;
 $('refill').disabled=busy||modal||conflict;$('sound').disabled=writing||settling||modal||conflict;
 $('sound').textContent='♪ 効果音 '+(slotState.sound?'ON':'OFF');$('sound').setAttribute('aria-pressed',String(slotState.sound));
 document.querySelectorAll('.tile').forEach((b,i)=>{b.disabled=busy||modal||conflict;b.classList.toggle('active',i===slotState.machine);b.setAttribute('aria-pressed',String(i===slotState.machine))});
 ['import','reset','retry'].forEach(k=>$(k).disabled=busy||conflict);
 $('settingsDialog').setAttribute('aria-busy',String(writing||settling));
}
function renderMachine(){
 const m=MACHINES[slotState.machine];document.body.style.setProperty('--accent',m.color);$('name').textContent=m.name;$('sub').textContent=m.sub;$('number').textContent='MACHINE '+String(slotState.machine+1).padStart(2,'0');
 reelNodes.forEach((r,j)=>r.textContent=m.symbols[slotState.reels[j]]);
 $('paytable').replaceChildren();const symbols=document.createElement('tr'),values=document.createElement('tr');
 m.symbols.forEach((s,j)=>{const a=document.createElement('th'),b=document.createElement('td');a.scope='col';a.textContent=s;b.textContent=((8+j*3)*m.mult).toFixed(1)+'倍';symbols.appendChild(a);values.appendChild(b)});$('paytable').append(symbols,values);renderControls();
}
S.subscribe(phase=>{
 $('saveStatus').textContent=statusText[phase]||statusText.unavailable;$('saveStatus').dataset.phase=phase;
 if(phase==='conflict'){stopAuto();stopAudio();halted=true;cancelAnimation();if(slotState.pending&&!writing&&!settling)void settleSpin(false)}
 renderControls();
});
async function apply(next,{replace=false,guard=()=>true,retry=false,settlement=false}={}){
 if(writing)return false;
 writing=true;renderControls();
 try{
  let result;
  if(replace&&(!S.locks||S.phase==='unavailable')){
   if(!guard())return false;S.memoryReplacement(slotState);result='memory';
  }else result=await S.commit(next,{replace,previous:replace?slotState:null,guard,retry});
  if(result==='cancelled'||result==='invalid')return false;
  if(result==='blocked'){say('保存原文が大きすぎて安全に退避できません。原データを書き出してください。現在の記録は変更していません。');return false}
  if(result==='conflict'&&!settlement){say('別タブの記録が変わったため、この操作を止めました。書き出して再読込してください。');return false}
  if(replace&&result!=='saved'&&result!=='memory'){say('変更できませんでした。元の記録を保持しています。保存状態を確認してください。');return false}
  slotState=C.validate(next);return true;
 }catch{say('変更できませんでした。元の記録を保持しています。');return false}
 finally{writing=false;renderControls()}
}
async function settleSpin(playSound=true){
 if(!slotState.pending||settling||writing)return false;
 settling=true;cancelAnimation();const p=slotState.pending;
 try{
  const next=C.settle(slotState);if(!await apply(next,{settlement:true}))return false;
  renderMachine();say(p.payout?'✨ 当たり！ +'+p.payout.toLocaleString()+' コイン':'次の回転に期待！');
  if(p.payout){$('cabinet').classList.remove('win');void $('cabinet').offsetWidth;$('cabinet').classList.add('win');if(playSound)tone(880,.35)}
 }finally{settling=false;renderControls()}
 if(auto&&!halted&&!document.hidden&&!$('settingsDialog').open&&S.phase!=='conflict')gapID=setTimeout(()=>{gapID=null;if(auto&&!halted)void spin()},450);
 return true;
}
function animate(){
 const p=slotState.pending;if(!p)return;cancelAnimation();const ticket=animationEpoch,m=MACHINES[p.machine],start=performance.now();
 reelNodes.forEach(r=>r.classList.add('rolling'));tone(240,.12);
 function frame(now){
  if(ticket!==animationEpoch||slotState.pending?.id!==p.id)return;
  const elapsed=now-start;reelNodes.forEach((r,j)=>{if(elapsed<p.speed*(.6+j*.2))r.textContent=m.symbols[Math.floor(Math.random()*6)];else{r.textContent=m.symbols[p.reels[j]];r.classList.remove('rolling')}});
  if(elapsed<p.speed){frameID=requestAnimationFrame(frame);return}frameID=null;
  if(writing){frameID=requestAnimationFrame(frame);return}void settleSpin();
 }
 frameID=requestAnimationFrame(frame);
}
async function spin(){
 if(writing||settling||slotState.pending||document.hidden||$('settingsDialog').open||S.phase==='conflict')return;
 invalidateImport();let next;
 try{next=C.begin(slotState)}catch(e){stopAuto();say(e.message==='coins'?'コイン不足です。無料補充をどうぞ！':e.message==='integer limit'?'記録の数値上限です。記録を書き出し、最初から遊べます。':'乱数を利用できません。コインは使っていません。対応ブラウザでお試しください。');return}
 halted=false;say('回転を準備中…');
 if(!await apply(next)){stopAuto();return}
 say('回転中…');
 if(halted||document.hidden||$('settingsDialog').open||S.phase==='conflict'){await settleSpin(false);return}animate();
}
function halt(){
 invalidateImport();halted=true;stopAuto();stopAudio();cancelAnimation();
 if(slotState.pending&&!writing&&!settling)void settleSpin(false);
}
async function chooseMachine(i){
 if(writing||settling||slotState.pending||$('settingsDialog').open||S.phase==='conflict')return;
 invalidateImport();stopAuto();if(await apply({...slotState,machine:i,reels:[0,1,2]})){renderMachine();say('3つそろえてコイン獲得！')}
}
MACHINES.forEach((m,i)=>{const b=document.createElement('button');b.className='tile';b.textContent=m.symbols[0];const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');b.appendChild(n);b.setAttribute('aria-label',m.name);b.onclick=()=>void chooseMachine(i);$('machines').appendChild(b)});
$('manual').onclick=()=>{stopAuto();void spin()};
$('auto').onclick=()=>{if(auto){stopAuto();return}if(writing||settling||slotState.pending||document.hidden||$('settingsDialog').open||S.phase==='conflict')return;halted=false;auto=true;renderControls();void spin()};
for(const k of ['bet','speed'])$(k).onchange=async()=>{if(writing||settling||slotState.pending||S.phase==='conflict'){renderControls();return}const value=Number($(k).value);invalidateImport();stopAuto();if(!(k==='bet'?C.BETS:C.SPEEDS).includes(value)){renderControls();return}await apply({...slotState,[k]:value});renderControls()};
$('refill').onclick=async()=>{if(writing||settling||slotState.pending||S.phase==='conflict')return;invalidateImport();stopAuto();try{const next=C.refill(slotState);if(await apply(next))say('1,000枚を補充しました！')}catch{say('100枚未満で1,000枚補充できます')}};
$('sound').onclick=async()=>{if(writing||settling||S.phase==='conflict')return;invalidateImport();const next={...slotState,sound:!slotState.sound};if(!next.sound)stopAudio();await apply(next);if(halted&&slotState.pending)await settleSpin(false)};
function openSettings(){halt();if(!$('settingsDialog').open)$('settingsDialog').showModal();$('settingsNotice').textContent='記録はこの作品のブラウザ版JSONで保管できます。';renderControls();$('closeSettings').focus()}
function closeSettings(){invalidateImport();if($('settingsDialog').open)$('settingsDialog').close();renderControls();$('settings').focus()}
$('settings').onclick=openSettings;$('closeSettings').onclick=closeSettings;
$('settingsDialog').addEventListener('cancel',e=>{e.preventDefault();closeSettings()});$('settingsDialog').addEventListener('close',()=>{invalidateImport();renderControls()});
$('help').addEventListener('toggle',()=>{if($('help').open)halt()});
function download(raw,name){
 let url;try{url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);say('ダウンロードを開始しました。保存先を確認してください。');return true}
 catch{if(url)URL.revokeObjectURL(url);say('書き出せませんでした。画面を閉じずにもう一度お試しください。');return false}
}
$('export').onclick=()=>download(C.encode(slotState),'slotten-record.json');
$('backup').onclick=()=>{const raw=S.backup();if(raw===null)say('退避記録はまだありません。');else download(raw,'slotten-before-change.json')};
$('rawExport').onclick=()=>{if(S.baseline===null)say('ブラウザ保存の原データはありません。');else download(S.baseline,'slotten-original-storage.json')};
async function replaceState(next,label,ticket){
 if(ticket!==importEpoch||writing||settling||slotState.pending||S.phase==='conflict')return false;
 const before=JSON.stringify(slotState),memory=!S.locks||S.phase==='unavailable';
 if(!confirm(label+'\n現在のコイン・成績・設定・リールを置き換えます。直前の状態を退避します。'+(memory?'\n保存は使えないため、このタブ内だけに反映します。閉じる前に書き出してください。':'')+'\n続けますか？'))return false;
 const guard=()=>ticket===importEpoch&&before===JSON.stringify(slotState);
 if(!guard())return false;
 stopAuto();stopAudio();cancelAnimation();
 const ok=await apply(next,{replace:true,guard});if(!ok)return false;
 renderMachine();say(memory?'このタブ内の記録を変更しました。閉じる前に書き出してください。':'記録を変更し、保存しました。');
 if(slotState.pending)await settleSpin(false);return true;
}
$('reset').onclick=async()=>{invalidateImport();const ticket=importEpoch;await replaceState(C.blank(),'最初から遊びますか？\n1,000コイン・成績0・最初のマシンに戻します。',ticket)};
$('import').onclick=()=>{invalidateImport();$('fileInput').click()};
$('fileInput').addEventListener('cancel',invalidateImport);
$('fileInput').onchange=async event=>{
 const input=event.target,file=input.files?.[0];invalidateImport();const ticket=importEpoch;
 input.value='';if(!file)return;
 try{
  if(file.size>C.MAX_BYTES*3)throw Error('size');const raw=await file.text();if(ticket!==importEpoch)return;
  let next;try{next=C.decode(raw).state}catch{next=C.decodeBackup(raw)}
  if(ticket!==importEpoch)return;await replaceState(next,'記録を読み込みますか？\n'+next.coins.toLocaleString()+'コイン・'+next.spins.toLocaleString()+'回転・'+MACHINES[next.machine].name,ticket);
 }catch{if(ticket===importEpoch)say('この記録は読み込めません。形式・サイズ・全項目を確認してください。元の記録は変更していません。')}
};
$('retry').onclick=async()=>{if(writing||settling||slotState.pending||S.phase==='conflict')return;invalidateImport();await apply(slotState,{retry:true});say(S.phase==='saved'?'記録を保存しました。':'保存できません。原文を保持しています。状態を確認し、記録を書き出してください。')};
window.addEventListener('blur',halt);window.addEventListener('pagehide',halt);
document.addEventListener('visibilitychange',()=>{if(document.hidden)halt();else renderControls()});
window.addEventListener('pageshow',()=>{halted=true;stopAuto();renderControls();if(slotState.pending&&!writing&&!settling)void settleSpin(false)});
window.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&e.repeat&&e.target?.closest?.('button')){e.preventDefault();return}if(e.key==='Escape'&&!e.repeat){if($('settingsDialog').open)closeSettings();else{halt();say('自動回転を停止しました。回転中の1回は精算します。')}}});
$('returnLink').addEventListener('click',halt);
window.pauseGame=halt;
renderMachine();
if(slotState.pending){halted=true;say('中断した回転を同じ結果で精算します…');void settleSpin(false)}
else if(slotState.last&&slotState.last.machine===slotState.machine)say(slotState.last.payout?'前回の当たり： +'+slotState.last.payout.toLocaleString()+' コイン':'前回の回転は精算済みです。');
