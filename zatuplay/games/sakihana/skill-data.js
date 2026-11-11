/* 咲華と恋空の詩: original skill catalogue.
 * Six explicitly reusable mechanics; 100 parameterized techniques, not 100
 * unique engines. Skills 1–6 are available immediately; each later technique
 * unlocks after its stated number of main-stage clears, without gacha.
 * Distance uses game world units; duration/cooldown use seconds; power is a
 * multiplier of the player's normal hit. Trap affinity is an active contact
 * interaction and is separate from the character's passive anti-trap list.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SakuraSkills = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const TYPES = Object.freeze(['self_barrier','ally_barrier','laser_h','laser_v','involute','ring_break']);
  const TYPE_NAMES = Object.freeze(['自身バリア','仲間バリア','横レーザー','縦レーザー','渦球','輪破壊']);
  const TYPE_TITLES = Object.freeze(['花守り','絆の盾','横閃','縦閃','渦星','輪砕き']);
  const TRAITS = Object.freeze(['はじまり','そよ風','若葉','朝露','小春','花灯り','波音','夕映え','月影','星屑','白雪','虹色','夢路','希望','光輪','旅空','永遠']);
  const TRAPS = Object.freeze(['spike','beam','ring']);
  const TRAP_LABELS = Object.freeze({spike:'とげ',beam:'光線',ring:'輪'});
  const LEGACY_CHARACTERS = Object.freeze(['sakura','ranka','fukki','wanchoka','kagura','shiratori']);
  const RECRUIT_IDS = Object.freeze(Array.from({length:200},(_,i)=>`recruit_${String(i+1).padStart(3,'0')}`));
  const CHARACTERS = Object.freeze([...LEGACY_CHARACTERS,...RECRUIT_IDS]);
  const recruitIndex = id => typeof id==='string'&&/^recruit_\d{3}$/.test(id) && Number(id.slice(-3))>=1 && Number(id.slice(-3))<=200 ? Number(id.slice(-3))-1 : -1;
  const clampRank = r => Math.max(0, Math.min(3, Math.floor(Number(r) || 0)));
  const clampClears = n => Math.max(0, Math.min(100, Math.floor(Number(n) || 0)));
  const round = n => Math.round(n * 100) / 100;
  const list = Array.from({length:100}, (_, index) => {
    const typeIndex=index%6, v=Math.floor(index/6), type=TYPES[typeIndex];
    const id=`skill-${String(index+1).padStart(3,'0')}`;
    // Each variant trades reach/effect size against cooldown; no silent
    // exponential scaling or player-rarity dependency.
    const cooldown=round(7.2 + (v%5)*0.55 + Math.floor(v/5)*0.12 + (typeIndex===4?0.5:0));
    const duration=round(typeIndex<2 ? 3.0+(v%5)*0.35+Math.floor(v/5)*0.05 : 0.45+(v%4)*0.08);
    const power=typeIndex<2 ? 0 : round(0.85+(v%5)*0.12+Math.floor(v/5)*0.025+(typeIndex===5?0.15:0));
    const shield=typeIndex<2 ? round(8+(v%5)*2+Math.floor(v/5)*0.5) : 0;
    const range=typeIndex===2||typeIndex===3 ? 180+(v%5)*25+Math.floor(v/5)*5 : typeIndex===1 ? 120+(v%5)*12+Math.floor(v/5)*2 : 0;
    const width=typeIndex===2||typeIndex===3 ? 30+(v%4)*5+Math.floor(v/4) : 0;
    const radius=typeIndex===4||typeIndex===5 ? 70+(v%5)*15+Math.floor(v/5)*3 : 0;
    const arms=typeIndex===4 ? 2+(v%2) : 0;
    const trapAffinity=typeIndex===5 ? 'ring' : TRAPS[(v+typeIndex)%3];
    const unlockClears=Math.max(0,index-5);
    return Object.freeze({id,name:`${TRAITS[v]}の${TYPE_TITLES[typeIndex]}`,type,typeLabel:TYPE_NAMES[typeIndex],
      power,cooldown,range,radius,duration,width,shield,arms,trapAffinity,
      trapLabel:TRAP_LABELS[trapAffinity],unlockClears});
  });
  const byId = Object.freeze(Object.fromEntries(list.map(s=>[s.id,s])));
  const initial = Object.freeze(['skill-001','skill-002','skill-003','skill-004','skill-005','skill-006']);
  // Different defaults are available from the beginning; a deliberate user
  // selection should never be overwritten just because a rank changes.
  const startIndex=Object.freeze({sakura:2,ranka:1,fukki:3,wanchoka:4,kagura:2,shiratori:5});
  const baseAffinity=Object.freeze({sakura:[],ranka:[],fukki:[],wanchoka:[],kagura:['spike'],shiratori:[]});
  const antiOrder=Object.freeze({sakura:['spike','beam','ring'],ranka:['ring','spike','beam'],fukki:['beam','ring','spike'],wanchoka:['ring','beam','spike'],kagura:['beam','ring'],shiratori:['beam','spike','ring']});
  function all(){return list.slice();}
  function get(id){return Object.prototype.hasOwnProperty.call(byId,id) ? byId[id] : null;}
  function availableSkills(characterId,rank,clearedStages,level){
    if(!CHARACTERS.includes(characterId)) return [];
    // New recruits unlock by personal level; original characters retain
    // their previous stage unlocks alongside personal level progression.
    const lv=Number.isInteger(level)?Math.max(1,Math.min(20,level)):1;
    const count=Math.min(100,recruitIndex(characterId)>=0?6+5*(lv-1):Math.max(6+clampClears(clearedStages),6+5*(lv-1)));
    return list.slice(0,count).map(s=>s.id);
  }
  function defaultSkill(characterId,rank){
    if(!CHARACTERS.includes(characterId)) return null;
    const recruit=recruitIndex(characterId);
    if(recruit>=0)return initial[recruit%initial.length];
    return initial[(startIndex[characterId]+clampRank(rank))%initial.length];
  }
  function antiTraps(characterId,rank){
    if(!CHARACTERS.includes(characterId)) return [];
    const recruit=recruitIndex(characterId);
    if(recruit>=0){const orders=[['spike','beam','ring'],['beam','ring','spike'],['ring','spike','beam']];return orders[recruit%orders.length].slice(0,clampRank(rank));}
    return [...baseAffinity[characterId],...antiOrder[characterId].slice(0,clampRank(rank))];
  }
  function effectiveSkill(skillOrId,rank){
    const base=typeof skillOrId==='string'?get(skillOrId):skillOrId;
    if(!base || !get(base.id)) return null;
    const r=clampRank(rank), factor=1+r*0.04;
    return {...base,power:round(base.power*factor),shield:round(base.shield*factor),rank:r};
  }
  // A true planar involute of a base circle, sampled along rotating radial
  // arms. t=0 starts at the base circle; normalize the end to skill.radius.
  // Return separate polylines for rendering AND segment collision checks.
  function involutePoints(skillOrId,cx,cy,angle=0){
    const skill=typeof skillOrId==='string'?get(skillOrId):skillOrId;
    if(!skill || skill.type!=='involute' || !Number.isFinite(cx) || !Number.isFinite(cy)) return [];
    const a=skill.radius/Math.sqrt(1+3.2*3.2), paths=[];
    for(let arm=0;arm<skill.arms;arm++){
      const theta=(Number.isFinite(angle)?angle:0)+arm*2*Math.PI/skill.arms;
      const c=Math.cos(theta),s=Math.sin(theta),pts=[];
      for(let i=0;i<=16;i++){
        const t=3.2*i/16, x=a*(Math.cos(t)+t*Math.sin(t)), y=a*(Math.sin(t)-t*Math.cos(t));
        pts.push({x:cx+x*c-y*s,y:cy+x*s+y*c});
      }
      paths.push(pts);
    }
    return paths;
  }
  return Object.freeze({TYPES,TYPE_NAMES,TRAPS,CHARACTERS,all,get,availableSkills,defaultSkill,antiTraps,effectiveSkill,involutePoints});
});
