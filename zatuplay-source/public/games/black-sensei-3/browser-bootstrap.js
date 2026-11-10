(function(){
 'use strict';
 if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{value:function(index){index=Math.trunc(index)||0;if(index<0)index+=this.length;return this[index];},configurable:true,writable:true});
 if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){var radius=Math.min(typeof r==='number'?r:4,Math.abs(w)/2,Math.abs(h)/2);this.moveTo(x+radius,y);this.arcTo(x+w,y,x+w,y+h,radius);this.arcTo(x+w,y+h,x,y+h,radius);this.arcTo(x,y+h,x,y,radius);this.arcTo(x,y,x+w,y,radius);this.closePath();return this;};
 var title=document.getElementById('titleScreen');
 // Controls are visible only while a stage is running or paused.
 function sync(){document.body.classList.toggle('browser-playing',title.classList.contains('hidden')&&['resultScreen','storyScreen','pauseScreen'].every(function(id){return document.getElementById(id).classList.contains('hidden');}));}
 new MutationObserver(sync).observe(title,{attributes:true,attributeFilter:['class']});
 ['resultScreen','storyScreen','pauseScreen'].forEach(function(id){new MutationObserver(sync).observe(document.getElementById(id),{attributes:true,attributeFilter:['class']});});sync();
 window.addEventListener('error',function(event){if(document.getElementById('browserLoadError'))return;var box=document.createElement('div');box.id='browserLoadError';box.style.cssText='position:fixed;inset:0;z-index:9999;background:#111214;color:#f1eadb;display:flex;align-items:center;justify-content:center;flex-direction:column;font:16px sans-serif;padding:24px;text-align:center';var message=document.createElement('p');message.textContent='ゲームを読み込めませんでした。';var retry=document.createElement('button');retry.textContent='もう一度読み込む';retry.style.cssText='padding:14px 24px;background:#ed4c43;color:white;border:0';retry.onclick=function(){location.reload();};box.appendChild(message);box.appendChild(retry);document.body.appendChild(box);});
})();
