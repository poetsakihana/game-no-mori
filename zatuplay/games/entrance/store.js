'use strict';
// Browser-only record. Never reads the APK's entrance13.settings key.
const EntranceStore=(()=>{
 const KEY='zatuplay:entrance:1',LIMIT=32768,defaults={master:65,ambient:75,sfx:80,bgm:24,sensitivity:50,headbob:true,quality:'normal',mute:false};
 const blank=()=>({settings:{...defaults},checkpoint:null});
 const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');
 const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 function validate(v){
  if(!exact(v,['settings','checkpoint'])||!exact(v.settings,Object.keys(defaults)))throw Error('保存形式が違います。');
  for(const k of ['master','ambient','sfx','bgm'])if(!integer(v.settings[k],0,100))throw Error('音量が不正です。');
  if(!integer(v.settings.sensitivity,20,100)||typeof v.settings.headbob!=='boolean'||typeof v.settings.mute!=='boolean'||!['normal','high'].includes(v.settings.quality))throw Error('設定値が不正です。');
  const c=v.checkpoint;if(c!==null){if(!exact(c,['stage','round','anomaly','seenBag','status'])||!integer(c.stage,1,9)||!integer(c.round,1,1000000)||!integer(c.anomaly,0,30)||!['playing','won','lost'].includes(c.status)||!Array.isArray(c.seenBag)||c.seenBag.length>30||new Set(c.seenBag).size!==c.seenBag.length||c.seenBag.some(x=>!integer(x,1,30))||(c.stage===9&&c.anomaly!==0)||(c.status==='won'&&c.stage!==9))throw Error('通路の記録が不正です。');}
  return JSON.parse(JSON.stringify(v));
 }
 function decode(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).length>LIMIT)throw Error('JSONは32KB以下にしてください。');const v=JSON.parse(raw);if(!exact(v,['format','version','state','previous'])||v.format!=='entrance-browser'||v.version!==1)throw Error('未対応の保存です。');return {state:validate(v.state),previous:v.previous===null?null:validate(v.previous)};}
 const encode=(state,previous=null)=>JSON.stringify({format:'entrance-browser',version:1,state:validate(state),previous:previous===null?null:validate(previous)});
 let state=blank(),previous=null,baseline=null,phase='loading',owner=false,unlock,listener=()=>{};
 const notify=()=>listener(phase),setPhase=p=>{phase=p;notify()};
 try{baseline=localStorage.getItem(KEY);if(baseline!==null){const d=decode(baseline);state=d.state;previous=d.previous;}}catch(e){phase=baseline===null?'unavailable':'corrupt';}
 const initial=JSON.parse(JSON.stringify(state));
 const ready=(async()=>{if(['unavailable','corrupt'].includes(phase)){notify();return;}if(!navigator.locks){setPhase('memory');return;}try{await new Promise(resolve=>{navigator.locks.request(KEY,{mode:'exclusive',ifAvailable:true},async lock=>{if(!lock){setPhase('memory');resolve();return;}owner=true;setPhase('saved');if(JSON.stringify(state)!==JSON.stringify(initial))write(state);resolve();await new Promise(r=>unlock=r);}).catch(()=>{owner=false;setPhase('memory');resolve()})})}catch{setPhase('memory')}})();
 function write(next,{replace=false}={}){next=validate(next);const old=state;state=next;const prior=replace?old:previous;
  if(!owner||!['saved','quota'].includes(phase)){if(replace)previous=old;notify();return false;}
  try{if(localStorage.getItem(KEY)!==baseline){owner=false;previous=prior;setPhase('conflict');return false;}const raw=encode(next,prior);if(new TextEncoder().encode(raw).length>LIMIT)throw Error('size');localStorage.setItem(KEY,raw);baseline=raw;previous=prior;setPhase('saved');return true;}catch(e){previous=prior;setPhase('quota');return false;}
 }
 function release(){owner=false;if(unlock){unlock();unlock=null;}if(phase==='saved')setPhase('memory');}
 addEventListener('storage',e=>{if(e.key===KEY&&e.newValue!==baseline){owner=false;setPhase('conflict')}});
 return {KEY,LIMIT,defaults,blank,validate,decode,encode,initial,ready,write,release,get state(){return validate(state)},get previous(){return previous===null?null:validate(previous)},get raw(){return baseline},get phase(){return phase},subscribe(fn){listener=fn;notify()}};
})();
