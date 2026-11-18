'use strict';
(()=>{
const key='crossroad-save-v1',known=new Set(DATA.stations.map(s=>s.id));let owned=false,stopped=false,raw=null,data=null;
const el=id=>document.getElementById(id),notice=t=>el('save-status').textContent=t;
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v),integer=v=>Number.isSafeInteger(v)&&v>=0;
function validate(s){const validKey=k=>/^\d+(?::[1-9])?$/.test(k)&&known.has(+k.split(':')[0]),stars=c=>plain(c)&&Number.isInteger(c.stars)&&c.stars>=1&&c.stars<=3;
 if(!plain(s)||s.v!==1||!Number.isInteger(s.unlocked)||s.unlocked<1||s.unlocked>47||!integer(s.coins)||s.coins>10000000||!plain(s.cleared)||!plain(s.boards)||typeof s.sound!=='boolean'||!plain(s.daily)||(s.last!==undefined&&!known.has(s.last)))throw Error('形式・版・進行が不正です');
 for(const [id,c] of Object.entries(s.cleared))if(!/^\d+$/.test(id)||!known.has(+id)||!stars(c))throw Error('駅記録が不正です');
 for(const [id,b]of Object.entries(s.boards))if(!validKey(id)||!plain(b)||!plain(b.letters)||!integer(b.hints)||!integer(b.checks)||Object.entries(b.letters).some(([k,v])=>!/^\d+,\d+$/.test(k)||typeof v!=='string'||!/^[ぁ-ゖー]$/.test(v)))throw Error('盤面記録が不正です');
 if(s.roundCleared!==undefined&&(!plain(s.roundCleared)||Object.entries(s.roundCleared).some(([k,v])=>!validKey(k)||!stars(v))))throw Error('問題記録が不正です');
 if(s.lastRound!==undefined&&(!Number.isInteger(s.lastRound)||s.lastRound<0||s.lastRound>9))throw Error('問題番号が不正です');
 if(Object.entries(s.daily).some(([k,v])=>!/^\d{4}-\d{2}-\d{2}$/.test(k)||v!==true))throw Error('日替わり記録が不正です');return s;
}
function decode(text){if(typeof text!=='string'||text.length>16000000)throw Error('大きすぎるデータです');const json=text.startsWith('LZ:')?LZString.decompressFromUTF16(text.slice(3)):text;if(!json||json.length>16000000)throw Error('解凍できません');return validate(JSON.parse(json));}
function halt(t){stopped=true;try{window.crossroadSuspend?.()}catch{};notice(t+' 自動保存と操作を停止しました。原文回収・確認付き復元は上の欄から行えます。');for(const selector of ['header','#app','#nav','#modal']){const n=document.querySelector(selector);if(n)n.inert=true;}}
function write(v){if(stopped||!owned)throw Error('保存停止中');try{validate(v);if(localStorage.getItem(key)!==raw)throw Error('別の画面で記録が変わりました');const next='LZ:'+LZString.compressToUTF16(JSON.stringify(v));localStorage.setItem(key,next);raw=next;data=structuredClone(v);notice('このブラウザに保存しました');}catch(e){halt(e.message);throw e;}}
function fresh(){return {v:1,coins:60,cleared:{},boards:{},unlocked:1,sound:data?.sound??false,daily:{},last:DATA.stations[0].id};}
function replace(v){if(!owned){notice('別のタブを閉じて再読込してください。');return false;}try{validate(v);const before=localStorage.getItem(key);if(!confirm('現在の旅の記録を置き換えますか？変更前の原文を1回分退避します。'))return false;if(localStorage.getItem(key)!==before)throw Error('確認中に記録が変わりました');halt('記録を置換しています。');if(before!==null)localStorage.setItem(key+'.before-change',before);localStorage.setItem(key,'LZ:'+LZString.compressToUTF16(JSON.stringify(v)));location.reload();return true;}catch(e){halt('置換できませんでした：'+e.message);return false;}}
window.CrossroadSave={get data(){return data},get stopped(){return stopped},validate,decode,write,replace,reset:()=>replace(fresh())};
el('save-export').onclick=()=>{try{el('save-json').value=localStorage.getItem(key)??'';notice('保存原文を表示しました。必要な内容をコピーして保管してください。');}catch(e){el('save-json').value=raw??'';notice('読込済みの原文のみ回収しました。');}};
el('save-pending').onclick=()=>{el('save-json').value=JSON.stringify(window.crossroadSnapshot?.()??data,null,2);};
el('save-previous').onclick=()=>{try{el('save-json').value=localStorage.getItem(key+'.before-change')??'';}catch(e){notice('退避データを読み出せません。');}};
el('save-import').onclick=()=>{try{replace(decode(el('save-json').value));}catch(e){notice('復元しませんでした：'+e.message);}};el('save-reset').onclick=()=>replace(fresh());
window.addEventListener('storage',e=>{if(e.key===key||e.key===null)halt('別の画面で保存が変わりました。')});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
const script=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('ゲームを読み込めません'));document.head.append(s)});
if(!navigator.locks){halt('保存保護対応ブラウザが必要です。');return;}
navigator.locks.request(key,{ifAvailable:true},async lock=>{if(!lock){halt('別のタブで開かれています。');return;}owned=true;const lifetime=new Promise(resolve=>window.addEventListener('pagehide',()=>{owned=false;halt('ページを離れたため停止しました。');resolve();},{once:true}));try{try{raw=localStorage.getItem(key);data=raw===null?null:decode(raw);await script('app.js?v=2.0-web.2');if(owned)await script('railway-ui.js?v=2.0-web.2');notice('保存保護が有効です。読込だけでは既存原文を書き換えません。');}catch(e){halt(e.message);}await lifetime;}finally{owned=false;stopped=true;}}).catch(e=>halt(e.message));
})();
