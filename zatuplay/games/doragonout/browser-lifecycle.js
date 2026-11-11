// Browser lifecycle only. No Android file bridge or extra PWA registration.
(()=>{
 const contexts=new Set(),resumeContexts=new Set(),resumeVideos=new Set();let paused=false,epoch=0;
 for(const key of ['AudioContext','webkitAudioContext']){
  const Original=window[key];if(!Original)continue;
  window[key]=new Proxy(Original,{construct(target,args){const c=Reflect.construct(target,args);contexts.add(c);return c;}});
 }
 async function pause(){
  if(paused)return;paused=true;epoch++;
  for(const v of document.querySelectorAll('video'))if(!v.paused){resumeVideos.add(v);v.pause();}
  for(const c of contexts)if(c.state==='running'||resumeContexts.has(c)){resumeContexts.add(c);c.suspend().catch(()=>{});}
  try{await window.DoragonGameAndroid?.pause?.();}catch(e){console.warn('保存・一時停止を完了できませんでした',e);}
 }
 function resume(){
  if(document.hidden)return;paused=false;const current=++epoch;
  window.DoragonGameAndroid?.resume?.();
  for(const c of resumeContexts){if(c.state==='closed'){resumeContexts.delete(c);continue;}c.resume().then(()=>{if(current===epoch&&!paused)resumeContexts.delete(c);}).catch(()=>{});}
  for(const v of resumeVideos){if(v.isConnected)v.play().then(()=>{if(current===epoch&&!paused)resumeVideos.delete(v);}).catch(()=>{});else resumeVideos.delete(v);}
 }
 document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
 window.addEventListener('pagehide',pause);
 window.addEventListener('pageshow',e=>{if(e.persisted)resume();});
 document.addEventListener('pointerdown',()=>{if(!document.hidden)resume();},{passive:true});
})();
