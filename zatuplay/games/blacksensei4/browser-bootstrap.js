(function(){
 'use strict';
 document.body.classList.add('android-app');
 var title=document.getElementById('titleScreen');
 // Controls are visible only while a stage is running or paused.
 function sync(){document.body.classList.toggle('android-playing',title.classList.contains('hidden')&&['resultScreen','storyScreen','pauseScreen'].every(function(id){return document.getElementById(id).classList.contains('hidden');}));}
 new MutationObserver(sync).observe(title,{attributes:true,attributeFilter:['class']});
 ['resultScreen','storyScreen','pauseScreen'].forEach(function(id){new MutationObserver(sync).observe(document.getElementById(id),{attributes:true,attributeFilter:['class']});});sync();
 
 window.addEventListener('error',function(event){if(document.getElementById('nativeLoadError'))return;var box=document.createElement('div');box.id='nativeLoadError';box.style.cssText='position:fixed;inset:0;z-index:9999;background:#111214;color:#f1eadb;display:flex;align-items:center;justify-content:center;flex-direction:column;font:16px sans-serif;padding:24px;text-align:center';var message=document.createElement('p');message.textContent='ゲームを読み込めませんでした。';var retry=document.createElement('button');retry.textContent='もう一度読み込む';retry.style.cssText='padding:14px 24px;background:#ed4c43;color:white;border:0';retry.onclick=function(){location.reload();};box.appendChild(message);box.appendChild(retry);document.body.appendChild(box);});
})();
