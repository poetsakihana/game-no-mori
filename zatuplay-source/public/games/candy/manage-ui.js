'use strict';
const $=id=>document.getElementById(id),cfg=window.RECORD_CONFIG;let manager,snapshot=null,prepared=false;
function notice(s){$('status').textContent=s}
function download(raw,name){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function refresh(){snapshot=manager.inspect();prepared=false;$('confirmed').checked=false;$('apply').disabled=true;$('ending').hidden=!snapshot.data||!cfg.complete(snapshot.data);notice(snapshot.data?'保存記録を確認しました。':'保存記録はありません。')}
try{manager=createRecordManager(window.RecordStorage,cfg.key,cfg.validate,cfg.initial);refresh()}catch(e){notice(e.message);$('prepare').disabled=true;$('recover').disabled=true}
$('raw').onclick=()=>{try{const raw=localStorage.getItem(cfg.key);if(raw===null)throw Error('保存記録がありません');download(raw,cfg.id+'-original.json')}catch(e){notice(e.message)}};
$('previous').onclick=()=>{try{const raw=manager.backupRaw();if(raw===null)throw Error('退避記録がありません');download(raw,cfg.id+'-previous.json')}catch(e){notice(e.message)}};
$('prepare').onclick=()=>{try{snapshot=manager.inspect();if(snapshot.raw===null)throw Error('初期化する記録がありません');download(snapshot.raw,cfg.id+'-before-reset.json');prepared=true;notice('バックアップの保存を確認し、同じゲームのほかのタブをすべて閉じてください。')}catch(e){prepared=false;notice(e.message)}};
$('confirmed').onchange=()=>{$('apply').disabled=!(prepared&&$('confirmed').checked)};
$('apply').onclick=()=>{if(!prepared||!$('confirmed').checked)return;if(!confirm(cfg.scope+' 初期化しますか？この作品だけを対象に直前の記録を退避します。'))return;try{manager.reset(snapshot.raw);refresh();notice('この作品の記録を初期化しました。退避記録は1世代分です。')}catch(e){prepared=false;$('apply').disabled=true;notice(e.message)}};
$('recover').onclick=()=>{try{const current=manager.inspect(),previous=manager.backupRaw();if(!confirm('この作品の記録を直前の退避に戻しますか？現在の記録は退避に入れ替わります。'))return;manager.restore(current.raw,previous);refresh();notice('退避記録へ戻しました。')}catch(e){notice(e.message)}};
window.addEventListener('storage',e=>{if(e.key===cfg.key||e.key===null){prepared=false;$('apply').disabled=true;notice('別画面の変更を検出しました。再読込してください。')}});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
