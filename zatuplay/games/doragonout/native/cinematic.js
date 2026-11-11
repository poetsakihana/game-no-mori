import {Renderer} from './renderer.js';
import {clamp,HEROES} from './core.js';
export function filmAt(film,time){let start=0;for(let i=0;i<film.scenes.length;i++){const scene=film.scenes[i];if(time<start+scene.duration||i===film.scenes.length-1)return{scene,index:i,local:clamp(time-start,0,scene.duration),progress:clamp((time-start)/scene.duration,0,1)};start+=scene.duration;}}
export class FilmClock{
 constructor(duration=300,start=0){this.duration=duration;this.time=clamp(start,0,duration);this.paused=false;}
 step(seconds,hidden=false){if(!this.paused&&!hidden)this.time=clamp(this.time+Math.max(0,seconds),0,this.duration);return this.time>=this.duration;}
 seek(time){this.time=clamp(time,0,this.duration);}
}
const $=s=>document.querySelector(s),minute=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
export class Cinema{
 constructor(images,sound,settings){this.root=$('#cinema');this.canvas=$('#film-canvas');this.renderer=new Renderer(this.canvas);this.renderer.images=images;this.sound=sound;this.settings=settings;this.active=false;this.lastIndex=-1;this.lastLine=-1;this.saveAt=0;
 $('#film-pause').onclick=()=>{this.clock.paused=!this.clock.paused;$('#film-pause').textContent=this.clock.paused?'再生する':'一時停止';};
 $('#film-back').onclick=()=>this.seek(this.clock.time-10);$('#film-forward').onclick=()=>this.seek(this.clock.time+10);
 $('#film-seek').oninput=e=>this.seek(+e.target.value);$('#film-skip').onclick=()=>this.finish('skipped');
 document.addEventListener('visibilitychange',()=>{if(this.active){this.prev=performance.now();this.onProgress?.(this.clock.time);}});
 this.root.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();$('#film-pause').click();}if(e.code==='Escape'){e.preventDefault();this.clock.paused=true;$('#film-pause').textContent='再生する';}});}
 play(film,{start=0,onProgress,onDone}={}){this.film=film;this.clock=new FilmClock(film.duration,start>=film.duration?0:start);this.onProgress=onProgress;this.onDone=onDone;this.lastIndex=-1;this.lastLine=-1;this.saveAt=this.clock.time;this.root.hidden=false;this.active=true;this.oldSoundKind=this.sound.kind;this.sound.kind='field';this.renderer.fit();$('#film-chapter').textContent='DISK '+film.disk+' / '+(film.position==='opening'?'PROLOGUE':'EPILOGUE');$('#film-title').textContent=film.title;$('#film-pause').textContent='一時停止';$('#film-pause').focus();this.prev=performance.now();this.frameId=requestAnimationFrame(t=>this.frame(t));}
 seek(t){this.clock.seek(t);this.lastIndex=-1;this.onProgress?.(this.clock.time);}
 finish(status){if(!this.active)return;this.active=false;cancelAnimationFrame(this.frameId);this.root.hidden=true;this.sound.kind=this.oldSoundKind;this.onDone?.(status,this.clock.time);}
 frame(now){if(!this.active)return;const dt=Math.max(0,(now-this.prev)/1000);this.prev=now;const end=this.clock.step(dt,document.hidden);const at=filmAt(this.film,this.clock.time),s=at.scene;this.renderer.time=this.clock.time;this.draw(at);if(at.index!==this.lastIndex){this.lastIndex=at.index;this.lastLine=-1;$('#film-caption').textContent=s.caption;this.sound.kind=['attack','magic'].includes(s.action)?'battle':'field';if(s.action==='attack')this.sound.play('hit');if(s.action==='magic')this.sound.play('skill');if(s.shot==='farewell')this.sound.play('heal');}
 const lineIndex=Math.min((s.lines||[]).length-1,Math.floor(at.progress*(s.lines||[]).length));if(lineIndex!==this.lastLine){this.lastLine=lineIndex;const l=s.lines?.[lineIndex]||{};$('#film-speaker').textContent=l.speaker||'';$('#film-text').textContent=l.text||'';}
 $('#film-time').textContent=minute(this.clock.time)+' / '+minute(this.film.duration);$('#film-seek').value=this.clock.time;$('#film-scene').textContent=String(at.index+1).padStart(2,'0')+' / '+this.film.scenes.length;
 if(Math.abs(this.clock.time-this.saveAt)>=5){this.saveAt=this.clock.time;this.onProgress?.(this.clock.time);}if(end){this.finish('watched');return;}this.frameId=requestAnimationFrame(t=>this.frame(t));}
 draw({scene:s,local:t,progress:p,index}){const r=this.renderer,c=r.ctx,w=r.w,h=r.h;const compact=w/h<1;const actors=s.actors||[],u=t/15;c.fillStyle='#050a0d';c.fillRect(0,0,w,h);c.save();
 const zoom=s.shot==='close'?1.10+p*.13:s.shot==='reveal'?1.23-p*.19:1.04+p*.055;
 c.translate(w/2,h*.45);c.scale(zoom,zoom);c.translate(-w/2,-h*.45);r.drawCover(r.images['world-'+s.world],-w*.035,-h*.03,w*1.07,h*1.06,Math.sin((p-.5)*1.8+index)*w*.018);
 const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#03090e55');shade.addColorStop(.5,'#03090e00');shade.addColorStop(1,'#03090eaa');c.fillStyle=shade;c.fillRect(0,0,w,h);
 // Depth-separated environment: moving fog, rain, sparks, and foreground silhouettes.
 const mist=s.world==='forest'||s.world==='cave';for(let i=0;i<(this.settings.particles?35:8);i++){const xx=((i*173+t*(s.world==='coast'?-45:12))%(w+80)+w+80)%(w+80)-40,yy=(i*113+t*(s.world==='coast'?150:-7)+h*8)%(h+50);c.globalAlpha=.1+.12*Math.sin(i+t*.7);c.fillStyle=s.world==='rift'?'#9ee6ff':'#ffe7af';if(s.world==='coast'){c.strokeStyle='#c0d9e6';c.beginPath();c.moveTo(xx,yy);c.lineTo(xx-7,yy+20);c.stroke();}else{c.beginPath();c.arc(xx,yy,1.3+(i%3),0,7);c.fill();}}
 c.globalAlpha=1;if(mist){for(let i=0;i<3;i++){const x=w*((i*.4+t*.012)%1.4-.2),g=c.createRadialGradient(x,h*.72,0,x,h*.72,w*.3);g.addColorStop(0,'#d6e9e211');g.addColorStop(1,'#d6e9e200');c.fillStyle=g;c.fillRect(0,0,w,h);}}
 let base=h*(compact?.69:.82);let size=Math.min(h*(s.shot==='close'?.91:.67),w*(compact?(actors.length>2?.55:actors.length===2?.68:.82):.52));
 const line=s.lines?.[Math.min((s.lines||[]).length-1,Math.floor(p*(s.lines||[]).length))];
 actors.forEach((id,i)=>{const hero=HEROES.find(x=>x.id===id);let x=w*(s.enemy?(actors.length===1?.28:.18+i*.16):(actors.length===1?.44:actors.length===2?.32+i*.31:.20+i*.24)),y=base+(i%2)*h*.025;let alpha=1;if(s.action==='walk'||s.action==='run'){const speed=s.action==='run'?1.7:1;x+=w*((Math.min(1,p*2)-.5)*.18);y+=Math.abs(Math.sin(t*speed*5+i))*size*.012;}if(s.action==='depart'){x+=w*p*.30;alpha=1-p*.8;}if(s.action==='appear')alpha=clamp(p*2.8,0,1);if(s.shot==='memory')alpha*=.55+.18*Math.sin(t);
 const speaks=hero?.name===line?.speaker;c.save();c.globalAlpha=alpha;if(speaks){const g=c.createRadialGradient(x,y-size*.45,0,x,y-size*.45,size*.55);g.addColorStop(0,'#f9cf7925');g.addColorStop(1,'#f9cf7900');c.fillStyle=g;c.fillRect(x-size,y-size*1.3,size*2,size*1.5);}const attack=['attack','magic'].includes(s.action)?Math.max(0,Math.sin(t*1.8+i))*.28:0;r.hero(id,x,y,size,attack,0,false,s.action==='depart',alpha,['attack','magic'].includes(s.action));c.restore();});
 if(s.enemy){const e={bossArt:s.enemy.kind==='boss'?s.enemy.index:null,family:s.enemy.kind==='family'?s.enemy.index:10,hp:1,index:0,source:{},attackAnim:s.action==='attack'?Math.max(0,Math.sin(t*1.8+2))*.5:0,flash:0};const x=w*.78,y=base-h*.02;r.enemy(e,x,y,Math.min(h*.85,w*(compact?.85:.55)));}
 if(s.action==='magic'||s.action==='attack'){const magic=s.action==='magic',x=w*.48,y=h*.48,phase=t%3/3;c.save();c.globalCompositeOperation='screen';c.strokeStyle=magic?'#a4f1ff':'#fff2ba';c.lineWidth=magic?2:4;c.globalAlpha=Math.sin(phase*Math.PI)*.8;if(magic){for(let i=0;i<4;i++){c.beginPath();c.ellipse(x,y,30+phase*130+i*18,15+phase*65+i*9,t*.4,0,7);c.stroke();}}else{c.beginPath();c.moveTo(w*(.28+phase*.2),h*.57);c.quadraticCurveTo(w*.58,h*.32,w*(.63+phase*.15),h*.6);c.stroke();}for(let i=0;i<22;i++){const a=i*2.4+t*1.8,rad=phase*120;c.fillStyle=magic?'#a7edff':'#ffe5b1';c.fillRect(x+Math.cos(a)*rad,y+Math.sin(a)*rad*.6,2,2);}c.restore();}
 // Soft foreground layer creates parallax independent of the background pan.
 c.fillStyle='#06101366';c.beginPath();c.moveTo(0,h);for(let i=0;i<10;i++)c.lineTo(i*w/9,h*.94+Math.sin(i*3+t*.2)*h*.015);c.lineTo(w,h);c.fill();c.restore();
 const edge=c.createRadialGradient(w/2,h*.48,h*.15,w/2,h*.48,w*.72);edge.addColorStop(0,'#0000');edge.addColorStop(1,'#01070dbb');c.fillStyle=edge;c.fillRect(0,0,w,h);
 const fade=Math.max(1-t/.7,1-(s.duration-t)/.65,0);if(fade>0){c.fillStyle='rgba(2,7,12,'+fade+')';c.fillRect(0,0,w,h);}if(s.shot==='memory'){c.fillStyle='#7ca4bf16';c.fillRect(0,0,w,h);}
 }
}
