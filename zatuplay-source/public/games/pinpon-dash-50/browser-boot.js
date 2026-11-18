'use strict';
(async()=>{
 const key='zatuplay-pinpon-dash-50-web-v1',status=document.getElementById('save-status');
 let raw=null,data=null,stopped=false,owned=false,pending=null;
 const valid=d=>d&&d.version===1&&Number.isInteger(d.partySize)&&d.partySize>=1&&d.partySize<=4&&Number.isInteger(d.stageIndex)&&d.stageIndex>=0&&d.stageIndex<50&&typeof d.sound==='boolean'&&Array.isArray(d.team)&&(d.team.length===0||d.team.length===d.partySize)&&d.team.every((r,i)=>r&&r.id===i+1&&typeof r.caught==='boolean'&&['rings','visited','maxSpeed','breaks','cleared'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&r.cleared<=50)&&(!d.team.length||d.team.some(r=>!r.caught))&&(d.completed===undefined||typeof d.completed==='boolean')&&(!d.completed||(d.stageIndex===49&&d.team.some(r=>!r.caught&&r.cleared===50)));
 const decode=text=>{if(typeof text!=='string'||text.length>200000)throw Error('JSONサイズが不正');const v=JSON.parse(text);if(!valid(v))throw Error('保存形式が不正');return v;};
 function halt(message){stopped=true;status.textContent=message+' 上書きせず停止中です。下の回収・復元を利用してください。';window.PinponSuspend?.();}
 function write(value){if(stopped||!owned)throw Error('保存停止中');pending=value;try{if(!valid(value))throw Error('保存形式が不正');if(localStorage.getItem(key)!==raw)throw Error('別のタブで保存が変更されました');const next=JSON.stringify(value);localStorage.setItem(key,next);raw=next;data=JSON.parse(next);pending=null;status.textContent=data.completed?'全50ステージクリア済み。結末を再鑑賞できます。':'保存済み：ステージ '+(data.stageIndex+1)+' の開始時点';}catch(e){halt(e.message);throw e;}}
 function preserve(){if(stopped||!owned)throw Error('保存停止中');try{if(localStorage.getItem(key)!==raw)throw Error('別のタブで変更されています');if(raw!==null)localStorage.setItem(key+'.recovery',raw);}catch(e){halt('変更前のデータを退避できません');throw e;}}
 window.PortSave={get data(){return data},get stopped(){return stopped},get pending(){return pending},write,preserve,settings(sound){write(data?{...data,sound}:{version:1,partySize:1,stageIndex:0,team:[],sound});}};
 const box=document.getElementById('recovery-json');
 document.getElementById('export-save').onclick=()=>{try{box.value=JSON.stringify({format:'pinpon-recovery',primary:localStorage.getItem(key),previous:localStorage.getItem(key+'.recovery')},null,2);}catch(e){box.value=raw||'';status.textContent='保存領域を読み出せません。読込済みの原文のみ表示します。';}};
 document.getElementById('export-current').onclick=()=>{box.value=JSON.stringify(pending||window.PinponSnapshot?.()||data,null,2);};
 function restoreValue(text){if(typeof text!=='string'||text.length>450000)throw Error('JSONサイズが不正');const v=JSON.parse(text);if(v?.format==='pinpon-recovery'){if(typeof v.primary!=='string')throw Error('回収JSONに主保存本文がありません。前回の退避本文を表示して復元してください。');return decode(v.primary);}return decode(text);}
 function replace(reset){if(!owned){status.textContent='別タブを閉じ、このタブを再読込してください。';return;}try{const before=localStorage.getItem(key);let next=reset?{version:1,partySize:1,stageIndex:0,team:[],sound:data?.sound??false}:restoreValue(box.value);if(!confirm(reset?'この作品の進行とクリア記録を初期化しますか？音設定は残ります。変更前データを退避します。':'現在の進行をこのJSONに置き換えますか？変更前データを退避します。'))return;if(localStorage.getItem(key)!==before)throw Error('確認中に保存が変更されました');if(before!==null)localStorage.setItem(key+'.recovery',before);stopped=true;window.PinponSuspend?.();localStorage.setItem(key,JSON.stringify(next));location.reload();}catch(e){halt('変更を完了できません: '+e.message);}}
 document.getElementById('restore-save').onclick=()=>replace(false);document.getElementById('reset-save').onclick=()=>replace(true);
 document.getElementById('use-previous').onclick=()=>{try{box.value=localStorage.getItem(key+'.recovery')||'';}catch(e){halt('退避データを読めません');}};
 window.addEventListener('storage',e=>{if(e.key===key||e.key===null)halt('別の画面で保存が変更されました。');});
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 async function start(){try{raw=localStorage.getItem(key);data=raw===null?null:decode(raw);}catch(e){halt('保存を読み込めません');return;}const script=document.createElement('script');script.src='game.js?v=1.0.0-web.2';script.onerror=()=>halt('ゲームの読み込みに失敗しました');document.body.append(script);status.textContent=data?.completed?'全50ステージクリア済み。結末を再鑑賞できます。':'全50ステージを1人以上が走り抜けると結末が解放されます。';}
 if(!navigator.locks){halt('安全な同時保存に対応したブラウザが必要です');return;}
 try{await navigator.locks.request(key,{ifAvailable:true},async lock=>{if(!lock){halt('別のタブで開かれています');return;}owned=true;try{await start();await new Promise(resolve=>window.addEventListener('pagehide',()=>{owned=false;stopped=true;window.PinponSuspend?.();resolve();},{once:true}));}finally{owned=false;}});}catch(e){halt('保存権の取得に失敗しました');}
})();
