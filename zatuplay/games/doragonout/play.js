import {resolveSkinURL} from './skin.js';
import {allSaves,putSave,getSave} from './vault.js';
import {fingerprint,parseSave} from './save-codec.js';
const canvas=document.getElementById('canvas'),status=document.getElementById('status'),indicator=document.getElementById('save-indicator');
const query=new URLSearchParams(location.search),disk=Number(query.get('game')?.replace('disk',''));
let launch;try{launch=JSON.parse(sessionStorage.getItem('zatuplay-doragonout-launch')||'null');}catch{launch=null;}
let player,scanTask=null,scanAgain=false,started=false;const hashes=new Map(),keys=new Set;
const send=(type,extra={})=>parent.postMessage({type,...extra},location.origin);
function error(e){status.textContent='読み込みを完了できませんでした。冒険の記録に戻って再度お試しください。';send('error',{message:e.message||String(e)});console.error(e);}
function key(type,code){const codes={Enter:13,Escape:27,ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39,ShiftLeft:16,KeyF:70};const e=new KeyboardEvent(type,{bubbles:true,cancelable:true,code,key:code==='ShiftLeft'?'Shift':code==='KeyF'?'f':code,keyCode:codes[code]||0,which:codes[code]||0});canvas.dispatchEvent(e);if(type==='keydown')keys.add(code);else keys.delete(code);}
const heldPointers=new Map(),releaseTimers=new Map();
function press(code){clearTimeout(releaseTimers.get(code));releaseTimers.delete(code);if(!keys.has(code))key('keydown',code);}
function releaseLater(code,delay){clearTimeout(releaseTimers.get(code));releaseTimers.set(code,setTimeout(()=>{releaseTimers.delete(code);if(![...heldPointers.values()].some(h=>h.code===code))key('keyup',code);},delay));}
function release(){for(const timer of releaseTimers.values())clearTimeout(timer);releaseTimers.clear();heldPointers.clear();for(const k of [...keys])key('keyup',k);document.querySelectorAll('.pressed').forEach(n=>n.classList.remove('pressed'));}
function endPointer(id,cancelled=false){const h=heldPointers.get(id);if(!h)return;heldPointers.delete(id);if(![...heldPointers.values()].some(p=>p.b===h.b))h.b.classList.remove('pressed');if(![...heldPointers.values()].some(p=>p.code===h.code))releaseLater(h.code,cancelled?0:Math.max(30,180-(performance.now()-h.time)));}
for(const b of document.querySelectorAll('[data-key]')){
 b.addEventListener('pointerdown',e=>{e.preventDefault();b._lastPointer=Date.now();const code=b.dataset.key;heldPointers.set(e.pointerId,{b,code,time:performance.now()});try{b.setPointerCapture?.(e.pointerId);}catch{}canvas.focus();b.classList.add('pressed');press(code);});
 b.addEventListener('lostpointercapture',e=>endPointer(e.pointerId,true));
 b.addEventListener('click',e=>{if(e.detail>0||Date.now()-(b._lastPointer||0)<500)return;canvas.focus();press(b.dataset.key);releaseLater(b.dataset.key,180);});
}
window.addEventListener('pointerup',e=>endPointer(e.pointerId),true);
window.addEventListener('pointercancel',e=>endPointer(e.pointerId,true),true);

window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden){release();scan();}});window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();});canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.getElementById('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{indicator.textContent='端末を横向きにすると広く表示できます';}};
async function preload(FS){
 const native=FS.cwd()+'/Save';const saved=(await allSaves()).filter(s=>s.disk===disk);
 for(const s of saved){const file=native+`/Save${String(s.slot).padStart(2,'0')}.lsd`;try{parseSave(FS.readFile(file));}catch{parseSave(s.bytes);FS.writeFile(file,s.bytes);}}
 await new Promise((res,rej)=>FS.syncfs(false,e=>e?rej(e):res()));
}
async function scanOnce(){
 let ok=true;
 try{const FS=player.FS,path=FS.cwd()+'/Save';for(const name of FS.readdir(path)){const m=/^Save(\d{2})\.lsd$/i.exec(name);if(!m)continue;const slot=+m[1];if(slot<1||slot>15)continue;try{const bytes=FS.readFile(path+'/'+name),hash=fingerprint(bytes);if(hashes.get(slot)===hash)continue;parseSave(bytes);const old=await getSave(`${disk}:${slot}`);if(!old||old.hash!==hash){await putSave(disk,slot,bytes);indicator.textContent=`枠${slot} のセーブを保存しました`;send('saved');}hashes.set(slot,hash);}catch(e){ok=false;error(Error(`枠${slot} の保存を確認できませんでした。${e.message||e}`));}}await new Promise((res,rej)=>FS.syncfs(false,e=>e?rej(e):res()));}catch(e){ok=false;error(e);}return ok;
}
function scan(){
 if(!player)return Promise.resolve(true);scanAgain=true;if(scanTask)return scanTask;
 scanTask=(async()=>{let ok=true;do{scanAgain=false;if(!await scanOnce())ok=false;}while(scanAgain);return ok;})().finally(()=>{scanTask=null;});return scanTask;
}
async function start(){if(started)return;started=true;document.getElementById('start-overlay').style.display='none';try{
 if(![1,2,3].includes(disk)||!launch||launch.disk!==disk||Date.now()-launch.time>86400000)throw Error('冒険の記録からDiskを選んでください。');
 if(disk>1&&(!launch.slot||!await getSave(`${disk}:${launch.slot}`)))throw Error('このDiskを始めるには引き継ぎセーブが必要です。');
 const script=document.createElement('script');script.src='engine/index.js';await new Promise((res,rej)=>{script.onload=res;script.onerror=()=>rej(Error('ゲームエンジンを読み込めませんでした。'));document.head.append(script);});
 let skinPaths={};if(launch.skin==='remake'){const r=await fetch('remake-skin/manifest.json');if(!r.ok)throw Error('新デザインの画像情報を読み込めませんでした。');skinPaths=(await r.json()).paths;}
 player=await createEasyRpgPlayer({mobileAssetURL:url=>resolveSkinURL(url,skinPaths,location.href),game:`disk${disk}`,mobilePreload:preload,locateFile:p=>'engine/'+p});player.initApi();canvas.focus();setInterval(()=>{if(!scanTask)scan();},2000);setTimeout(scan,1000);
 }catch(e){error(e);}}
document.getElementById('start').onclick=start;
window.addEventListener('message',async e=>{if(e.origin!==location.origin||e.source!==parent)return;const requestId=e.data?.requestId;if(e.data?.type==='scan-saves')send('scan-saves-ready',{requestId,ok:await scan()});if(e.data?.type==='exit'){release();send(await scan()?'exit-ready':'exit-failed',{requestId});}});

window.DoragonGameAndroid={
 async pause(){release();await scan();},resume(){},
 back(){canvas.focus();press('Escape');releaseLater('Escape',180);return true;}
};
