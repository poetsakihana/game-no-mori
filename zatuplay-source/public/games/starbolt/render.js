import {AREAS,NAMES,COLORS,WEAPONS} from './core.js?v=1.0-web.1';
function robot(ctx,x,y,w,h,color) {
  ctx.fillStyle=color; ctx.fillRect(x+4,y+10,w-8,h-18); ctx.fillRect(x+6,y,w-12,18);
  ctx.fillStyle='#071429'; ctx.fillRect(x+w*.5,y+5,w*.32,6);
  ctx.fillStyle='#dbefff'; ctx.fillRect(x+2,y+h-12,9,12); ctx.fillRect(x+w-11,y+h-12,9,12);
  ctx.fillStyle=color; ctx.fillRect(x-4,y+20,10,13); ctx.fillRect(x+w-6,y+20,13,13);
}
export function draw(ctx,g) {
  const {stage,cam,player,boss,tick,mode}=g;
  ctx.fillStyle='#0b142b'; ctx.fillRect(0,0,960,540); ctx.fillStyle=COLORS[stage]+'22';
  for(let i=0;i<16;i++) ctx.fillRect(i*110-(cam*.3)%110,140+(i%4)*35,65,310);
  ctx.save(); ctx.translate(-cam,0);
  for(const p of g.platforms) { ctx.fillStyle='#263c58'; ctx.fillRect(p.x,p.y,p.w,p.h); ctx.fillStyle=COLORS[stage]; ctx.fillRect(p.x,p.y,p.w,4); }
  for(const h of g.hazards) {
    ctx.fillStyle='#ff5d79';
    for(let j=0;j<h.w;j+=13) { ctx.beginPath(); ctx.moveTo(h.x+j,h.y+h.h); ctx.lineTo(h.x+j+6,h.y); ctx.lineTo(h.x+j+13,h.y+h.h); ctx.fill(); }
  }
  for(const e of g.enemies) if(e.hp>0) robot(ctx,e.x,e.y,e.w,e.h,e.type===1?'#b799dc':'#efb475');
  if(boss) robot(ctx,boss.x,boss.y,boss.w,boss.h,COLORS[stage]);
  if(player&&(!player.inv||tick%6<3)) robot(ctx,player.x,player.y,player.w,player.h,'#74d9ff');
  for(const b of g.bullets) { ctx.fillStyle=b.enemy?'#ff657b':b.weapon?COLORS[b.weapon-1]:'#fff'; ctx.fillRect(b.x,b.y,b.w,b.h); }
  ctx.restore(); ctx.fillStyle='#fff'; ctx.font='18px sans-serif';
  ctx.fillText(AREAS[stage]+' / '+NAMES[stage],20,26);
  ctx.fillText('HP '+(player?Math.max(0,player.hp):28)+'/28　'+WEAPONS[g.weapon],20,52);
  ctx.fillStyle='#53e0ae'; ctx.fillRect(20,62,(player?Math.max(0,player.hp):28)*7,9);
  if(boss) { ctx.fillStyle='#ff6587'; ctx.fillRect(630,52,280*boss.hp/boss.max,12); ctx.fillStyle='#fff'; ctx.fillText('BOSS',630,40); }
  if(mode==='pause') {
    ctx.fillStyle='#0009'; ctx.fillRect(0,0,960,540); ctx.fillStyle='#fff'; ctx.font='22px sans-serif';
    ctx.textAlign='center'; ctx.fillText('一時停止',480,230); ctx.font='18px sans-serif';
    ctx.fillText('「再開」または P キーで再開',480,267); ctx.textAlign='left';
  }
}
