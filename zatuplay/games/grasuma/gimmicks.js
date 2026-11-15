'use strict';
const Gimmicks=(()=>{
 const image=new Image();image.src='assets/gimmicks-atlas.png';
 const defs=[['bomb','ボム','接触で爆発しHP−8。レジボムで無効。爆風は敵にもダメージ。'],['spike','スパイク','接触中は0.75秒ごとにHP−5。レジスパイクで無効。'],['warp','ワープ','対のポータルへ移動。レジワープで移動を防げます。'],['heavy','ヘヴィ','粘る床で移動速度が低下。レジヘヴィで無効。'],['accel','加速床','乗っている間、移動速度が上がります。'],['slow','減速床','乗っている間、移動速度が下がります。']];
 function icon(type){const i=defs.findIndex(x=>x[0]===type);return `<span class="gimmick-sprite" role="img" aria-label="${defs[i][1]}" style="background-position:${i%3*50}% ${Math.floor(i/3)*100}%"></span>`}
 function draw(c,type,x,y,w,h){const i=defs.findIndex(x=>x[0]===type);if(i<0||!image.complete||!image.naturalWidth)return false;const cw=image.naturalWidth/3,ch=image.naturalHeight/2;c.drawImage(image,i%3*cw,Math.floor(i/3)*ch,cw,ch,x,y,w,h);return true}
 function tile(c,type,x,y,w,h){for(let xx=x;xx<x+w;xx+=50){const tw=Math.min(50,x+w-xx);c.save();c.beginPath();c.rect(xx,y,tw,h);c.clip();draw(c,type,xx,y,50,h);c.restore()}}
 function floors(c){tile(c,'accel',20,390,250,50);tile(c,'slow',270,390,250,50)}
 const old=FX.drawGimmicks.bind(FX);FX.drawGimmicks=function(){if(!image.complete||!image.naturalWidth){old();return}if(!S)return;for(const g of S.gimmicks){if(g.type==='bomb'&&g.used)continue;if(['heavy','spike'].includes(g.type)){if(g.type==='heavy')tile(ctx,g.type,g.x,g.y,g.w,g.h);else draw(ctx,g.type,g.x,g.y-6,g.w,g.h+12)}else{const r=g.r+5;draw(ctx,g.type,g.x-r,g.y-r,r*2,r*2)}}};
 $('gimmickCatalog').innerHTML=defs.map(([t,n,d])=>'<article class="gimmick-card">'+icon(t)+'<strong>'+n+'</strong><p>'+d+'</p></article>').join('');
 document.querySelector('.stage-legend')?.replaceChildren?.();const legend=document.querySelector('.stage-legend');if(legend)legend.innerHTML=defs.map(([t,n])=>'<span>'+icon(t)+n+'</span>').join('');
 return{draw,floors,defs};
})();globalThis.Gimmicks=Gimmicks;
