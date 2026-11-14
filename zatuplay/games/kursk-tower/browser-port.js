/* ZatuPlay browser adapter, 2026-11-14. Does not change progression. */
(function(){'use strict';
window.ZatuHomeURL=new URL('../../',document.currentScript.src).href;
const prefix='zatuplay:kursk-tower:v1:';
function scoped(kind){return {getItem:k=>window[kind].getItem(prefix+k),setItem:(k,v)=>window[kind].setItem(prefix+k,v),removeItem:k=>window[kind].removeItem(prefix+k),key:i=>Object.keys(window[kind]).filter(k=>k.startsWith(prefix))[i]?.slice(prefix.length)||null,clear:()=>Object.keys(window[kind]).filter(k=>k.startsWith(prefix)).forEach(k=>window[kind].removeItem(k)),get length(){return Object.keys(window[kind]).filter(k=>k.startsWith(prefix)).length;}};}
window.ZatuLocalStorage=scoped('localStorage');window.ZatuSessionStorage=scoped('sessionStorage');
// No source IndexedDB users; namespace future databases as well.
if(window.indexedDB){const db=window.indexedDB;for(const name of ['open','deleteDatabase']){const original=db[name].bind(db);db[name]=(key,...args)=>original(prefix+key,...args);}}
document.addEventListener('DOMContentLoaded',()=>{const a=document.createElement('a');a.href=window.ZatuHomeURL;a.textContent='← ZatuPlay';a.style.cssText='position:fixed;top:3px;left:50%;transform:translateX(-50%);z-index:10010;background:#102637e8;color:#fff;padding:4px 8px;border-radius:6px;font:12px sans-serif;text-decoration:none';document.body.append(a);});
})();
