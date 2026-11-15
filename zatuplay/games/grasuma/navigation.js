'use strict';
(()=>{
const pages={arena:'arenaScreen',story:'storyScreen',dashboard:'dashboard',missions:'missionScreen',team:'teamScreen',settings:'settingsScreen',gacha:'gachaScreen',events:'eventsScreen'};
const labels={arena:'CPU ARENA / CPU対戦',story:'STORY / メインストーリー',dashboard:'HOME / ホーム',missions:'QUEST / クエスト選択',team:'HUNTERS / ハンター・編成',settings:'SETTINGS / 設定',gacha:'GACHA / ハンターガチャ',events:'EVENT / 季節と遠征',battle:'BATTLE / バトル'};
let current='title',selectedStage=0;
function safeSet(k,v){try{BrowserStore.setItem(k,v)}catch{}}
function read(k){try{return BrowserStore.getItem(k)}catch{return null}}
function paintSummary(){$('homeProgress').textContent=saved.cleared.length+' / '+stages.length+' CLEAR';$('homeLeader').textContent=hunters[lead]?.name||'未編成';$('titleSaveNote').textContent=saved.cleared.length?'冒険の記録あり · '+saved.cleared.length+' / '+stages.length+' CLEAR':'進行状況はこのブラウザに保存されます'}
function syncSound(){$('settingsSound').textContent='効果音：'+(sound?'ON':'OFF');$('settingsSound').setAttribute('aria-pressed',String(sound));$('sound').textContent='音：'+(sound?'ON':'OFF')}
function show(route,push=true){
 if(!['title','battle',...Object.keys(pages)].includes(route))route='dashboard';
 if(current==='battle'&&route!=='battle'&&globalThis.Training)Training.leave();
 if(current==='battle'&&route!=='battle'){drag=null;if(S){S.done=true;S.moving=false;FX.reset()}}
 if(current==='story'&&route!=='story'&&globalThis.Story)Story.close();
 current=route;document.body.dataset.screen=route;
 $('titleScreen').classList.toggle('hidden',route!=='title');$('appShell').classList.toggle('hidden',route==='title');
 $('home').classList.toggle('hidden',route==='battle');$('game').classList.toggle('hidden',route!=='battle');
 Object.entries(pages).forEach(([name,id])=>{const e=$(id);e.classList.toggle('hidden',route!==name);e.classList.remove('entering');if(route===name){void e.offsetWidth;e.classList.add('entering')}});
 document.querySelectorAll('#bottomNav [data-nav]').forEach(b=>{if(b.dataset.nav===route)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 $('screenLabel').textContent=labels[route]||'非公式ブラウザ版';paintSummary();syncSound();if(globalThis.Owned)Owned.refresh();if(globalThis.VISUALS){if(route==='missions')menu();if(route==='team')VISUALS.editor();VISUALS.paint()}
 if(route==='story'&&globalThis.Story)Story.render();if(route==='arena'&&globalThis.Arena)Arena.render();if(globalThis.Soundtrack)Soundtrack.scene(route);
 if(push)history.pushState({paintScreen:route},'',location.pathname+location.search+(route==='title'?'':'#'+route));
 window.scrollTo({top:0,behavior:'instant'});
 if(route==='title')$('titleEnter').focus({preventScroll:true});else{const target=route==='battle'?$('back'):$(pages[route]).querySelector('h1');if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true})}}
}
function brief(n){if(globalThis.Owned&&!Owned.ready()){Owned.openTutorial();return}if(n<0||n>=stages.length||n>0&&!saved.cleared.includes(n-1))return;selectedStage=n;if(globalThis.AutoTeam)AutoTeam.target(n);$('briefTitle').textContent=stages[n].name;$('briefDesc').textContent=stages[n].desc;$('briefTeam').innerHTML=hunters.map((h,i)=>`<div>${i===lead?'▶ ':''}${h.name}<small>Lv.${h.level} / ${h.type} / ${h.ability}<br>${h.weapon.name}</small></div>`).join('');$('briefGimmicks').textContent=['ボム / 味方への接触でリンクコンボが発動','ボム・スパイク・ワープ・ヘヴィ / 加速床・減速床','ボス / ボム・スパイク・ワープ・ヘヴィ / 加速床・減速床'][n];if(globalThis.VISUALS)VISUALS.brief(n);$('stageBrief').showModal()}
window.GameNav={go:show,brief,enterBattle:()=>show('battle'),get screen(){return current}};
$('titleEnter').onclick=()=>{show('dashboard');Owned.refresh();if(Owned.state.step<3)Owned.openTutorial()};$('titleHelp').onclick=$('settingsHelp').onclick=()=>$('help').click();
$('start').onclick=()=>show('missions');document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.nav)));
$('confirmBattle').onclick=()=>{$('stageBrief').close();start(selectedStage)};$('briefClose').onclick=()=>$('stageBrief').close();$('briefEdit').onclick=()=>{$('stageBrief').close();show('team')};
$('toTitle').onclick=()=>show('title');
sound=read('paint-smash-sound')==='on';$('settingsSound').onclick=$('sound').onclick=()=>{sound=!sound;safeSet('paint-smash-sound',sound?'on':'off');syncSound();tone(440)};
let reduced=read('paint-smash-reduce-motion')==='on';function syncMotion(){document.body.classList.toggle('reduce-motion',reduced);$('motionToggle').textContent='演出の動き：'+(reduced?'OFF':'ON');$('motionToggle').setAttribute('aria-pressed',String(reduced))}$('motionToggle').onclick=()=>{reduced=!reduced;safeSet('paint-smash-reduce-motion',reduced?'on':'off');syncMotion()};syncMotion();
window.addEventListener('popstate',e=>{if($('stageBrief').open)$('stageBrief').close();if($('modal').open)$('modal').close();if($('growthDialog').open)$('growthDialog').close();if($('gachaReveal').open)$('gachaReveal').close();const route=e.state?.paintScreen;show(route==='battle'?'missions':route||'title',false)});
history.replaceState({paintScreen:'title'},'',location.pathname+location.search);show('title',false);
})();
