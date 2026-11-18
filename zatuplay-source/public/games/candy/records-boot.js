'use strict';
(()=>{const key=window.RECORD_CONFIG.key;let owned=false;const status=t=>document.getElementById('status').textContent=t;
window.RecordStorage={getItem:k=>localStorage.getItem(k),setItem(k,v){if(!owned)throw Error('保存権がありません。再読込してください。');localStorage.setItem(k,v)}};
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
if(!navigator.locks){status('保存保護に対応したブラウザが必要です。');return;}
navigator.locks.request(key,{ifAvailable:true},async lock=>{if(!lock){status('ゲームまたは記録画面が別のタブで開かれています。閉じて再読込してください。');return;}owned=true;const lifetime=new Promise(resolve=>window.addEventListener('pagehide',()=>{owned=false;resolve();},{once:true}));try{const s=document.createElement('script');s.src='manage-ui.js?v=1.0.0-web.2';s.onerror=()=>status('記録画面を読み込めませんでした。');document.body.append(s);await lifetime;}finally{owned=false;}}).catch(e=>status(e.message));})();
