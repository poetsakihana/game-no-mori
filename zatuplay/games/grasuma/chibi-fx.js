'use strict';
// Cosmetic only: bounded object pools, no changes to damage, hitboxes or rewards.
const ChibiFX=(()=>{
 const LIMIT=180,RING_LIMIT=24,pool=Array.from({length:LIMIT},()=>({t:0})),rings=Array.from({length:RING_LIMIT},()=>({t:0}));
 const pulses=new Float32Array(4),media=matchMedia('(prefers-reduced-motion: reduce)');
 let tick=0,cursor=0,ringCursor=0,serial=0,trailClock=0,lastState=null;
 function reduced(){return media.matches||document.body.classList.contains('reduce-motion')}
 function random(){serial=(serial*1664525+1013904223)>>>0;return serial/4294967296}
 function burst(x,y,color,count=14,speed=110){if(reduced())return;count=Math.min(count,LIMIT);for(let i=0;i<count;i++){const p=pool[cursor++%LIMIT],a=random()*Math.PI*2,v=speed*(.25+random()*.75);p.x=x;p.y=y;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.t=p.life=.24+random()*.36;p.size=1.5+random()*3;p.color=color;p.gravity=70}}
 function ring(x,y,color,r=42){const p=rings[ringCursor++%RING_LIMIT];p.x=x;p.y=y;p.color=color;p.t=p.life=reduced()?.16:.4;p.r=r}
 function reset(){for(const p of pool)p.t=0;for(const p of rings)p.t=0;pulses.fill(0);trailClock=0;lastState=S;if(S)for(let i=0;i<S.units.length;i++){const u=S.units[i];pulses[i]=1;ring(u.x,u.y,hunters[i].color,38);burst(u.x,u.y,hunters[i].color,12,75)}}
 function step(dt){if(FX.paused||document.hidden)return;dt=Math.max(0,Math.min(.05,dt));tick+=dt;if(lastState!==S)reset();for(let i=0;i<4;i++)pulses[i]=Math.max(0,pulses[i]-dt*2.8);
  const quiet=reduced();for(const p of pool){if(quiet){p.t=0;continue}if(p.t<=0)continue;p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt}for(const p of rings)p.t-=dt;
  if(!S||S.done||FX.block()||!S.moving)return;trailClock+=dt;if(trailClock>=.035){trailClock=0;const u=S.units[S.active];burst(u.x,u.y,hunters[S.active].color,2,24)}
 }
 function draw(){if(!S)return;ctx.save();for(const p of pool){if(p.t<=0)continue;ctx.globalAlpha=Math.max(0,p.t/p.life)*.85;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}for(const p of rings){if(p.t<=0)continue;const a=p.t/p.life;ctx.globalAlpha=a*.65;ctx.lineWidth=1+a*2;ctx.strokeStyle=p.color;ctx.beginPath();ctx.ellipse(p.x,p.y+13,p.r*(1-a*.4),p.r*.35*(1-a*.4),0,0,Math.PI*2);ctx.stroke()}ctx.restore()}
 const oldReset=FX.reset.bind(FX);FX.reset=function(){oldReset();reset()};
 const oldStep=FX.step.bind(FX);FX.step=function(dt){oldStep(dt);step(dt)};
 const decorative=new Set(['spark','splash','slash','blast','impact','aura','shield','portal']);
 const oldDraw=FX.draw.bind(FX);FX.draw=function(){
  draw();if(!reduced()){oldDraw();return}
  // Freeze cut-in pose and skill geometry only during draw, preserving their timers.
  const cut=this.cut,cutTime=cut?.t;if(cut)cut.t=cut.life*.5;
  const skillVisuals=globalThis.HunterSkills?.visuals;
  if(skillVisuals)for(const v of skillVisuals){v.drawTime=v.t;v.t=v.life*.6}
  for(let i=this.effects.length-1;i>=0;i--)if(decorative.has(this.effects[i].type))this.effects.splice(i,1);
  oldDraw();if(cut)cut.t=cutTime;
  if(skillVisuals)for(const v of skillVisuals)v.t=v.drawTime;
 };
 const oldAdd=FX.add.bind(FX);FX.add=function(type,x,y,color,life,extra){if(reduced()&&decorative.has(type))return;oldAdd(type,x,y,color,life,extra);if(type==='slash'||type==='impact'||type==='blast'){burst(x,y,color||'#ffe39a',type==='blast'?24:9,type==='blast'?190:115)}else if(type==='shield'||type==='portal'){ring(x,y,color||'#9fffdc',44)}};
 const oldLaunch=FX.launch.bind(FX);FX.launch=function(){const u=S?.units[S.active],armed=S?.armed;if(u){pulses[S.active]=1;ring(u.x,u.y,hunters[S.active].color,armed?75:45);burst(u.x,u.y,hunters[S.active].color,armed?32:15,130)}return oldLaunch()};
 const oldLink=FX.fireLink.bind(FX);FX.fireLink=function(f,i,target){const before=S?.stats?.links||0;const result=oldLink(f,i,target);if((S?.stats?.links||0)>before){pulses[i]=1;ring(f.x,f.y,hunters[i].color,50);burst(f.x,f.y,hunters[i].color,14,110)}return result};
 const oldEnemyDraw=EnemyCast.draw;EnemyCast.draw=function(c,e,time){return oldEnemyDraw(c,e,reduced()?0:time)};
 const oldHit=hit;hit=function(e,d){oldHit(e,d);if(particles.length>180)particles.splice(0,particles.length-180);if(texts.length>40)texts.splice(0,texts.length-40);if(reduced())particles.length=0};
 const oldFinish=finish;finish=function(win){const wasDone=S?.done;oldFinish(win);if(win&&!wasDone&&S){for(let i=0;i<S.units.length;i++){const u=S.units[i];ring(u.x,u.y,hunters[i].color,80);burst(u.x,u.y,hunters[i].color,30,190)}}};
 return {get time(){return tick},get reduced(){return reduced()},pulse(i){return pulses[i]||0},get activeParticles(){let n=0;for(const p of pool)if(p.t>0)n++;return n},get activeRings(){let n=0;for(const p of rings)if(p.t>0)n++;return n},particleLimit:LIMIT,ringLimit:RING_LIMIT};
})();globalThis.ChibiFX=ChibiFX;
