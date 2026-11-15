'use strict';
// Presentation and lifecycle only: save identities and combat arithmetic stay intact.
const BattleComfort=(()=>{
 let paused=false;
 const button=document.createElement('button');button.id='pauseBattle';button.textContent='一時停止';button.setAttribute('aria-pressed','false');$('retry').before(button);
 const dialog=document.createElement('dialog');dialog.id='pauseDialog';dialog.innerHTML='<h2>一時停止</h2><p>ショット・敵の攻撃・演出を停止しています。</p><button id="resumeBattle" class="accent">バトルに戻る</button>';document.body.append(dialog);
 function set(value){paused=!!value&&!!S&&!S.done&&GameNav.screen==='battle';drag=null;last=performance.now();button.setAttribute('aria-pressed',String(paused));if(paused){if(!dialog.open)dialog.showModal();if(globalThis.Soundtrack)Soundtrack.scene('settings')}else{if(dialog.open)dialog.close();if(globalThis.Soundtrack&&GameNav.screen==='battle')Soundtrack.scene('battle')}}
 button.onclick=()=>set(true);$('resumeBattle').onclick=()=>set(false);dialog.addEventListener('cancel',e=>{e.preventDefault();set(false)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&S&&!S.done&&GameNav.screen==='battle')set(true)});
 const block=FX.block.bind(FX);FX.block=()=>paused||block();
 const oldStart=start;start=function(n){set(false);return oldStart(n)};
 window.addEventListener('popstate',()=>set(false));
 const oldGo=GameNav.go;GameNav.go=function(...args){set(false);return oldGo(...args)};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&GameNav.screen==='battle'&&!document.querySelector('dialog[open]'))set(true)});
 const css=document.createElement('style');css.textContent=`#cv{touch-action:none}#pauseDialog{max-width:min(90vw,420px)}#pauseBattle{white-space:nowrap}.battle .board{min-width:0}#game>.hud{flex-wrap:wrap;gap:6px}@media(max-width:420px){#game>.hud button{padding:9px;font-size:12px}#missionname{font-size:12px;flex:1;min-width:100px}.battle-team strong{font-size:10px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}`;document.head.append(css);
 return{get paused(){return paused},set};
})();globalThis.BattleComfort=BattleComfort;
