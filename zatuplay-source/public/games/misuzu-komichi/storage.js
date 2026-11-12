/* Local browser-only storage. Web Locks serialize every write; no unsafe lock substitute. */
(() => {
'use strict';
const KEY='zatuplay:misuzu-komichi:v1', BACKUP=KEY+':backup', MAX_BYTES=262144;
const blank=()=>({chapter:0,x:600,y:170,seen:[],favorites:[],notes:{},sound:false,events:[],eventChoices:{},waypoint:null});
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v,min,max)=>Number.isInteger(v)&&number(v,min,max);
function validate(v,legacy=false){
 if(!object(v))throw Error('state');
 const allowed=Object.keys(blank());if(Object.keys(v).some(k=>!allowed.includes(k)))throw Error('unknown field');
 if(legacy)v={events:[],eventChoices:{},waypoint:null,...v};
 if(!integer(v.chapter,0,11)||!number(v.x,30,1170)||!number(v.y,55,1900)||typeof v.sound!=='boolean')throw Error('location/sound');
 const ids=(a,min,max)=>{if(!Array.isArray(a)||a.length>max-min+1||a.some(n=>!integer(n,min,max))||new Set(a).size!==a.length)throw Error('ids');return [...a]};
 const out={chapter:v.chapter,x:v.x,y:v.y,seen:ids(v.seen,1,516),favorites:ids(v.favorites,1,516),notes:{},sound:v.sound,events:ids(v.events,0,35),eventChoices:{},waypoint:v.waypoint};
 if(v.waypoint!==null&&!integer(v.waypoint,1,516))throw Error('waypoint');
 for(const key of ['notes','eventChoices']){
  if(!object(v[key])||Object.keys(v[key]).length>(key==='notes'?516:36))throw Error(key);
  for(const [id,value] of Object.entries(v[key])){
   if(!/^(0|[1-9]\d*)$/.test(id))throw Error('id key');
   if(key==='notes'){if(!out.seen.includes(+id)||!['旅人','小さな生き物','風'].includes(value))throw Error('reflection');}
   else if(!out.events.includes(+id)||!integer(value,0,1))throw Error('choice');
   out[key][id]=value;
  }
 }
 if(out.events.some(id=>!Object.hasOwn(out.eventChoices,id)))throw Error('missing choice');
 return out;
}
function decode(raw,importing=false){
 if(typeof raw!=='string'||raw.length>MAX_BYTES)throw Error('size');
 const d=JSON.parse(raw);if(!object(d))throw Error('format');
 if(d.format==='zatuplay-misuzu-komichi'&&d.version===1&&integer(d.revision,0,Number.MAX_SAFE_INTEGER))return {state:validate(d.state),revision:d.revision};
 if(importing&&d.format==='misuzu-v1')return {state:validate(d.state,true),revision:0};
 throw Error('format');
}
const encode=(state,revision=0)=>JSON.stringify({format:'zatuplay-misuzu-komichi',version:1,revision,savedAt:new Date().toISOString(),state:validate(state)},null,2);
let baseline=null,initialState=blank(),phase='ready',revision=0,listener=()=>{},tail=Promise.resolve(),memoryBackup=null,protectedRaw=false;
const locks=!!navigator.locks?.request;
try{baseline=localStorage.getItem(KEY);if(baseline!==null){const d=decode(baseline);initialState=d.state;revision=d.revision;}}
catch(e){phase=baseline===null?'unavailable':'corrupt';protectedRaw=baseline!==null;}
if(!locks&&phase==='ready')phase='unsupported';
function report(p){phase=p;listener(p)}
function commit(state,options={}){
 let clean;try{clean=validate(state)}catch{report('invalid');return Promise.resolve(false)}
 const work=async()=>{
  if(!locks){report('unsupported');return false}
  if(!options.replace&&protectedRaw){report('corrupt');return false}
  if(['conflict','unavailable'].includes(phase)){listener(phase);return false}
  try{return await navigator.locks.request(KEY+':writer',{mode:'exclusive'},()=>{
   if(options.shouldContinue&&!options.shouldContinue()){return false}
   const current=localStorage.getItem(KEY);if(current!==baseline){report('conflict');return false}
   if(options.replace){
    // Preserve the original raw bytes, including corrupt or future-version saves.
    const backup=JSON.stringify({format:'zatuplay-misuzu-komichi-backup',version:1,createdAt:new Date().toISOString(),raw:current,memory:options.previous});
    localStorage.setItem(BACKUP,backup);memoryBackup=backup;
   }
   const next=encode(clean,revision+1);
   localStorage.setItem(KEY,next);baseline=next;revision++;protectedRaw=false;report('saved');return true;
  })}catch(e){report(e?.name==='QuotaExceededError'?'quota':'unavailable');return false}
 };
 const result=tail.then(work);tail=result.catch(()=>{});return result;
}
window.addEventListener('storage',e=>{if((e.key===KEY||e.key===null)&&e.newValue!==baseline)report('conflict')});
window.MisuzuStore={KEY,BACKUP,MAX_BYTES,blank,validate,decode,encode,commit,initialState,
 get phase(){return phase},get baseline(){return baseline},get locks(){return locks},
 subscribe(fn){listener=fn;fn(phase)},flush(){return tail},
 backup(){if(memoryBackup)return memoryBackup;try{return localStorage.getItem(BACKUP)}catch{return null}},
 rememberBackup(state){memoryBackup=JSON.stringify({format:'zatuplay-misuzu-komichi-backup',version:1,createdAt:new Date().toISOString(),raw:baseline,memory:validate(state)})},
 decodeBackup(raw){if(typeof raw!=='string'||raw.length>MAX_BYTES*3)throw Error('size');const d=JSON.parse(raw);if(d.format!=='zatuplay-misuzu-komichi-backup'||d.version!==1)throw Error('backup');return validate(d.memory)},
 retry(){if(phase==='quota'||phase==='invalid')report('ready')}
};
})();
