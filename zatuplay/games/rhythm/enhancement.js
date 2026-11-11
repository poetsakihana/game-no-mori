/* Rhythm stage presentation layer. Artwork is embedded during bundling. */
const rhythmFX={particles:[],rings:[],lastBlock:-1,lastTime:0,flash:0,sceneAt:-99,atlas:null,maxParticles:160,enabled:true};
try{rhythmFX.enabled=localStorage.getItem('rhythm-effects-v2')!=='off'}catch{}
function fxStar(x,y,r,rotation,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.43:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore()}
const castRects=[[100,166,244,237],[543,166,244,224],[945,41,281,333],[1340,80,404,321],[41,575,340,259],[500,633,306,195],[955,487,287,352],[1345,477,391,327]];
function castSprite(id,x,y,size,rotation=0){if(!rhythmFX.atlas?.complete||!rhythmFX.atlas.naturalWidth)return false;const img=rhythmFX.atlas,r=castRects[id],h=size*r[3]/r[2];ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(img,...r,-size/2,-h*.86,size,h);ctx.restore();return true}
const castEmoji={'🐸':1,'☂️':2,'☂':2,'🦖':3,'🐶':4,'🐕':4,'🦀':5,'🥋':6,'🦆':7,'🐦':7};
const oldText=text;
text=function(s,x,y,size=24,color='#294554'){if(Object.hasOwn(castEmoji,s)&&castSprite(castEmoji[s],x,y,size*1.55))return;return oldText(s,x,y,size,color)};
const oldCreature=creature;
creature=function(x,y,color='#fff',size=38){if(color==='#fff'&&castSprite(0,x,y+size*.7,size*2.1,Math.sin((audio?.currentTime||0)*6)*.025))return oldText('',x,y);oldCreature(x,y,color,size)};
function fxEmit(points,kind){if(!rhythmFX.enabled)return;const pal=points===100?['#ffd54f','#ffffff','#ff83be','#64e5db']:points?['#67d9f0','#fff4bd']:['#91a0b4','#ccd3dd'];const x=kind==='hoop'||kind==='cast'?800:kind==='feed'?750:500,y=260;const n=points===100?24:points?12:6;for(let i=0;i<n;i++){const a=i/n*Math.PI*2+(rhythmFX.lastTime%1);rhythmFX.particles.push({x,y,vx:Math.cos(a)*(80+i%5*28),vy:Math.sin(a)*110-100,life:.65+i%4*.1,max:1,r:4+i%4,spin:a,color:pal[i%pal.length]})}if(rhythmFX.particles.length>160)rhythmFX.particles.splice(0,rhythmFX.particles.length-160);rhythmFX.rings.push({x,y,age:0,color:pal[0]});if(rhythmFX.rings.length>12)rhythmFX.rings.shift();rhythmFX.flash=points===100?.07:0}
const oldResolve=resolve;
resolve=function(e,points,label){if(e.result===null){fxEmit(points,e.kind)}return oldResolve(e,points,label)};
const oldScene=scene;
scene=function(p,now,t,block){oldScene(p,now,t,block);if(!rhythmFX.enabled)return;
 const dt=Math.min(.05,Math.max(0,now-rhythmFX.lastTime));rhythmFX.lastTime=now;
 if(run&&block!==rhythmFX.lastBlock){rhythmFX.lastBlock=block;rhythmFX.sceneAt=now;}
 const beat=run?.beat||.5,pulse=Math.pow(Math.max(0,1-((Math.max(0,t)%beat)/beat)),3);
 // A thin beat-reactive frame never obscures incoming cues or judgement.
 ctx.save();ctx.strokeStyle=p.color;ctx.lineWidth=3+pulse*4;ctx.globalAlpha=.5;ctx.strokeRect(5,5,990,450);ctx.restore();
 for(let i=0;i<8;i++){const x=(i*149+t*(8+i))%1040,y=150+Math.sin(t*.6+i)*105;fxStar(x,y,3+(i%3),t*.25+i,'#ffffff',.16)}
 for(const q of rhythmFX.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=180*dt;q.spin+=dt*3;fxStar(q.x,q.y,q.r,q.spin,q.color,Math.max(0,q.life))}rhythmFX.particles=rhythmFX.particles.filter(q=>q.life>0);
 for(const q of rhythmFX.rings){q.age+=dt;ctx.save();ctx.globalAlpha=Math.max(0,1-q.age*2);ctx.strokeStyle=q.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(q.x,q.y,15+q.age*150,0,7);ctx.stroke();ctx.restore()}rhythmFX.rings=rhythmFX.rings.filter(q=>q.age<.5);
 if(run&&selected?.remix&&now-rhythmFX.sceneAt<.55){const a=1-(now-rhythmFX.sceneAt)/.55;ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#ffffff';ctx.fillRect(0,450-8*a,1000,8*a);ctx.restore()}
};
const oldStop=stop;
stop=function(cancel=false){const was=run;oldStop(cancel);rhythmFX.lastBlock=-1;if(cancel){rhythmFX.particles=[];rhythmFX.rings=[]}else if(was){fxEmit(100,'hoop')}};
const settingsRoot=document.querySelector('.settings');
const fxLabel=document.createElement('label'),fxCheckbox=document.createElement('input');fxCheckbox.type='checkbox';fxCheckbox.checked=rhythmFX.enabled;fxCheckbox.id='effects-enabled';fxLabel.append(fxCheckbox,document.createTextNode('演出エフェクト'));settingsRoot.append(fxLabel);fxCheckbox.onchange=()=>{rhythmFX.enabled=fxCheckbox.checked;try{localStorage.setItem('rhythm-effects-v2',fxCheckbox.checked?'on':'off')}catch{}if(!fxCheckbox.checked){rhythmFX.particles=[];rhythmFX.rings=[]}};
for(const id of ['volume','guide','offset','bgmon','bgmvolume','sfxvolume']){const el=$('#'+id);try{const v=localStorage.getItem('rhythm-setting-'+id);if(v!==null){if(el.type==='checkbox')el.checked=v==='true';else el.value=v}}catch{}el.addEventListener('change',()=>{try{localStorage.setItem('rhythm-setting-'+id,el.type==='checkbox'?String(el.checked):el.value)}catch{}})}
$('#offsetval').textContent=$('#offset').value+' ms';
// A direct retry avoids forcing a successful or failed player through the carousel.
const retry=document.createElement('button');retry.id='result-retry';retry.className='ghost';retry.textContent='同じステージをもう一度';retry.onclick=()=>{if(selected){const s=selected;select(s)}};$('#result-screen').append(retry);
const help=document.createElement('p');help.className='enhanced-note';help.textContent='演出強化版 1.25 · 非公式ファンメイド。原作の公式音源・完全な仕様を収録したものではありません。';document.querySelector('footer').prepend(help);
const castNames=['しらたま','ピョコちんガエル','カサパホーマー','恐竜ちゃん','エキサイティング犬','タベモノポンポンガニ','カラテ家','わたり鳥'];
const galleryButton=document.createElement('button');galleryButton.id='enhanced-cast';galleryButton.className='ghost';galleryButton.textContent='新しいキャラクターを見る';document.querySelector('.settings-panel').append(galleryButton);
galleryButton.onclick=()=>{guidePanel('キャラクターイラスト',[['今回の改良','提供されたタイトル画像を参考に8体を描き起こしました。公式素材の抽出ではありません。']], [['閉じる',()=>{}]]);const host=$('#guide-panel').firstElementChild;const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,1fr);gap:8px';castNames.forEach((name,id)=>{const item=document.createElement('div'),c=document.createElement('canvas');c.width=220;c.height=180;c.style.cssText='width:100%;height:auto;background:#f3f1df;border-radius:14px';const q=c.getContext('2d'),r=castRects[id],w=150,h=w*r[3]/r[2];if(rhythmFX.atlas?.complete)q.drawImage(rhythmFX.atlas,...r,110-w/2,160-h,w,h);const cap=document.createElement('p');cap.textContent=name;cap.style.fontSize='11px';item.append(c,cap);grid.append(item)});host.append(grid)};
