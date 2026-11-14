/* Browser port modification: storage isolation / safe exit, 2026-11-14. */
/* Independent episode 4/5 saves, using the existing Android storage bridge. */
(function(){'use strict';var key='KurskTower_bundleSave_v1';
function parse(text){var v;try{v=JSON.parse(text);}catch(e){}if(v&&v.kurskBundle===1)return {kurskBundle:1,revision:Math.max(0,Number(v.revision)||0),fourth:typeof v.fourth==='string'?v.fourth:'',fifth:typeof v.fifth==='string'?v.fifth:'',fifthClear:v.fifthClear===true};return {kurskBundle:1,revision:0,fourth:text||'',fifth:'',fifthClear:false};}
function bundle(){var local='',native='';try{local=ZatuLocalStorage.getItem(key)||'';}catch(e){}try{if(window.Android&&typeof Android.getFourth==='function')native=Android.getFourth()||'';}catch(e){}var a=parse(local),b=parse(native);return !native||a.revision>b.revision?a:b;}
function put(v){v.revision=(v.revision||0)+1;var data=JSON.stringify(v),ok=false;try{ZatuLocalStorage.setItem(key,data);ok=true;}catch(e){}try{if(window.Android&&typeof Android.saveFourth==='function')ok=Android.saveFourth(data)||ok;}catch(e){}return ok;}
window.KurskStorage={read:function(n){return bundle()[n===5?'fifth':'fourth'];},write:function(n,data){if(n!==4&&n!==5||typeof data!=='string'||data.length>90000)return false;var v=bundle();v[n===5?'fifth':'fourth']=data;return put(v);},fifthClear:function(){return bundle().fifthClear;},markFifth:function(){var v=bundle();v.fifthClear=true;return put(v);}};
})();
