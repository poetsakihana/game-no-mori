/* Isolated trial. Existing v1 key/schema; no automatic migration. */
(()=>{'use strict';
const KEY='black-sensei-4-v1',BACK=KEY+'.before-change', $=id=>document.getElementById(id);
let alive=true,owned=false,blocked=true,expected=null,initial=null,release;
function validate(o){
 if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!['unlocked','stars','scores'].includes(k)))throw Error('保存形式が違います');
 if(!Number.isInteger(o.unlocked)||o.unlocked<0||o.unlocked>249)throw Error('開放面が不正です');
 for(const field of ['stars','scores']){const map=o[field];if(!map||typeof map!=='object'||Array.isArray(map)||Object.keys(map).length>250)throw Error('記録が不正です');for(const [key,v] of Object.entries(map)){if(!/^(0|[1-9]\d*)$/.test(key)||+key>249||!Number.isFinite(v)||!Number.isInteger(v)||v<(field==='stars'?1:0)||v>(field==='stars'?3:Number.MAX_SAFE_INTEGER))throw Error('面の記録が不正です');}}
 return JSON.parse(JSON.stringify(o));
}
const fresh=()=>({unlocked:0,stars:{},scores:{}});
function parse(raw){if(typeof raw!=='string'||raw.length>200000)throw Error('JSONが空か大きすぎます');return validate(JSON.parse(raw));}
function status(msg){$('portStatus').textContent=msg;}
function halt(msg){blocked=true;try{window.stopBlackSensei?.();}catch(e){}status(msg);}
function check(){if(!owned)throw Error('このタブは保存権限を持っていません');if(localStorage.getItem(KEY)!==expected)throw Error('別タブの変更を検出しました');}
function write(o){if(blocked)throw Error('保存は停止中です');try{check();const raw=JSON.stringify(validate(o));localStorage.setItem(KEY,raw);if(localStorage.getItem(KEY)!==raw)throw Error('保存確認に失敗しました');expected=raw;status('自動保存済み');return true;}catch(e){halt(e.message+'。上書きを停止しました。現在の記録を回収してください。');throw e;}}
function download(raw,name){if(raw===null){status('回収する保存がありません');return;}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function replace(o,label){const next=validate(o);if(!owned){status('別タブを閉じて再読み込みしてください');return false;}if(!confirm(label+'。現在の保存原文を直前バックアップへ退避して置き換えます。以前の直前バックアップは更新されます。よろしいですか？'))return false;
 try{check();halt('記録を置き換えています');if(expected!==null){localStorage.setItem(BACK,expected);if(localStorage.getItem(BACK)!==expected)throw Error('退避の読戻しに失敗しました');}check();const raw=JSON.stringify(next);localStorage.setItem(KEY,raw);if(localStorage.getItem(KEY)!==raw)throw Error('書込の読戻しに失敗しました');expected=raw;location.reload();return true;}catch(e){halt(e.message+'。置換を中止しました。原文を回収してください。');return false;}}
window.BlackSave={validate,parse,fresh,read:()=>validate(initial),write,active:()=>owned&&!blocked,replace};
$('portExport').onclick=()=>{try{download(window.blackSensei?.saveSnapshot?JSON.stringify(window.blackSensei.saveSnapshot()):expected,'black-sensei-4-current.json');}catch(e){status(e.message);}};
$('portRaw').onclick=()=>{try{download(localStorage.getItem(KEY),'black-sensei-4-disk.json');}catch(e){status(e.message);}};
$('portPrevious').onclick=()=>{try{const raw=localStorage.getItem(BACK);if(raw===null){status('直前バックアップはありません');return;}$('portJSON').value=raw;status('直前原文を入力欄へ読み込みました。復元には確認が必要です');}catch(e){status(e.message);}};
$('portRestore').onclick=()=>{try{replace(parse($('portJSON').value),'入力JSONを復元します');}catch(e){status(e.message);}};
$('portReset').onclick=()=>replace(fresh(),'全250面の記録を初期化します');
$('portFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>200000)throw Error('ファイルが大きすぎます');$('portJSON').value=await file.text();status('JSONを入力欄へ読み込みました。内容を確認して復元してください');}catch(e){status(e.message);}};
for(const type of ['click','pointerdown','keydown'])document.addEventListener(type,e=>{if(!window.BlackSave.active()&&!e.target.closest?.('#saveTools')){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null)halt('別タブの変更を検出しました。上書き停止。現在の記録を回収し、他のタブを閉じて再読み込みしてください');});
window.addEventListener('pagehide',()=>{alive=false;halt('ページを離れたため停止しました');owned=false;release?.();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
async function boot(){try{expected=localStorage.getItem(KEY);initial=expected===null?fresh():parse(expected);blocked=false;status('保存保護中。開始時の自動書込みはありません');const s=document.createElement('script');s.src='game.bundle.js?v=99a3295903d1';s.onerror=()=>halt('ゲーム読込に失敗しました');document.body.appendChild(s);}catch(e){halt(e.message+'。元データは上書きしていません。原文回収・確認付き復元・初期化が利用できます');}}
if(!navigator.locks){halt('安全な保存ロックを利用できない環境です。別の対応ブラウザで開いてください');return;}
navigator.locks.request(KEY,{ifAvailable:true},async lock=>{if(!alive)return;if(!lock){halt('別タブで開いています。他のタブを閉じて再読み込みしてください');return;}owned=true;const lifetime=new Promise(r=>release=r);try{await boot();await lifetime;}finally{owned=false;blocked=true;}}).catch(e=>halt('保存ロック失敗: '+e.message));
})();
