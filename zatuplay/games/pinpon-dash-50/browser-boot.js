'use strict';
(async () => {
 const key='zatuplay-pinpon-dash-50-web-v1';
 const status=document.getElementById('save-status');
 let raw, data, stopped=false;
 const valid=(d)=>d && d.version===1 && Number.isInteger(d.partySize) && d.partySize>=1 && d.partySize<=4 && Number.isInteger(d.stageIndex) && d.stageIndex>=0 && d.stageIndex<50 && typeof d.sound==='boolean' && Array.isArray(d.team) && (d.team.length===0 || d.team.length===d.partySize) && d.team.every((r,i)=>r.id===i+1 && typeof r.caught==='boolean' && ['rings','visited','maxSpeed','breaks','cleared'].every(k=>Number.isSafeInteger(r[k]) && r[k]>=0) && r.cleared<=50) && (!d.team.length || d.team.some(r=>!r.caught));
 function halt(message) {
  if(stopped)return; stopped=true;
  const cover=document.createElement('section');cover.setAttribute('role','alert');
  Object.assign(cover.style,{position:'fixed',inset:'0',background:'#171424',color:'white',zIndex:'9999',padding:'8vw',overflow:'auto'});
  const text=document.createElement('p');text.textContent=message+' 保存データを上書きせず停止しました。ほかのタブを閉じて再読み込みしてください。';cover.append(text);
  const back=document.createElement('a');back.href='../../browser/';back.textContent='ZatuPlayへ戻る';back.style.color='#e7ff86';cover.append(back);
  if(raw!==null && raw!==undefined){const button=document.createElement('button');button.textContent='現在の保存データを退避';button.onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.download='pinpon-save-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};cover.append(button);}
  document.body.append(cover);
 }
 function write(value) {
  if(stopped)throw new Error('保存停止中');
  try {if(!valid(value))throw new Error('保存形式が不正です'); if(localStorage.getItem(key)!==raw)throw new Error('別の画面で保存が変更されました');
   const next=JSON.stringify(value);localStorage.setItem(key,next);raw=next;data=JSON.parse(next);window.PortSave.data=data;status.textContent='保存済み：ステージ '+(data.stageIndex+1)+' の開始時点';
  }catch(e){halt(e.message);throw e;}
 }
 async function start() {
  try{raw=localStorage.getItem(key);data=raw===null?null:JSON.parse(raw);if(raw!==null&&!valid(data))throw new Error('保存データを確認できません');}
  catch(e){halt('保存データの読み込みに失敗しました。');return;}
  window.PortSave={data,write,settings(sound){write(data?{...data,sound}:{version:1,partySize:1,stageIndex:0,team:[],sound});}};
  window.addEventListener('storage',e=>{if((e.key===key || e.key===null) && e.newValue!==raw)halt('別の画面で保存が変更されました。');});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  const script=document.createElement('script');script.src='game.js?v=1.0.0-web.1';script.onerror=()=>halt('ゲームの読み込みに失敗しました。');document.body.append(script);
 }
 if(!navigator.locks){halt('このブラウザは安全な同時保存に対応していません。Chromeなどの最新版をご利用ください。');return;}
 await navigator.locks.request(key,{ifAvailable:true},async lock=>{if(!lock){halt('このゲームは別のタブで開いています。');return;}await start();await new Promise(resolve=>window.addEventListener('pagehide',resolve,{once:true}));});
})();
