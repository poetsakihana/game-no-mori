/* Browser port modification: storage isolation / safe exit, 2026-11-14. */
(function(){
'use strict';
var episodes=[
 {title:'ダークモクの恐怖',description:'闇の脅威が迫るクルスク島。森や村、儀式の場を巡る第１の冒険。',maps:113,path:'part1/index.html'},
 {title:'仕組まれたクルスク島',description:'鉄道で島の町を巡り、遺跡に隠された謎へ。島の秘密を探る第２の冒険。',maps:100,path:'part2/index.html'},
 {title:'天空のロバク',description:'地上の旅から、雲を越えた天空へ。塔の頂を目指す第３の冒険。',maps:210,path:'part3/index.html'},
 {title:'クルスク塔～謎解き地下鉄迷宮塔～',description:'第３作の後日、突然現れた白い駅通路。地下・地上・空中を巡り、十二駅の謎と救援の声を追う。',maps:36,path:'part4/index.html'},
 {title:'クルスク塔～最後の奈落～',description:'第４作から直結。列車は異世界へ！ 三層を行き来し、50の扉を解いて島へ帰る。守護者とは対話も選べる。',maps:150,path:'part5/index.html'}
];
var current=0,drag=null,ignoreClick=false,launching=false;
var viewport=document.getElementById('viewport'),track=document.getElementById('track');
var title=document.getElementById('episode-title'),description=document.getElementById('description'),number=document.getElementById('number'),count=document.getElementById('count'),play=document.getElementById('play');
var dots=Array.prototype.slice.call(document.querySelectorAll('.dot'));
try{var n=Number(ZatuSessionStorage.getItem('kurskSelected'));if(isFinite(n)&&n>=0&&n<episodes.length)current=n;}catch(e){}
function render(animate){
 track.style.transition=animate===false?'none':'transform 260ms ease';track.style.transform='translateX(-'+(current*100)+'%)';
 var e=episodes[current];title.textContent=e.title;description.textContent=e.description;number.textContent='EPISODE 0'+(current+1);var unlocked=KurskSeries.unlocked(current+1);
 var completed=KurskSeries.isClear(current+1);
 count.textContent=!unlocked?'第'+current+'作品をクリアすると解放':(current===3?'12駅・36探索場所':current===4?'50ステージ・150探索場所':e.maps+' マップ')+(completed?' • CLEAR':'');
 play.disabled=!unlocked;play.textContent=unlocked?'この作品を遊ぶ':'第'+current+'作品クリアで解放';
 for(var ep=2;ep<=5;ep++){var overlay=document.getElementById('lock-overlay'+ep);if(overlay)overlay.hidden=KurskSeries.unlocked(ep);}
 document.getElementById('previous').disabled=current===0;document.getElementById('next').disabled=current===episodes.length-1;
 dots.forEach(function(d,i){d.setAttribute('aria-current',i===current?'true':'false');d.setAttribute('aria-label','第'+(i+1)+'作 '+episodes[i].title);});
 Array.prototype.forEach.call(track.children,function(s,i){s.setAttribute('aria-hidden',i===current?'false':'true');s.tabIndex=i===current?0:-1;});
 try{ZatuSessionStorage.setItem('kurskSelected',String(current));}catch(e){}
}
function select(n){if(launching)return;current=Math.max(0,Math.min(episodes.length-1,n));render(true);}
function launch(){if(launching||drag||!KurskSeries.unlocked(current+1))return;launching=true;play.disabled=true;play.textContent='読み込み中…';location.href=episodes[current].path;}
document.getElementById('previous').onclick=function(){select(current-1);};document.getElementById('next').onclick=function(){select(current+1);};
dots.forEach(function(d,i){d.onclick=function(){select(i);};});play.onclick=launch;
viewport.onclick=function(){if(ignoreClick){ignoreClick=false;return;}launch();};
track.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();launch();}};
document.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){e.preventDefault();select(current-1);}else if(e.key==='ArrowRight'){e.preventDefault();select(current+1);}});
function down(x,y,id){if(launching||drag)return;ignoreClick=false;drag={x:x,y:y,id:id,horizontal:false};track.style.transition='none';}
function move(x,y){if(!drag)return;var dx=x-drag.x,dy=y-drag.y;if(Math.abs(dy)>12)drag.moved=true;if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy))drag.horizontal=true;if(drag.horizontal){var factor=(current===0&&dx>0)||(current===episodes.length-1&&dx<0)?0.25:1;track.style.transform='translateX(calc(-'+current*100+'% + '+(dx*factor)+'px))';}}
function up(x,cancelled){if(!drag)return;var d=drag;drag=null;var dx=x-d.x;ignoreClick=d.horizontal||d.moved;if(!cancelled&&d.horizontal&&Math.abs(dx)>=Math.min(60,viewport.clientWidth*0.15))select(current+(dx<0?1:-1));else render(true);}
if(window.PointerEvent){
 viewport.addEventListener('pointerdown',function(e){if((drag&&drag.id!==e.pointerId)||(e.pointerType==='mouse'&&e.button!==0))return;down(e.clientX,e.clientY,e.pointerId);viewport.setPointerCapture(e.pointerId);});
 viewport.addEventListener('pointermove',function(e){if(drag&&e.pointerId===drag.id)move(e.clientX,e.clientY);});
 viewport.addEventListener('pointerup',function(e){if(drag&&e.pointerId===drag.id)up(e.clientX,false);});
 viewport.addEventListener('pointercancel',function(e){if(drag)up(drag.x,true);});
 viewport.addEventListener('lostpointercapture',function(){if(drag)up(drag.x,true);});
}else{
 viewport.addEventListener('touchstart',function(e){var t=e.touches[0];down(t.clientX,t.clientY,t.identifier);},{passive:true});
 viewport.addEventListener('touchmove',function(e){var t=e.touches[0];move(t.clientX,t.clientY);if(drag&&drag.horizontal)e.preventDefault();},{passive:false});
 viewport.addEventListener('touchend',function(e){if(drag)up(e.changedTouches[0].clientX,false);});
 viewport.addEventListener('touchcancel',function(){if(drag)up(drag.x,true);});
}
window.addEventListener('blur',function(){if(drag)up(drag.x,true);});
window.addEventListener('pageshow',function(){launching=false;play.disabled=false;play.textContent='この作品を遊ぶ';render(false);});
document.getElementById('exit').onclick=function(){if(window.Android)Android.exit();else location.href='/zatuplay/';};
window.KurskSelector={select:select,getCurrent:function(){return current;},launch:launch};
if(window.KurskSound)KurskSound.music('select');
render(false);
})();
