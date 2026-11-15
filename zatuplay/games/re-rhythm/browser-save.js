(function(root){
'use strict';
const prefix='zatuplay-re-rhythm:',revisionKey=prefix+'revision';
const keys=['rhythm-browser-settings-v1','rhythm-perfect-records','rhythm-perfect-campaign','rhythm-season-v1','rhythm-unlock-all-v1','rhythm-lab-v2','rhythm-player-name-v1','rhythm-narration-v1','rhythm-party-rings-v1','rhythm-lab-campaign-v1','rhythm-side-records','rhythm-spell-v1','re-miracle-v1',...Array.from({length:10},(_,i)=>'rhythm-composition-'+i)];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v), num=(v,min=0,max=1e9)=>Number.isFinite(v)&&v>=min&&v<=max;
function validate(k,s){
 if(!keys.includes(k)||typeof s!=='string'||s.length>200000)throw Error('未対応または大きすぎる記録です');
 if(k==='rhythm-player-name-v1'){if(s.length>80)throw Error('名前が長すぎます');return s;}
 if(k==='rhythm-unlock-all-v1'){if(!['true','false'].includes(s))throw Error('全解放設定が不正です');return s;}
 if(k==='rhythm-lab-campaign-v1'){if(!/^\d+$/.test(s)||!num(+s,0,82))throw Error('進行が不正です');return s;}
 const v=JSON.parse(s);if(!obj(v))throw Error('記録の形式が不正です');
 function walk(x,depth=0){if(depth>8)throw Error('記録が深すぎます');if(typeof x==='number'&&!num(x,-1e9,1e9))throw Error('数値が不正です');if(typeof x==='string'&&x.length>1000)throw Error('文字列が長すぎます');if(x&&typeof x==='object'){if(Object.keys(x).length>1000)throw Error('項目が多すぎます');for(const [a,b]of Object.entries(x)){if(['__proto__','constructor','prototype'].includes(a))throw Error('不正なキーです');walk(b,depth+1);}}}walk(v);
 if(k==='re-miracle-v1'&&!(v.version===1&&num(v.xp)&&obj(v.best)&&obj(v.seen)&&Array.isArray(v.recent)&&v.recent.length<=20&&v.recent.every(n=>num(n,0,100))&&Object.entries(v.best).every(([a,b])=>/^[0-7]-(trail|boss)$/.test(a)&&num(b,0,100))&&['星のタクト','月のタクト','虹のタクト'].includes(v.equipment)&&num(v.norikan,0,140)))throw Error('冒険記録が不正です');
 if(k==='rhythm-season-v1'&&!(typeof v.month==='string'&&num(v.highWater,0,82)&&num(v.xp)&&num(v.stars)&&obj(v.missions)&&['clears','high','perfect'].every(a=>num(v.missions[a]))&&Array.isArray(v.claimed)&&v.claimed.every(a=>['clears','high','perfect'].includes(a))))throw Error('育成記録が不正です');
 if(k==='rhythm-lab-v2'&&!Object.values(v).every(a=>obj(a)&&num(a.score,0,100)&&typeof a.perfect==='boolean'))throw Error('ステージ記録が不正です');
 if(k==='rhythm-perfect-records'&&!Object.values(v).every(a=>obj(a)&&['unlocked','night','star'].every(t=>typeof a[t]==='boolean')&&num(a.streak,0,1000)))throw Error('挑戦結果が不正です');
 if(k==='rhythm-side-records'&&!Object.values(v).every(a=>num(a)))throw Error('サブゲーム結果が不正です');
 if(k==='rhythm-party-rings-v1'&&!Object.values(v).every(a=>typeof a==='boolean'))throw Error('リング記録が不正です');
 if(k==='rhythm-browser-settings-v1'&&!(Object.keys(v).length===7&&['voice','guide','bgmon'].every(a=>typeof v[a]==='boolean')&&['volume','bgmvolume','sfxvolume'].every(a=>num(v[a],0,100))&&num(v.offset,-200,200)))throw Error('音量・操作設定が不正です');
 if(k==='rhythm-spell-v1'&&!num(v.cleared,0,100))throw Error('章記録が不正です');
 if(k==='rhythm-narration-v1'&&!(['off','normal','verbose'].includes(v.mode)&&num(+v.volume,0,100)&&num(+v.rate,.1,4)))throw Error('読み上げ設定が不正です');
 if(k.startsWith('rhythm-composition-')&&!(Array.isArray(v.cells)&&v.cells.length===64&&v.cells.every(a=>typeof a==='boolean')&&num(v.tempo,30,300)))throw Error('作曲データが不正です');
 if(k==='rhythm-perfect-campaign'&&!(num(v.failures,0,3)&&num(v.otherPlays,0,5)&&(v.target===null||typeof v.target==='string')))throw Error('挑戦記録が不正です');
 return s;
}
function createStore(getStore,notice=()=>{}){
 let native=null,rev=null,blocked=false;const memory=new Map();
 try{native=getStore();rev=native.getItem(revisionKey);}catch{notice('保存を利用できません。一時プレイ中です。終了前に記録を書き出してください。');}
 function check(){if(blocked)throw Error('保存を停止しています。記録を書き出してから再読込してください');if(native&&native.getItem(revisionKey)!==rev){blocked=true;throw Error('別タブが保存を更新しました。このタブの保存を停止しました');}}
 function getItem(k){if(!keys.includes(k))return null;if(memory.has(k))return memory.get(k);try{const s=native?.getItem(prefix+k)??null;if(s!==null)validate(k,s);memory.set(k,s);return s;}catch(e){blocked=true;notice('不正な保存記録を保護しました。原本は変更していません。'+e.message);return null;}}
 function setItem(k,s){s=String(s);validate(k,s);memory.set(k,s);try{check();if(!native){notice('一時プレイ中。記録は端末へ保存されていません。書出しをご利用ください。');return;}const next=String(Date.now())+'-'+Math.random();native.setItem(prefix+k,s);native.setItem(revisionKey,next);rev=next;}catch(e){notice(e.message);throw e;}}
 function backup(){const storage={};for(const k of keys){const s=getItem(k);if(s!==null)storage[k]=s;}return {format:'re-miracle-backup',version:1,created:new Date().toISOString(),storage};}
 function parseBackup(b){if(!obj(b)||b.format!=='re-miracle-backup'||b.version!==1||!obj(b.storage)||!Object.keys(b.storage).length)throw Error('対応するセーブではありません');for(const [k,s]of Object.entries(b.storage))validate(k,s);return b.storage;}
 function restore(b){const data=parseBackup(b);check();if(!native)throw Error('保存を使えるブラウザで復元してください');const old={};for(const k of Object.keys(data))old[k]=native.getItem(prefix+k);const oldRev=rev;try{for(const [k,s]of Object.entries(data))native.setItem(prefix+k,s);rev=String(Date.now())+'-'+Math.random();native.setItem(revisionKey,rev);for(const [k,s]of Object.entries(data))memory.set(k,s);}catch(e){let rollback=true;for(const [k,s]of Object.entries(old)){try{s===null?native.removeItem(prefix+k):native.setItem(prefix+k,s);}catch{rollback=false;}}rev=oldRev;blocked=true;notice(rollback?'復元失敗。以前の保存を復旧しました。':'復元に失敗し完全な復旧を確認できません。元のJSONを保管してください。');throw e;}}
 return {getItem,setItem,backup,restore,parseBackup,get blocked(){return blocked;}};
}
const api={createStore,validate,keys,prefix};if(typeof module!=='undefined')module.exports=api;
if(root.document){const notice=m=>{const el=root.document.getElementById('web-save-status');if(el)el.textContent=m;};root.rhythmStorage=createStore(()=>root.localStorage,notice);root.ReBrowserSave=api;}
})(typeof window==='undefined'?globalThis:window);
