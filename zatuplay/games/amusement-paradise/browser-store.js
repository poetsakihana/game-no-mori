'use strict';
const BrowserStore=(()=>{
 const key='zatuplay:amusement-paradise3d:v1',ids=['coaster','wheel','carousel','cups','pirate','tower','train','bumper','swings','planes','balloonride','parachute','river','flume','rapids','haunted','space','submarine','cable','skycycle'];
 let data=null,writable=false,baseline=null,holding=false,importCommitted=false,reason='保存準備中';
 const status=s=>{reason=s;const el=document.getElementById('browserSaveStatus');if(el)el.textContent=s};
 function checked(x){
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error('記録形式が違います');
  const fields=['rides','skin','hand','period','muted','low','view','visits'];if(Object.keys(x).some(k=>!fields.includes(k)))throw Error('不明な記録項目です');
  if(!x.rides||typeof x.rides!=='object'||Array.isArray(x.rides))throw Error('乗車記録が不正です');
  const count=v=>Number.isSafeInteger(v)&&v>=0;const rides={};for(const [k,v]of Object.entries(x.rides)){if(!ids.includes(k)||!count(v))throw Error('乗車記録が不正です');rides[k]=v;}
  if(!Number.isInteger(x.skin)||x.skin<0||x.skin>4||![null,'ice','popcorn','cotton','balloon'].includes(x.hand)||!['day','sunset','night'].includes(x.period)||typeof x.muted!=='boolean'||typeof x.low!=='boolean'||!['seat','outside'].includes(x.view)||!count(x.visits))throw Error('記録値が不正です');
  return {rides,skin:x.skin,hand:x.hand,period:x.period,muted:x.muted,low:x.low,view:x.view,visits:x.visits};
 }
 function hydrate(){try{baseline=localStorage.getItem(key);data=baseline===null?null:checked(JSON.parse(baseline));writable=holding;status(writable?'このタブに自動保存します':'一時プレイ：別タブが保存中。JSONで保管できます')}catch(e){data=null;writable=false;status('一時プレイ：保存を読めません。元データは保持しています')}}
 async function ready(){
  if(!navigator.locks){hydrate();writable=false;status('一時プレイ：排他保存未対応。JSONで保管できます');return;}
  await new Promise(resolve=>{navigator.locks.request(key,{ifAvailable:true},async lock=>{holding=!!lock;hydrate();resolve();if(lock)await new Promise(()=>{});}).catch(()=>{writable=false;status('一時プレイ：保存権限を取得できません');resolve()});});
 }
 function persist(next){if(!writable)throw Error('一時プレイ中です。JSONで保管してください');try{if(localStorage.getItem(key)!==baseline)throw Error('保存が別の画面で変更されました');const raw=JSON.stringify(next);localStorage.setItem(key,raw);baseline=raw;}catch(e){writable=false;status('一時プレイ：保存できません。元データを上書きせずJSONで保管してください');throw e}}
 function setItem(k,v){if(k!==key)throw Error('別作品の保存キーです');if(importCommitted)return;const next=checked(JSON.parse(v));data=next;if(writable)persist(next);else status('一時プレイ：進行はJSONで保管してください。元保存は保持しています')}
 const bytes=s=>new TextEncoder().encode(s).length;
 function validateExport(text){if(typeof text!=='string'||bytes(text)>1000000)throw Error('JSONは1 MB以下にしてください');const x=JSON.parse(text);if(x?.game!=='zatuplay-amusement-paradise3d'||x.version!==1)throw Error('別作品または非対応の記録です');return checked(x.data)}
 function importData(text){const next=validateExport(text);persist(next);data=next;importCommitted=true;writable=false;status('復元しました。再読み込み中は旧ゲームの保存を停止します');}
 return {ready,getItem:k=>k===key&&data!==null?JSON.stringify(data):null,setItem,checked,validateExport,importData,exportData:()=>JSON.stringify({game:'zatuplay-amusement-paradise3d',version:1,data:checked(data||{rides:{},skin:0,hand:null,period:'day',muted:false,low:false,view:'seat',visits:0})}),get writable(){return writable},get status(){return reason}};
})();globalThis.BrowserStore=BrowserStore;
