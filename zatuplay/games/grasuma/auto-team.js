'use strict';
const AutoTeam=(()=>{
 let selectedStage=0;
 const needed=n=>n===0?['レジボム']:['レジボム','レジスパイク','レジヘヴィ','レジワープ'];
 function recommend(n=selectedStage,mode=$('autoTeamMode').value||'balanced'){
  if(Training.active){$('autoTeamNote').textContent='練習を終えてから編成を変更してください。';return false}
  const pool=roster.filter(h=>h.rarity!=='住人'&&Owned.count(h.name)>0).map(h=>({h:Growth.stats(h.name),copies:Math.min(4,Owned.count(h.name))}));
  if(!pool.length){$('autoTeamNote').textContent='所持ハンターがいません。最初のキャラ選択かガチャで仲間を迎えてください。';return false}
  const picks=[],abilityCount={},roleCount={},used={};const needs=needed(n);
  while(picks.length<4){let best=null,bestScore=-Infinity;for(const p of pool){const h=p.h;if((used[h.name]||0)>=p.copies)continue;let score=h.power*.7+h.hp*.8+h.lcPower*.25+h.level*.4;
   score+=needs.reduce((s,a)=>s+(Growth.has(h,a)?(abilityCount[a]?10:34):0),0);
   score+=roleCount[h.role]?0:22;score-=(used[h.name]||0)*28;
   const type=HunterSkills.get(h.name)?.type;
   if(mode==='attack')score+=h.power*.9+(['cleave','beam','meteor','chain','nova'].includes(type)?24:0);
   else if(mode==='survival')score+=h.hp*1.2+(['heal','shield','purge'].includes(type)?32:0);
   else if(mode==='paint')score+=h.paint*25+(['paint','purge','haste'].includes(type)?32:0);
   else score+=['heal','shield'].includes(type)&&!picks.some(x=>['heal','shield'].includes(HunterSkills.get(x.name)?.type))?28:0;
   if(score>bestScore){best=p;bestScore=score}}
   if(!best)break;const h=best.h;picks.push(h);used[h.name]=(used[h.name]||0)+1;roleCount[h.role]=(roleCount[h.role]||0)+1;for(const a of needs)if(Growth.has(h,a))abilityCount[a]=(abilityCount[a]||0)+1;
  }
  teamNames=picks.map(h=>h.name);while(teamNames.length<4)teamNames.push(null);lead=0;slot=0;applyTeam();renderCatalog();
  const missing=needs.filter(a=>!abilityCount[a]);const message=`${picks.length}人を編成しました。${{balanced:'バランス',attack:'攻撃重視',survival:'生存重視',paint:'塗り重視'}[mode]||'バランス'} / ${n===0?'ボム対策':'全ギミック対策'}。`+(missing.length?'未対応：'+missing.join('・')+'。所持キャラの範囲で選びました。':'必要な対応アビリティをカバー。');
  $('autoTeamNote').textContent=message;$('teamStatus').textContent=message;if(globalThis.Soundtrack)Soundtrack.sfx('auto');return true;
 }
 function target(n){if(!Number.isInteger(n)||n<0||n>=stages.length)return;selectedStage=n;$('autoTeamStage').value=String(n)}
 $('autoTeamStage').onchange=()=>target(+$('autoTeamStage').value);$('autoTeamApply').onclick=()=>recommend();$('briefAutoTeam').onclick=()=>{if(recommend()){VISUALS.brief(selectedStage);$('briefAutoNote').textContent=$('autoTeamNote').textContent}};
 $('storyAutoTeam').onclick=()=>{const c=Story.chapters.find(c=>c.id===Story.view?.id);if(c&&recommend(c.stage)){const r={...Story.view};Story.close();Story.open(r.id,r.part)}};
 return{recommend,target,get stage(){return selectedStage}};
})();globalThis.AutoTeam=AutoTeam;
