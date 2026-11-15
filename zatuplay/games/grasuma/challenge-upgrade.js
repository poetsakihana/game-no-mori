'use strict';
/* Supplied fan-game expansion. All formations and balance below are original,
   not a claim about the discontinued official service's internal rules. */
const ChallengeUpgrade=(()=>{
 const layouts=[
  {label:'連携の前線',positions:[[175,170],[390,265],[200,360]],hp:[95,95,100],clocks:[3,3,4],pillars:[]},
  {label:'水路の挟撃',positions:[[150,160],[400,205],[265,315],[125,350]],hp:[135,135,145,135],clocks:[3,3,4,4],pillars:[{x:345,y:340,w:52,h:44}]},
  {label:'黒晶の包囲陣',positions:[[270,170],[110,285],[425,300],[275,390]],hp:[480,150,155,145],clocks:[4,3,4,4],pillars:[{x:42,y:95,w:54,h:56},{x:444,y:95,w:54,h:56}]}
 ];
 const phaseMoves=['burst','cross','laser'];
 function specification(stage){return JSON.parse(JSON.stringify(layouts[Math.max(0,Math.min(2,stage|0))]))}
 function circleBox(u,b){const px=Math.max(b.x,Math.min(b.x+b.w,u.x)),py=Math.max(b.y,Math.min(b.y+b.h,u.y));let dx=u.x-px,dy=u.y-py,d=Math.hypot(dx,dy);if(d>=u.r)return false;if(d===0){const sides=[{d:Math.abs(u.x-b.x),x:-1,y:0},{d:Math.abs(u.x-b.x-b.w),x:1,y:0},{d:Math.abs(u.y-b.y),x:0,y:-1},{d:Math.abs(u.y-b.y-b.h),x:0,y:1}].sort((a,b)=>a.d-b.d);dx=sides[0].x;dy=sides[0].y;d=1;u.x+=dx*(sides[0].d+u.r+1);u.y+=dy*(sides[0].d+u.r+1)}else{dx/=d;dy/=d;u.x+=dx*(u.r-d+.2);u.y+=dy*(u.r-d+.2)}const dot=u.vx*dx+u.vy*dy;if(dot<0){u.vx-=2*dot*dx;u.vy-=2*dot*dy}return true}
 if(typeof module!=='undefined'&&module.exports)return module.exports={specification,circleBox,layouts};
 function enabled(){return !!(S&&!S.training&&!S.arena&&!globalThis.Training?.active)}
 function setup(){if(!enabled()||S.challenge)return;const spec=specification(S.stage),custom=!!(S.storyChapter||S.questId||S.eventSeason);S.challenge={spec,phase:1,announced:0,patternTurn:-1,patterns:{},seenTurn:-1};
  S.enemies.forEach((e,i)=>{const p=spec.positions[i];if(p){e.x=p[0];e.y=p[1]}if(!custom)e.hp=e.max=spec.hp[i]||e.max;else e.hp=e.max=Math.round(e.max*(S.storyChapter&&S.storyChapter<3?1:1.06));e.clock=Math.max(e.clock,spec.clocks[i]||3)});
  // Stable, unobstructed lower staging area: no new damage sources on spawn.
  S.challenge.pillars=spec.pillars.map(b=>({...b}));
  if(S.storyChapter&&S.storyChapter<3)S.challenge.pillars=[];
  S.challenge.label=spec.label;ui();
 }
 function phaseCheck(){if(!enabled()||!S.challenge||S.done||S.moving||BattlePlus.busy)return;const c=S.challenge,boss=S.enemies.find(e=>e.boss&&e.hp>0);if(boss&&c.phase===1&&boss.hp<=boss.max*.5){c.phase=2;boss.clock=Math.max(2,boss.clock);c.patternTurn=-1;FX.add('aura',boss.x,boss.y,'#ffbb66',1);FX.label(270,80,'PHASE 2 / 十字・水平攻撃に注意','#ffda91');log('ボス第2形態！ 反撃まで最低2手。橙色の予告範囲から離れ、味方の足元を塗ろう。');ui()}}
 const attack=EnemyCast.attack.bind(EnemyCast);EnemyCast.attack=function(e){if(!enabled()||!S.challenge)return attack(e);const c=S.challenge;if(c.patternTurn!==S.turn){c.patternTurn=S.turn;c.patterns={}}const key=e.id+':'+(e.castMoveIndex||0)+':'+c.phase;if(!c.patterns[key])c.patterns[key]=e.boss&&c.phase===2?phaseMoves[(e.castMoveIndex||0)%phaseMoves.length]:attack(e);return c.patterns[key]};
 function threats(){if(!enabled()||!S.challenge)return [];return S.enemies.filter(e=>e.hp>0&&e.clock===1).map(e=>({enemy:e,type:BattlePlus.pattern(e),target:(S.turn+1+e.id)%S.units.length}))}
 function drawFloor(){if(!enabled()||!S.challenge)return;const c=S.challenge;ctx.save();for(const b of c.pillars){ctx.fillStyle='#101b2d';ctx.fillRect(b.x+4,b.y+7,b.w,b.h);ctx.fillStyle='#344957';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle='#bedee5';ctx.lineWidth=2;ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.strokeStyle='#799da9';ctx.beginPath();ctx.moveTo(b.x+8,b.y+8);ctx.lineTo(b.x+b.w-8,b.y+b.h-8);ctx.moveTo(b.x+b.w-8,b.y+8);ctx.lineTo(b.x+8,b.y+b.h-8);ctx.stroke()}
  if(!S.moving&&!BattlePlus.busy&&!S.done){for(const a of threats()){const e=a.enemy;ctx.strokeStyle='#ffcc72aa';ctx.fillStyle='#ffc46a18';ctx.lineWidth=2;ctx.setLineDash([6,7]);if(a.type==='burst'){ctx.beginPath();ctx.arc(e.x,e.y,180,0,Math.PI*2);ctx.fill();ctx.stroke()}else if(a.type==='laser'||a.type==='cross'){ctx.fillRect(0,e.y-42,540,84);ctx.strokeRect(0,e.y-42,540,84);if(a.type==='cross'){ctx.fillRect(e.x-45,0,90,660);ctx.strokeRect(e.x-45,0,90,660)}}else{const u=S.units[a.target];ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(u.x,u.y);ctx.stroke();ctx.beginPath();ctx.arc(u.x,u.y,u.r+12,0,Math.PI*2);ctx.stroke()}}
   if(threats().length){ctx.setLineDash([]);ctx.fillStyle='#1b2139e8';ctx.fillRect(68,7,404,27);ctx.fillStyle='#ffdb9d';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText('橙の範囲：この手の後に反撃 / 追尾弾は撃破で阻止',270,26)}
  }ctx.restore();
 }
 const floor=FX.drawGimmicks.bind(FX);FX.drawGimmicks=function(){floor();drawFloor()};
 const gimmicks=FX.gimmicks.bind(FX);FX.gimmicks=function(dt){gimmicks(dt);if(!enabled()||!S.challenge||S.done||FX.warping)return;const u=S.units[S.active];for(const b of S.challenge.pillars)if(circleBox(u,b)){if((S.challenge.lastImpact||-1)+.12<S.elapsed){S.challenge.lastImpact=S.elapsed;FX.add('impact',u.x,u.y,'#c3e3ef',.25)}}};
 const step=FX.step.bind(FX);FX.step=function(dt){setup();step(dt);phaseCheck()};
 const launch=FX.launch.bind(FX);FX.launch=function(){setup();launch()};
 const oldUI=VISUALS.battleUI;VISUALS.battleUI=function(){oldUI();if(!enabled()||!S.challenge)return;const t=threats();$('threats').textContent=t.length?'次の反撃：'+t.map(a=>(a.enemy.displayName||'敵')+'・'+BattlePlus.patterns[a.type].name).join(' / '):'反撃カウントを確認。橙色は次の手の攻撃範囲。';if(S.challenge.phase===2)$('threats').textContent+=' / BOSS PHASE 2';};
 return{specification,layouts,circleBox,setup,threats,get active(){return enabled()&&!!S.challenge}};
})();globalThis.ChallengeUpgrade=ChallengeUpgrade;
