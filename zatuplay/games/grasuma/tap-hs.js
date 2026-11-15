'use strict';
const TapHS=(()=>{
 const down=cv.onpointerdown,up=cv.onpointerup,cancel=cv.onpointercancel;let press=null;
 cv.onpointerdown=function(e){down(e);press=drag?{...drag,state:S,active:S.active}:null};cv.onpointercancel=function(e){press=null;cancel(e)};
 cv.onpointerup=function(e){const can=S&&!S.done&&!S.moving&&!FX.block(),u=can?S.units[S.active]:null,p=drag&&{...drag},tap=can&&u&&p&&press&&press.state===S&&press.active===S.active&&Math.hypot(press.x-p.x,press.y-p.y)<10;press=null;if(!tap){up(e);return}drag=null;if(S.hsCooldown[S.active]!==0){log('HSはあと'+S.hsCooldown[S.active]+'ターンで使用できます。');if(globalThis.Soundtrack)Soundtrack.sfx('error');return}S.armed=!S.armed;ui();log(S.armed?'HS準備！ 同じキャラを引っ張って離すと発動。もう一度タップすると解除。':'HS準備を解除しました。通常ショットできます。');FX.label(u.x,u.y-45,S.armed?'HS READY':'通常ショット',S.armed?'#efffa2':'#bcd0e3');if(globalThis.Soundtrack)Soundtrack.sfx(S.armed?'hsReady':'cancel')};
 const oldDraw=FX.draw.bind(FX);FX.draw=function(){oldDraw();if(!S||S.done||S.moving||!S.armed)return;const u=S.units[S.active];ctx.save();ctx.strokeStyle='#fff5a0';ctx.lineWidth=4;ctx.beginPath();ctx.arc(u.x,u.y,38+Math.sin(performance.now()/150)*3,0,7);ctx.stroke();ctx.fillStyle='#fff5a0';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('HS READY',Math.max(55,Math.min(485,u.x)),u.y-48);ctx.restore()};
 return{get ready(){return !!S?.armed}};
})();globalThis.TapHS=TapHS;
