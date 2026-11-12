// Original StarBolt 1.0 rules, adapted for a browser host. See README.md.
export const VERSION = '1.0-web.1';
export const NAMES = ['フレア・ライオン','フロスト・オウル','リーフ・マンティス','ボルト・ハウンド','アクア・クラブ','ストーン・ライノ','ウィンド・ファルコン','シャドウ・リンクス'];
export const AREAS = ['溶鉱炉','氷の研究所','森林工場','発電塔','水路基地','採掘場','天空回廊','夜の都市'];
export const COLORS = ['#ff7957','#9be5ff','#90ee91','#fff065','#559fff','#dca779','#8cf5db','#d297ff'];
export const WEAPONS = ['ノーマル','火炎弾','氷結弾','リーフ散弾','電撃弾','水流弾','岩石弾','風の連射','影の貫通弾'];
export const ENDING = '8つの機械要塞は静まり、街に朝が戻った。\nスターボルトの旅は、みんなの笑顔を守った。\nTHE END — Thank you for playing';
export const overlap = (a,b) => a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
export class Game {
  constructor({cleared=[], beep=()=>{}, change=()=>{}}={}) {
    this.cleared=[...cleared]; this.beep=beep; this.change=change;
    this.mode='select'; this.stage=0; this.world=4800; this.cam=0; this.tick=0;
    this.weapon=0; this.shot=0; this.player=null; this.platforms=[]; this.enemies=[];
    this.bullets=[]; this.hazards=[]; this.boss=null; this.bossStarted=false;
    this.checkpoint=false; this.keys={}; this.jumpLatch=false; this.win=false;
  }
  clearInput() { this.keys={}; this.jumpLatch=false; }
  select() { this.mode='select'; this.clearInput(); this.change('select'); }
  start(i,retry=false) {
    if (!Number.isInteger(i)||i<0||i>7) throw new RangeError('Unknown fortress');
    if (!retry || i!==this.stage) this.checkpoint=false;
    this.stage=i; this.mode='play'; this.tick=0; this.shot=0; this.clearInput();
    this.boss=null; this.bossStarted=false; this.cam=this.checkpoint?3590:0; this.win=false;
    this.player={x:this.checkpoint?3890:90,y:330,w:26,h:36,vx:0,vy:0,hp:28,inv:0,ground:false,dir:1};
    this.platforms=[{x:0,y:450,w:this.world,h:90}]; this.enemies=[]; this.bullets=[]; this.hazards=[];
    for(let j=0;j<16;j++) {
      const x=340+j*218, y=365-((j+i)%3)*48;
      this.platforms.push({x,y,w:100+(i%3)*16,h:18});
      if(j%3!==1) this.enemies.push({x:x+40,y:414,w:30,h:32,hp:3,type:(j+i)%3,base:x+40,cool:45+j*7,phase:j});
      if(j%4===2) this.hazards.push({x:x+110,y:433,w:65,h:17});
    }
    this.weapon=0; this.beep(); this.change('start');
  }
  damage(n) {
    if(this.mode!=='play'||this.player.inv>0) return;
    this.player.hp-=n; this.player.inv=80; this.beep(110,.15);
    if(this.player.hp<=0) this.finish(false);
  }
  finish(win) {
    if(this.mode!=='play') return;
    this.mode='result'; this.clearInput(); this.win=win;
    if(win&&!this.cleared.includes(this.stage)) this.cleared.push(this.stage);
    this.beep(win?880:100,.2); this.change(win?'win':'loss');
  }
  cycle() {
    if(this.mode!=='play'&&this.mode!=='pause') return;
    const available=[0,...this.cleared.map(i=>i+1).sort((a,b)=>a-b)];
    this.weapon=available[(available.indexOf(this.weapon)+1)%available.length]; this.beep(660); this.change('weapon');
  }
  pause() { if(this.mode==='play') { this.mode='pause'; this.clearInput(); this.change('pause'); } }
  resume() { if(this.mode==='pause') { this.clearInput(); this.mode='play'; this.change('resume'); } }
  addBullet(x,y,vx,vy,enemy=false) {
    this.bullets.push({x,y,w:enemy?12:15,h:enemy?12:9,vx,vy,enemy,life:160,weapon:this.weapon});
  }
  step() {
    if(this.mode!=='play') return;
    const p=this.player, keys=this.keys;
    this.tick++; p.inv=Math.max(0,p.inv-1); this.shot--;
    p.vx=(keys.right?3.8:0)-(keys.left?3.8:0); if(p.vx) p.dir=Math.sign(p.vx);
    if(keys.jump&&!this.jumpLatch&&p.ground) { p.vy=-12; this.beep(520); }
    this.jumpLatch=!!keys.jump;
    p.x=Math.max(this.bossStarted?3890:0,Math.min(this.world-p.w,p.x+p.vx));
    const oldY=p.y; p.vy=Math.min(14,p.vy+.55); p.y+=p.vy; p.ground=false;
    for(const floor of this.platforms) if(p.vy>=0&&oldY+p.h<=floor.y+1&&p.y+p.h>=floor.y&&p.x+p.w>floor.x&&p.x<floor.x+floor.w) {
      p.y=floor.y-p.h; p.vy=0; p.ground=true;
    }
    if(keys.fire&&this.shot<=0) {
      this.shot=this.weapon===7?8:17; this.addBullet(p.x+13,p.y+15,p.dir*(this.weapon===6?6:10),0);
      if(this.weapon===3) { this.addBullet(p.x+13,p.y+15,p.dir*9,-2); this.addBullet(p.x+13,p.y+15,p.dir*9,2); }
      this.beep(this.weapon?680:440,.025);
    }
    for(const h of this.hazards) { if(overlap(p,h)) this.damage(3); if(this.mode!=='play') return; }
    for(const e of this.enemies) {
      if(e.hp<=0) continue;
      e.x=e.base+Math.sin(this.tick*.025+e.phase)*65; e.y=e.type===1?300+Math.sin(this.tick*.05+e.phase)*45:418;
      if(overlap(p,e)) this.damage(3); if(this.mode!=='play') return;
      e.cool--;
      if(e.cool<=0&&Math.abs(e.x-p.x)<700) {
        const dx=p.x-e.x,dy=p.y-e.y,l=Math.hypot(dx,dy)||1;
        this.addBullet(e.x,e.y,dx/l*3.4,dy/l*3.4,true); e.cool=95-this.stage*3;
      }
    }
    if(p.x>3850&&!this.bossStarted) {
      this.checkpoint=true; this.bossStarted=true;
      this.boss={x:4530,y:382,w:58,h:68,hp:48,max:48,cool:65}; this.beep(180,.2);
    }
    if(this.boss) {
      const b=this.boss;
      b.x=4390+Math.sin(this.tick*(.014+this.stage*.001))*230;
      b.y=this.stage===6?320+Math.sin(this.tick*.035)*80:382-Math.max(0,Math.sin(this.tick*.035))*((this.stage%3)*35);
      if(overlap(p,b)) this.damage(4); if(this.mode!=='play') return;
      b.cool--;
      if(b.cool<=0) {
        const count=3+this.stage%3;
        for(let j=0;j<count;j++) {
          const angle=Math.atan2(p.y-b.y,p.x-b.x)+(j-(count-1)/2)*.23;
          this.addBullet(b.x,b.y+25,Math.cos(angle)*(3+this.stage*.13),Math.sin(angle)*(3+this.stage*.13),true);
        }
        b.cool=65-this.stage*3;
      }
    }
    for(const b of this.bullets) {
      b.x+=b.vx; b.y+=b.vy; b.life--;
      if(b.enemy) {
        if(overlap(b,p)) { this.damage(2); b.life=0; } if(this.mode!=='play') return;
      } else {
        for(const e of this.enemies) if(e.hp>0&&overlap(b,e)) {
          // A projectile keeps its fired weapon even when X changes the active weapon.
          e.hp-=b.weapon===6?3:1; if(b.weapon!==8) b.life=0;
          if(e.hp<=0&&p.hp<28) p.hp=Math.min(28,p.hp+1); break;
        }
        if(this.boss&&overlap(b,this.boss)) {
          this.boss.hp-=b.weapon===(this.stage+7)%8+1?4:1; b.life=0;
          if(this.boss.hp<=0) { this.boss=null; this.finish(true); break; }
        }
      }
    }
    this.bullets=this.bullets.filter(b=>b.life>0&&b.y>-50&&b.y<600);
    this.cam=Math.max(this.bossStarted?3840:0,Math.min(this.world-960,p.x-300));
  }
}
export class FixedClock {
  constructor(game) { this.game=game; this.reset(); }
  reset() { this.previous=null; this.accumulator=0; }
  frame(now) {
    if(!Number.isFinite(now)) { this.reset(); return; }
    if(this.game.mode!=='play') { this.reset(); return; }
    if(this.previous===null) { this.previous=now; return; }
    const elapsed=now-this.previous;
    if(elapsed>250||elapsed<0) { this.game.pause(); this.reset(); return; }
    this.accumulator+=Math.min(elapsed,80); this.previous=now;
    while(this.accumulator+1e-9>=1000/60) {
      this.game.step(); this.accumulator-=1000/60;
      if(this.game.mode!=='play') { this.reset(); break; }
    }
  }
}
