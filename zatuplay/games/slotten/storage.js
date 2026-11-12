/* Browser namespace only: never reads/writes the APK's `slotten` key. */
'use strict';
(() => {
 const C=SlotTenCore,KEY='zatuplay:slotten:v1',BACKUP=KEY+':backup',LOCK=KEY+':writer';
 let baseline=null,revision=0,initial=C.blank(),phase='ready',protectedRaw=false,memoryBackup=null,tail=Promise.resolve();
 let listener=()=>{};
 const locks=!!navigator.locks?.request;
 try{baseline=localStorage.getItem(KEY);if(baseline!==null){const d=C.decode(baseline);initial=d.state;revision=d.revision}}
 catch{phase=baseline===null?'unavailable':'corrupt';protectedRaw=baseline!==null}
 if(!locks&&phase==='ready')phase='unsupported';
 const report=p=>{phase=p;listener(p)};
 function commit(state,{replace=false,previous=null,guard=()=>true,retry=false}={}){
  let next;try{next=C.validate(state)}catch{return Promise.resolve('invalid')}
  const work=async()=>{
   if(!guard())return 'cancelled';
   if(!locks)return 'memory';
   if(phase==='conflict')return 'conflict';
   if(protectedRaw&&!replace){report('corrupt');return 'memory'}
   if(['unavailable','quota'].includes(phase)&&!retry&&!replace)return 'memory';
   try{return await navigator.locks.request(LOCK,{mode:'exclusive'},()=>{
    if(!guard())return 'cancelled';
    if(phase==='conflict')return 'conflict';
    const current=localStorage.getItem(KEY);if(current!==baseline){report('conflict');return 'conflict'}
    // Atomic setItem stores debit, records and selected result together. A failed write
    // preserves the preceding snapshot, including any unsettled result.
    const encoded=C.encode(next,revision+1);
    if(replace){const b=C.backup(current,previous);localStorage.setItem(BACKUP,b);memoryBackup=b}
    localStorage.setItem(KEY,encoded);baseline=encoded;revision++;protectedRaw=false;report('saved');return 'saved';
   })}catch(e){if(['original too large','backup too large'].includes(e?.message))return 'blocked';report(e?.name==='QuotaExceededError'?'quota':'unavailable');return 'failed'}
  };
  const result=tail.then(work);tail=result.catch(()=>{});return result;
 }
 window.addEventListener('storage',e=>{if((e.key===KEY||e.key===null)&&e.newValue!==baseline)report('conflict')});
 window.SlotTenStore={KEY,BACKUP,initial,commit,get phase(){return phase},get baseline(){return baseline},get locks(){return locks},subscribe(fn){listener=fn;fn(phase)},flush(){return tail},
  memoryReplacement(previous){memoryBackup=C.backup(baseline,previous)},
  backup(){if(memoryBackup!==null)return memoryBackup;try{return localStorage.getItem(BACKUP)}catch{return null}}
 };
})();
