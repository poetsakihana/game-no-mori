/* ZatuPlay browser compatibility, no Android data migration. */
(function(){
'use strict';
StorageManager.webStorageKey=function(id){return 'zatuplay-mokumoku-v1-'+(id<0?'config':id===0?'global':'save-'+id)};
var style=document.createElement('style');style.textContent='#zatu-tools{position:fixed;z-index:99;top:0;left:0;right:0;background:#172c27e8;color:white;font:12px sans-serif;padding:5px;display:flex;gap:12px;align-items:center}#zatu-tools a{color:#baffdb}#zatu-pad{position:fixed;z-index:99;bottom:8px;left:8px;right:8px;display:flex;justify-content:space-between;pointer-events:none}#zatu-pad div{display:flex;gap:5px}#zatu-pad button{pointer-events:auto;touch-action:none;border:1px solid #bbd6c7;border-radius:10px;background:#193e35cf;color:white;min-width:44px;height:44px;font-size:18px}';document.head.appendChild(style);
var bar=document.createElement('nav');bar.id='zatu-tools';bar.innerHTML='<a href="../../">← ZatuPlay</a><span>もくもく探検隊 · ブラウザ版</span><details><summary>操作・保存</summary>矢印：移動 / Enter：決定 / Esc：メニュー・戻る。画面ボタンでも操作できます。メニューからセーブしてください。保存はこのブラウザ内のみでAPKと共有しません。</details>';document.body.appendChild(bar);
var pad=document.createElement('div');pad.id='zatu-pad';pad.innerHTML='<div><button data-key="left" aria-label="左">◀</button><button data-key="up" aria-label="上">▲</button><button data-key="down" aria-label="下">▼</button><button data-key="right" aria-label="右">▶</button></div><div><button data-key="escape" aria-label="メニュー・戻る">戻る</button><button data-key="ok" aria-label="決定">決定</button></div>';document.body.appendChild(pad);
var presses=Object.create(null),oldUpdate=Input.update;
Input.update=function(){oldUpdate.call(this);Object.keys(presses).forEach(function(key){var p=presses[key];p.frames++;if(p.release&&p.frames>=2){Input._currentState[key]=false;delete presses[key]}})};
function clearPad(){presses=Object.create(null);Input.clear()}
pad.querySelectorAll('button').forEach(function(b){
 b.addEventListener('pointerdown',function(e){e.preventDefault();b.setPointerCapture(e.pointerId);var key=b.dataset.key;presses[key]={frames:0,release:false};Input._currentState[key]=true});
 ['pointerup','pointercancel','lostpointercapture'].forEach(function(t){b.addEventListener(t,function(e){e.preventDefault();var key=b.dataset.key;if(presses[key])presses[key].release=true;else Input._currentState[key]=false})});
 b.addEventListener('click',function(e){if(e.detail===0){var key=b.dataset.key;presses[key]={frames:0,release:true};Input._currentState[key]=true}});
});
window.addEventListener('blur',function(){clearPad()});document.addEventListener('visibilitychange',function(){if(document.hidden)clearPad()});
})();
