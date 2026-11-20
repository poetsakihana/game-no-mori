(() => {
  'use strict';
  const SLOT='resetRecovery', LEGACY='sakihana-poem-game-v1', CURRENT='sakihana-poem-game-v2';
  const phases=['tutorial','event','hub','stageMenu','stageStory','adventure','festivalPlay','questEvent','dailyEvent','library','progression','rewardPending','ending','seasonMenu','seasonalStory','seasonalPlay','seasonalResult','characterMenu','towerMenu','guideOffer'];
  function valid(value){
    return value&&typeof value==='object'&&!Array.isArray(value)&&
      phases.includes(value.phase)&&Number.isInteger(value.wave)&&value.wave>=0&&value.wave<=(value.saveVersion>=6?100:5)&&
      Number.isInteger(value.poems)&&value.poems>=0&&value.poems<=3&&
      (value.saveVersion===undefined||(Number.isInteger(value.saveVersion)&&value.saveVersion>=1&&value.saveVersion<=11));
  }
  function unpack(raw){
    if(raw===null)return {active:null,backup:null};
    const { [SLOT]:backup=null, ...active }=JSON.parse(raw);
    if(!valid(active)||(backup!==null&&(!valid(backup)||Object.hasOwn(backup,SLOT))))throw Error('invalid record');
    return {active,backup};
  }
  function read(storage){const current=storage.getItem(CURRENT);return current!==null?{key:CURRENT,raw:current}:{key:LEGACY,raw:storage.getItem(LEGACY)};}
  function same(a,b){return a?.key===b?.key&&a?.raw===b?.raw;}
  function present(storage,expected){
    try{
      const current=read(storage);
      if(!same(current,expected))return {ok:false,reason:'conflict'};
      const {active,backup}=unpack(current.raw);
      return {ok:true,hasRecord:!!active,hasBackup:!!backup,wave:active?.wave||0,backupWave:backup?.wave||0};
    }catch{return {ok:false,reason:'read'};}
  }
  function commit(storage,expected,op,snapshot=null){
    try{
      const current=read(storage);
      if(!same(current,expected))return {ok:false,reason:'conflict'};
      const old=unpack(current.raw);
      let active, backup;
      if(op==='reset'){
        if(!old.active)return {ok:false,reason:'empty'};
        active={saveVersion:3,phase:'tutorial',wave:0,poems:0,stars:0,step:0};backup=old.active;
      }else if(op==='restore'){
        if(!old.backup)return {ok:false,reason:'empty'};
        active=old.backup;backup=old.active;
      }else if(op==='save'){
        active=snapshot;backup=old.backup;
      }else return {ok:false,reason:'invalid'};
      if(!valid(active)||Object.hasOwn(active,SLOT))return {ok:false,reason:'invalid'};
      const serialized=JSON.stringify(backup?{...active,[SLOT]:backup}:active);
      // Verify serialization before the single write. Quota errors cannot partly write this slot.
      const checked=unpack(serialized);
      if(JSON.stringify(checked.active)!==JSON.stringify(active)||JSON.stringify(checked.backup)!==JSON.stringify(backup))return {ok:false,reason:'invalid'};
      if(serialized===current.raw&&op==='save')return {ok:true,record:current};
      // Preserve the original v1 key for legacy clients. Once v2 exists, it is authoritative.
      storage.setItem(CURRENT,serialized);
      return {ok:true,record:{key:CURRENT,raw:serialized}};
    }catch{return {ok:false,reason:'write'};}
  }
  const api={LEGACY,CURRENT,read,same,present,commit,unpack};
  if(typeof module==='object')module.exports=api;
  else window.SakuraRecordRecovery=api;
})();
