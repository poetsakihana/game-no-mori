/* Original 1000 x 650 Android Canvas composition, redrawn with Canvas2D. */
(function(root){'use strict';
const C=root.FlyBattle,INK=-11455702;
function color(n){if(typeof n==='string')return n;return `rgba(${(n>>>16)&255},${(n>>>8)&255},${n&255},${(n>>>24)/255})`;}
function mix(a,b,t){t=Math.min(1,Math.max(0,t));return `rgb(${[16,8,0].map(k=>Math.trunc(((a>>>k)&255)*(1-t)+((b>>>k)&255)*t)).join(',')})`;}
class Renderer {
 constructor(ctx){this.ctx=ctx;this.buttons=[];}
 rounded(x,y,w,h,rx=18,ry=rx){const c=this.ctx;rx=Math.min(rx,w/2);ry=Math.min(ry,h/2);c.beginPath();c.moveTo(x+rx,y);c.lineTo(x+w-rx,y);c.ellipse(x+w-rx,y+ry,rx,ry,0,-Math.PI/2,0);c.lineTo(x+w,y+h-ry);c.ellipse(x+w-rx,y+h-ry,rx,ry,0,0,Math.PI/2);c.lineTo(x+rx,y+h);c.ellipse(x+rx,y+h-ry,rx,ry,0,Math.PI/2,Math.PI);c.lineTo(x,y+ry);c.ellipse(x+rx,y+ry,rx,ry,0,Math.PI,Math.PI*1.5);c.closePath();}
 box(x,y,w,h,col,rx=18,ry=rx){if(w<=0||h<=0)return;this.ctx.fillStyle=color(col);this.rounded(x,y,w,h,rx,ry);this.ctx.fill();}
 text(str,x,y,size,col=INK){const c=this.ctx;c.fillStyle=color(col);c.font=`700 ${size}px system-ui, sans-serif`;c.textBaseline='alphabetic';c.fillText(str,x,y);}
 circle(x,y,r,col){const c=this.ctx;if(col!==undefined)c.fillStyle=color(col);c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
 oval(x,y,rx,ry,stroke=false){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);stroke?c.stroke():c.fill();}
 button(id,label,x,y,w,h,enabled=true){this.box(x,y,w,h,enabled?'#d35628':'#857e73');this.text(label,x+15,y+h*.65,23,-1);this.buttons.push({id,label,x,y,w,h,enabled});}
 food(x,y,type,progress,rotation){const c=this.ctx;c.save();c.translate(x,y);c.rotate(rotation*Math.PI/180);c.fillStyle=mix(-6496,-9358047,progress/C.BURN);if(type===1){this.oval(0,0,43,19);this.circle(43,-9,12,-1676222);this.circle(43,9,12);}else if(type===2){this.circle(-15,0,27);this.circle(17,-8,26);this.circle(8,13,26);}else{this.rounded(-42,-28,84,56,type===0?28:8,28);c.fill();}for(let i=0;i<12;i++)this.circle(-28+(i*17)%59,-16+(i*11)%33,2,-4493268);c.restore();}
 draw(s,clock=s.clock){const c=this.ctx;this.buttons=[];c.clearRect(0,0,1000,650);c.fillStyle=color(-3880);c.fillRect(0,0,1000,650);this.box(0,0,1000,74,INK);this.text('揚げどき！フライバトル',25,49,30,-1);this.button('sound',s.sound?'音 ON':'音 OFF',855,12,125,47);
 if(s.screen==='title'){
  this.text('サクッと勝負！ 目指せ揚げ物王',110,150,38,-9356505);for(let i=0;i<4;i++)this.food(190+i*205,235+Math.sin(clock*2+i)*10,i,.95,Math.sin(clock+i)*8);
  this.button('story','ストーリー 全100面',270,310,460,65);this.button('rank','端末内ランキング',270,390,460,65);this.button('name','名前：'+s.name,270,470,460,55);this.text('食材をタップしてすくう！ 100％に近いほど高得点',130,580,24);this.text('45秒間の平均精度でCPUと対決。焦げにも注意！',150,615,23);
 }
 if(s.screen==='story'){
  this.text('町の屋台から全国大会へ！',35,120,28);for(let i=0;i<20;i++){const stage=s.page*20+i+1;this.button('stage-'+stage,(stage<=s.unlocked?'STAGE ':'未解放 ')+stage,35+(i%5)*193,150+Math.floor(i/5)*88,180,70,stage<=s.unlocked);}
  this.button('title','タイトル',25,555,160,55);this.button('prev','前へ',240,555,140,55,s.page>0);this.text(`${s.page+1} / 5`,465,590,28);this.button('next','次へ',650,555,140,55,s.page<4);
 }
 if(s.screen==='play'){
  this.text(`ST${s.stage}  VS ${C.RIVALS[Math.floor((s.stage-1)/25)]}     残り ${Math.ceil(45-s.ticks/120)}秒`,25,118,27);this.text(`得点 ${s.points}   あなた ${s.count?(s.sum/s.count).toFixed(1):'0.0'}％   CPU ${s.count?(s.cpuSum/s.count).toFixed(1):'0.0'}％`,25,160,25);
  this.box(30,208,940,285,-11312790);this.box(45,222,910,250,-14079445);
  for(let i=0;i<4;i++){const x=150+i*225,food=s.foods[i],ratio=Math.fround(food.age/food.target);this.box(x-98,239,196,207,-2516444);for(let b=0;b<24;b++)this.circle(x-85+(b*47)%170,435-(clock*((b%7)*9+35)+b*23)%180,b%5+2,-10645);this.food(x,335+Math.sin(clock*5+i)*4,food.type,ratio,Math.sin(clock*3+i)*4);for(let b=0;b<3;b++)this.circle(x-25+b*24+Math.sin(clock+b)*7,270-(clock*32+b*18)%70,8,1442840575);this.text(C.FOOD_NAMES[food.type],x-78,465,23,-1);this.text(Math.round(Math.fround(ratio*100))+'％',x-35,510,26);this.box(x-82,520,164,10,-2705254);this.box(x-82,520,Math.min(1,ratio/C.BURN)*164,10,ratio>.9&&ratio<1.1?-10246582:-1864654);if(!s.paused)this.buttons.push({id:'food-'+i,label:`${i+1}番 ${C.FOOD_NAMES[food.type]} ${Math.round(Math.fround(ratio*100))}％ すくう（${i+1}キー）`,x:x-98,y:239,w:196,h:242,enabled:true});}
  for(const v of s.flights){const y=345-v.t*190;c.strokeStyle=color(-2300443);c.lineWidth=7;c.beginPath();c.moveTo(v.x+35,y+15);c.lineTo(v.x+95,y-60);c.stroke();this.oval(v.x,y+5,55,30,true);this.food(v.x,y,v.type,1,-v.t*20);this.text('+'+v.quality*10,v.x-35,y-45,24,-2272217);}
  this.text(s.msg,35,585,26,-9356505);this.button('pause',s.paused?'再開':'一時停止',790,555,180,55);
  if(s.paused){this.box(200,225,600,240,-296668374);this.text('一時停止',420,290,35,-1);this.button('resume','再開',300,325,170,65);this.button('select','選択へ',520,325,170,65);}
 }
 if(s.screen==='result'){
  this.text(s.msg,80,160,36,-9356505);this.text('獲得ポイント：'+s.points,130,245,35);this.text('あなたの精度：'+(s.count?s.sum/s.count:0).toFixed(1)+'％',130,310,30);this.text('CPUの精度：'+(s.count?s.cpuSum/s.count:50).toFixed(1)+'％',130,365,30);this.button('retry','もう一度',100,440,240,70);this.button('continue',s.win&&s.stage<100?'次のステージ':'ステージ選択',365,440,300,70);this.button('title','タイトル',690,440,200,70);
 }
 if(s.screen==='rank'){
  this.text('端末内 TOP10 ／ 総ポイント順',40,120,30);for(let i=0;i<s.ranks.length;i++){const v=s.ranks[i];this.text(`${i+1}位  ${v.name}   ST${v.stage}   ${v.score}点`,65,165+i*38,24);}this.button('title','タイトル',35,575,180,50);
 }
 return this.buttons;
 }
}
root.FlyRenderer=Renderer;
})(globalThis);
