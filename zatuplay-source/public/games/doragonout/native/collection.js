const copy=x=>JSON.parse(JSON.stringify(x));
export const bossEntries=campaign=>campaign.stages.flatMap(stage=>stage.encounters.filter(e=>e.boss).map(encounter=>({stage,encounter,id:encounter.id})));
export function upgradeCollection(run,campaign){
 run.bossLog??={};
 if(run.collectionVersion!==1){
  for(const {stage,encounter,id} of bossEntries(campaign)){
   const passed=run.completed.includes(stage.id)||(run.field?.stageId===stage.id&&run.field.encounter>stage.encounters.indexOf(encounter));
   if(encounter.legacy&&passed&&encounter.enemyIds.every(eid=>run.seenEnemies?.includes(eid))&&!run.bossLog[id])run.bossLog[id]={wins:1,enemyIds:[...encounter.enemyIds],firstDisk:stage.disk,firstStage:stage.id,legacy:true,bestTime:null};
  }
  run.collectionVersion=1;
 }
 return run;
}
export function recordBossWin(run,stage,encounter,time){
 if(!encounter.boss||!encounter.id)return;
 run.bossLog??={};const previous=run.bossLog[encounter.id];
 const record=run.bossLog[encounter.id]??={wins:0,enemyIds:[...encounter.enemyIds],firstDisk:stage.disk,firstStage:stage.id,firstAt:Date.now()};
 record.wins++;record.bestTime=previous?.bestTime==null?time:Math.min(previous.bestTime,time);record.lastAt=Date.now();
}
// Restore the main journey and merge only collection records from a rematch/revisit.
export function mergeCollections(base,working){
 const result=copy(base);result.seenEnemies=[...new Set([...(base.seenEnemies||[]),...(working.seenEnemies||[])])];
 result.bestiary??={};result.bossLog??={};
 for(const [id,entry] of Object.entries(working.bestiary||{}))if(!result.bestiary[id]||entry.defeats>=result.bestiary[id].defeats)result.bestiary[id]=copy(entry);
 for(const [id,entry] of Object.entries(working.bossLog||{}))if(!result.bossLog[id]||entry.wins>=result.bossLog[id].wins)result.bossLog[id]=copy(entry);
 result.collectionVersion=1;return result;
}
