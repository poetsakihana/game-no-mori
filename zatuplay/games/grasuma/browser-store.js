'use strict';
const BrowserStore=(()=>{
 const key='zatuplay-grasuma-browser-v1';let data=Object.create(null),writable=false;
 function status(s){const el=document.getElementById('browserSaveStatus');if(el)el.textContent=s}
 function checked(x){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length>100)throw Error('記録形式が違います');const out=Object.create(null);for(const [k,v] of Object.entries(x)){if(!/^paint-smash-[a-z0-9-]+$/.test(k)||typeof v!=='string'||v.length>250000)throw Error('記録キー・値が不正です');out[k]=v}if(JSON.stringify(out).length>900000)throw Error('記録が大きすぎます');return out}
 function hydrate(){try{const s=localStorage.getItem(key);if(s)data=checked(JSON.parse(s));writable=true;status('このタブに自動保存します')}catch(e){status('一時プレイ：保存を読めません。元データは保持しています')}}
 function ready(){return new Promise(resolve=>{if(!navigator.locks){status('一時プレイ：排他保存未対応');resolve();return}navigator.locks.request(key,{ifAvailable:true},async lock=>{if(!lock){status('一時プレイ：別タブが保存中');resolve();return}hydrate();resolve();await new Promise(()=>{})}).catch(()=>{status('一時プレイ：保存権限を取得できません');resolve()})})}
 function setItem(k,v){const next=checked({...data,[k]:String(v)});data=next;if(!writable){status('一時プレイ：JSONに記録を保管してください');return}try{localStorage.setItem(key,JSON.stringify(data))}catch(e){writable=false;status('一時プレイ：保存失敗。JSONに保管してください');throw e}}
 function removeItem(k){const next={...data};delete next[k];data=checked(next);if(writable)try{localStorage.setItem(key,JSON.stringify(data))}catch(e){writable=false;status('保存失敗');throw e}}
 function validateExport(text){if(text.length>1000000)throw Error('記録が大きすぎます');const x=JSON.parse(text);if(x.game!=='zatuplay-grasuma'||x.version!==1)throw Error('別作品の記録です');return checked(x.data)}
 function importData(text){const next=validateExport(text);if(!writable)throw Error('保存できるタブで復元してください');localStorage.setItem(key,JSON.stringify(next));data=next}
 return{ready,getItem:k=>data[k]??null,setItem,removeItem,exportData:()=>JSON.stringify({game:'zatuplay-grasuma',version:1,data}),validateExport,importData,get writable(){return writable}};
})();globalThis.BrowserStore=BrowserStore;
