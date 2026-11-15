'use strict';
$('gachaSingle').onclick=()=>Owned.draw('single');$('gachaEleven').onclick=()=>Owned.draw('eleven');$('gachaTicket').onclick=()=>Owned.draw('ticket');$('claimGift').onclick=()=>Owned.gift();
for(const k of ['twitter','youtube']){$('visit-'+k).onclick=()=>Owned.visit(k);$('claim-'+k).onclick=()=>Owned.claim(k)}
$('gachaResultClose').onclick=()=>{$('gachaReveal').close();if(Owned.state.step<3)Owned.renderTutorial()};
$('onboarding').addEventListener('cancel',e=>e.preventDefault());
$('openReset').onclick=()=>$('resetDialog').showModal();$('cancelReset').onclick=()=>$('resetDialog').close();$('confirmReset').onclick=()=>Owned.reset();
$('gachaRates').innerHTML=[4,3,2].map(star=>{const names=roster.filter(h=>Owned.star(h.name)===star),rate={4:7,3:38,2:55}[star];return '<h3>☆'+star+'：'+rate+'% / '+names.length+'種類</h3><p>各キャラ '+(rate/names.length).toFixed(5)+'%</p><p>'+names.map(h=>VISUALS.esc(h.name)).join(' / ')+'</p>'}).join('');
window.addEventListener('focus',()=>Owned.refresh());Owned.refresh();
