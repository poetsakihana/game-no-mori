/* Browser port modification: storage isolation / safe exit, 2026-11-14. */
/* Completion is recorded by each episode's ending. */
(function(){'use strict';var key='KurskTower_seriesClear_v1';
function bits(){var b=0;try{b=Number(ZatuLocalStorage.getItem(key))||0;}catch(e){}try{if(window.Android&&typeof Android.getClears==='function')b|=Number(Android.getClears())||0;if(window.KurskStorage&&KurskStorage.fifthClear())b|=16;}catch(e){}return b&31;}
function mark(n){if(!Number.isInteger(n)||n<1||n>5)return false;var b=bits()|(1<<(n-1)),ok=false;try{ZatuLocalStorage.setItem(key,String(b));ok=true;}catch(e){}try{if(n===5&&window.KurskStorage)ok=KurskStorage.markFifth()||ok;else if(window.Android&&typeof Android.markClear==='function')ok=Android.markClear(n)||ok;}catch(e){}return ok;}
function unlocked(n){if(!Number.isInteger(n)||n<1||n>5)return false;var required=(1<<(n-1))-1;return (bits()&required)===required;}
function requireEpisode(n){if(unlocked(n))return true;try{location.replace('../index.html');}catch(e){}return false;}
window.KurskSeries={bits:bits,mark:mark,isClear:function(n){return Number.isInteger(n)&&n>=1&&n<=5&&!!(bits()&(1<<(n-1)));},unlocked:unlocked,requireEpisode:requireEpisode};
})();
