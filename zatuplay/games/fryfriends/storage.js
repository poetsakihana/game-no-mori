/* Browser-only save. Every durable write uses Web Locks and compares the original bytes. */
(() => {
'use strict';
const KEY='zatuplay:fryfriends:v1', BACKUP=KEY+':backup', MAX_BYTES=65536;
const blank=()=>({stars:{},best:{},coins:0,seen:[],endless:0,sound:false,screen:'home',attempt:null});
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function shape(v,keys){if(!object(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))throw Error('fields')}
function legalBoard(board){
 if(!Array.isArray(board)||board.length!==36||board.some(t=>!integer(t,0,6)))return false;
 const adj=(a,b)=>a!==b&&Math.abs(a%6-b%6)<=1&&Math.abs(Math.floor(a/6)-Math.floor(b/6))<=1;
 for(let b=0;b<36;b++){let n=0;for(let a=0;a<36;a++)if(board[a]===board[b]&&adj(a,b)&&++n===2)return true}return false;
}
function validate(v){
 shape(v,Object.keys(blank()));
 if(!object(v.stars)||!object(v.best)||!integer(v.coins,0,1e12)||(!integer(v.endless,0,367200)||v.endless%10!==0)||typeof v.sound!=='boolean'||!['home','game'].includes(v.screen))throw Error('progress');
 const out=blank();out.coins=v.coins;out.endless=v.endless;out.sound=v.sound;out.screen=v.screen;
 for(const [id,n] of Object.entries(v.stars)){if(!/^(?:[1-9]|1[0-5])$/.test(id)||!integer(n,1,3))throw Error('stars');out.stars[id]=n}
 for(const [id,n] of Object.entries(v.best)){if(!Object.hasOwn(out.stars,id))throw Error('best id');const c=chapters[+id-1],minimum=c.chainGoal?150*c.target:c.type<0?c.target:10*c.target;if(!integer(n,minimum,12240*c.moves)||n%10!==0)throw Error('best');out.best[id]=n}
 if(Object.keys(out.best).length!==Object.keys(out.stars).length)throw Error('missing record');
 for(let id=2;id<=15;id++)if(out.stars[id]&&!out.stars[id-1])throw Error('unlock');
 if(!Array.isArray(v.seen)||v.seen.length>7||v.seen.some(n=>!integer(n,0,6))||new Set(v.seen).size!==v.seen.length)throw Error('seen');out.seen=[...v.seen];
 if(v.coins<Object.values(v.stars).reduce((a,b)=>a+b,0)*20)throw Error('reward');
 if(v.attempt!==null){
  const a=v.attempt;shape(a,['index','board','moves','score','count','typeCounts','chains','helps','done','result']);
  if(!integer(a.index,-1,14)||(a.index>0&&!out.stars[a.index]))throw Error('stage');
  const c=a.index<0?{moves:30,type:-1}:chapters[a.index],spent=c.moves-a.moves;
  if(!legalBoard(a.board)||!integer(a.moves,0,c.moves)||!integer(a.score,0,12240*spent)||a.score%10!==0||a.score<30*spent||!integer(a.helps,0,3)||typeof a.done!=='boolean')throw Error('attempt');
  if(!Array.isArray(a.typeCounts)||a.typeCounts.length!==7||a.typeCounts.some(n=>!integer(n,0,36*spent)))throw Error('counts');
  const total=a.typeCounts.reduce((a,b)=>a+b,0);
  if(total<3*spent||total>36*spent||a.typeCounts.some((n,i)=>n===1||n===2||(n>0&&!out.seen.includes(i)))||a.count!==(c.type<0?0:a.typeCounts[c.type]))throw Error('count coherence');
  const excessLong=Math.max(0,total-5*spent),minimumLongCoins=excessLong+5*Math.ceil(excessLong/31);if(out.coins<Object.values(out.stars).reduce((a,b)=>a+b,0)*20+minimumLongCoins)throw Error('chain coins');
  if(spent){const low=Math.floor(total/spent),extra=total%spent,minSquares=(spent-extra)*low*low+extra*(low+1)*(low+1),excess=total-3*spent,full=Math.floor(excess/33),rest=excess%33,maxSquares=full*1296+(rest?Math.pow(rest+3,2):0)+(spent-full-(rest?1:0))*9;if(a.score<10*(minSquares-2*total)||a.score>10*(maxSquares-2*total)||(a.score/10-total)%2!==0)throw Error('score coherence')}
  if(!integer(a.chains,0,c.chainGoal?spent:0)||(c.chainGoal&&a.chains*5>total))throw Error('chains');
  const win=a.index>=0&&(c.chainGoal?a.chains:c.type<0?a.score:a.count)>=c.target;
  if(a.done!==(win||a.moves===0))throw Error('terminal');
  if(a.done){
   shape(a.result,['win','stars','bonus']);
   const stars=win?(a.moves>=9?3:a.moves>=5?2:1):0;
   if(a.result.win!==win||a.result.stars!==stars||!integer(a.result.bonus,0,stars*20)||a.result.bonus%20!==0)throw Error('result');
   if(win&&((out.stars[c.id]||0)<stars||(out.best[c.id]||0)<a.score))throw Error('awarded result');
   if(a.index<0&&out.endless<a.score)throw Error('endless result');
  }else if(a.result!==null)throw Error('live result');
  out.attempt={index:a.index,board:[...a.board],moves:a.moves,score:a.score,count:a.count,typeCounts:[...a.typeCounts],chains:a.chains,helps:a.helps,done:a.done,result:a.result?{...a.result}:null};
 }else if(v.screen==='game')throw Error('missing game');
 return out;
}
function decode(raw){
 if(typeof raw!=='string'||raw.length>MAX_BYTES)throw Error('size');
 const d=JSON.parse(raw);shape(d,['format','version','revision','savedAt','state']);
 if(d.format!=='zatuplay-fryfriends'||d.version!==1||!integer(d.revision,0,Number.MAX_SAFE_INTEGER-1)||typeof d.savedAt!=='string'||d.savedAt.length>40||!Number.isFinite(Date.parse(d.savedAt)))throw Error('format');
 return {state:validate(d.state),revision:d.revision};
}
const encode=(state,revision=0)=>JSON.stringify({format:'zatuplay-fryfriends',version:1,revision,savedAt:new Date().toISOString(),state:validate(state)},null,2);
let baseline=null,initialState=blank(),phase='ready',revision=0,listener=()=>{},tail=Promise.resolve(),memoryBackup=null,protectedRaw=false;
const locks=!!navigator.locks?.request;
try{baseline=localStorage.getItem(KEY);if(baseline!==null){const d=decode(baseline);initialState=d.state;revision=d.revision}}
catch{phase=baseline===null?'unavailable':'corrupt';protectedRaw=baseline!==null}
if(!locks&&phase==='ready')phase='unsupported';
function report(p){phase=p;listener(p)}
function commit(state,options={}){
 let clean;try{clean=validate(state);if(options.replace)validate(options.previous)}catch{report('invalid');return Promise.resolve(false)}
 const work=async()=>{
  if(!locks){report('unsupported');return false}
  if(!options.replace&&protectedRaw){report('corrupt');return false}
  if(['conflict','unavailable'].includes(phase)){listener(phase);return false}
  try{return await navigator.locks.request(KEY+':writer',{mode:'exclusive'},()=>{
   if(options.shouldContinue&&!options.shouldContinue())return false;
   const current=localStorage.getItem(KEY);if(current!==baseline){report('conflict');return false}
   if(options.replace){
    const backup=JSON.stringify({format:'zatuplay-fryfriends-backup',version:1,createdAt:new Date().toISOString(),raw:current,memory:validate(options.previous)});
    localStorage.setItem(BACKUP,backup);memoryBackup=backup;
   }
   const next=encode(clean,revision+1);localStorage.setItem(KEY,next);baseline=next;revision++;protectedRaw=false;report('saved');return true;
  })}catch(e){report(e?.name==='QuotaExceededError'?'quota':'unavailable');return false}
 };
 const result=tail.then(work);tail=result.catch(()=>{});return result;
}
function backup(){if(memoryBackup)return memoryBackup;try{return localStorage.getItem(BACKUP)}catch{return null}}
function backupEnvelope(raw,external=true){
 // File imports stay bounded. Stored backups were already materialized by this
 // origin's storage API and may contain large, escaped corrupt raw strings.
 // Recovery export validates and emits only the small complete game state.
 if(typeof raw!=='string'||(external&&raw.length>MAX_BYTES*3))throw Error('size');
 const d=JSON.parse(raw);shape(d,['format','version','createdAt','raw','memory']);
 if(d.format!=='zatuplay-fryfriends-backup'||d.version!==1||(d.raw!==null&&typeof d.raw!=='string')||typeof d.createdAt!=='string')throw Error('backup');
 return d;
}
window.addEventListener('storage',e=>{if((e.key===KEY||e.key===null)&&e.newValue!==baseline)report('conflict')});
window.FryStore={KEY,BACKUP,MAX_BYTES,blank,validate,decode,encode,commit,initialState,legalBoard,
 get phase(){return phase},get baseline(){return baseline},get locks(){return locks},
 subscribe(fn){listener=fn;fn(phase)},flush(){return tail},
 backup,
 backupRecovery(){const raw=backup();return raw?encode(validate(backupEnvelope(raw,false).memory)):null},
 backupRaw(){const raw=backup();return raw?backupEnvelope(raw,false).raw:null},
 rememberBackup(state){memoryBackup=JSON.stringify({format:'zatuplay-fryfriends-backup',version:1,createdAt:new Date().toISOString(),raw:baseline,memory:validate(state)})},
 decodeBackup(raw){return validate(backupEnvelope(raw).memory)},
 retry(){if(phase==='quota'||phase==='invalid')report('ready')}
};
})();
