/* Browser port 1.25-web.1. Preserve unreadable data instead of silently replacing it. */
'use strict';
const rhythmStorage = (() => {
  let store=null,blocked=false,message='',writes=0;
  const seen=new Map(), memory=new Map();
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const number=(v,a=0,b=Number.MAX_SAFE_INTEGER)=>Number.isFinite(v)&&v>=a&&v<=b;
  const safeKeys=o=>object(o)&&Object.keys(o).every(k=>!['__proto__','prototype','constructor'].includes(k));
  const map=(v,fn)=>safeKeys(v)&&Object.values(v).every(fn);
  const stage=k=>/^(?:[1-9]|1[0-6])-[1-5]$|^extra-[12]$/.test(k);
  const stages=(o,fn)=>map(o,fn)&&Object.keys(o).every(stage);
  function valid(k,raw){
    if(k==='rhythm-player-name-v1')return raw.length<=200;
    if(k==='rhythm-unlock-all-v1'||k==='rhythm-setting-guide'||k==='rhythm-setting-bgmon'||k==='rhythm-setting-voice')return ['true','false'].includes(raw);
    if(k==='rhythm-effects-v2')return ['on','off'].includes(raw);
    if(k.startsWith('rhythm-setting-'))return raw.trim()!==''&&number(Number(raw),k.endsWith('offset')?-200:0,k.endsWith('offset')?200:100);
    if(k==='rhythm-lab-campaign-v1')return /^\d+$/.test(raw)&&number(Number(raw),0,82);
    const v=JSON.parse(raw);
    if(k==='rhythm-lab-v2')return stages(v,p=>safeKeys(p)&&number(p.score,0,100)&&(p.perfect===undefined||typeof p.perfect==='boolean'));
    if(k==='rhythm-perfect-records')return stages(v,p=>safeKeys(p)&&typeof p.unlocked==='boolean'&&Number.isInteger(p.streak)&&number(p.streak,0,3)&&typeof p.night==='boolean'&&typeof p.star==='boolean');
    if(k==='rhythm-perfect-campaign')return safeKeys(v)&&(v.target===null||stage(v.target))&&number(v.failures,0,3)&&number(v.otherPlays,0,5)&&(v.lastAttempt===null||typeof v.lastAttempt==='string');
    if(k==='rhythm-season-v1')return safeKeys(v)&&typeof v.month==='string'&&number(v.highWater,0,82)&&number(v.xp)&&number(v.stars)&&safeKeys(v.missions)&&['clears','high','perfect'].every(x=>number(v.missions[x]))&&Array.isArray(v.claimed)&&v.claimed.every(x=>['clears','high','perfect'].includes(x));
    if(k==='rhythm-side-records')return map(v,n=>number(n));
    if(k==='rhythm-spell-v1')return safeKeys(v)&&Number.isInteger(v.cleared)&&number(v.cleared,0,8);
    if(k==='rhythm-party-rings-v1')return map(v,x=>typeof x==='boolean')&&Object.keys(v).every(x=>/^[0-9]:[1-3]$/.test(x));
    if(k==='rhythm-narration-v1')return safeKeys(v)&&['off','normal','verbose'].includes(v.mode)&&number(v.volume,0,100)&&number(v.rate,.5,2);
    if(k.startsWith('rhythm-composition-'))return safeKeys(v)&&Array.isArray(v.cells)&&v.cells.length===64&&v.cells.every(x=>typeof x==='boolean')&&number(v.tempo,60,180);
    return false;
  }
  function paint(){const el=document.getElementById('browser-save-status');if(el){el.textContent=message||'記録はこのブラウザに保存します。';el.dataset.state=blocked?'blocked':writes?'saved':'ready';}}
  function fail(text){blocked=true;message=text;paint();}
  try{store=window.localStorage;}catch{fail('保存領域を利用できません。このタブ内だけで遊べます。ページを閉じると今回の記録は失われます。');}
  function getItem(k){
    if(memory.has(k))return memory.get(k);
    if(!store)return null;
    let raw;try{raw=store.getItem(k);}catch{fail('保存の読込が拒否されました。元データは変更せず、このタブ内だけで遊べます。');return null;}
    if(!seen.has(k))seen.set(k,raw);
    if(raw===null)return null;
    try{if(valid(k,raw))return raw;}catch{}
    fail('保存データの形式を確認できません。元データを保護するため、このタブからの保存を停止しました。サイトデータを消さず、別タブを閉じて再読込してください。');
    return null;
  }
  function setItem(k,value){
    const raw=String(value);memory.set(k,raw);
    if(blocked)throw Error('Browser save protection active');
    try{
      if(!valid(k,raw))throw Error('Invalid save data');
      if(!seen.has(k))getItem(k);
      if(blocked)throw Error('Browser save protection active');
      if(store.getItem(k)!==seen.get(k)){fail('別タブで記録が変わったため保存を停止しました。このタブの変更は未保存です。別タブを閉じて再読込してください。');throw Error('Concurrent save');}
      store.setItem(k,raw);seen.set(k,raw);writes++;message='このブラウザに保存しました。プレイ途中の状態は保存されません。';paint();
    }catch(e){if(!blocked)fail('保存できませんでした。元データは自動削除しません。このタブの新しい記録は未保存です。空き容量やブラウザの保存設定を確認してください。');throw e;}
  }
  // Validate every original key before any original startup autosave runs.
  for(const k of ['rhythm-lab-v2','rhythm-lab-campaign-v1','rhythm-perfect-records','rhythm-perfect-campaign','rhythm-season-v1','rhythm-side-records','rhythm-player-name-v1','rhythm-spell-v1','rhythm-party-rings-v1','rhythm-narration-v1','rhythm-unlock-all-v1','rhythm-effects-v2',...[1,3,5].map(i=>'rhythm-composition-'+i),...['volume','guide','offset','bgmon','bgmvolume','sfxvolume','voice'].map(x=>'rhythm-setting-'+x)])getItem(k);
  window.addEventListener('storage',e=>{if(e.key===null||e.key?.startsWith('rhythm-'))fail('別タブで保存データが変更されました。このタブの保存を止めました。再読込して最新記録を読み込んでください。');});
  return {getItem,setItem,paint,get blocked(){return blocked;}};
})();
const RhythmBrowser={paused:false,pendingSide:0,timers:new Map(),nextTimer:1,
 setTimeout(fn,delay=0){const id=this.nextTimer++,t={fn,left:delay,at:performance.now(),native:null};this.timers.set(id,t);this.arm(id,t);return id;},
 arm(id,t){if(this.paused)return;t.at=performance.now();t.native=setTimeout(()=>{if(this.paused||this.checkGap?.())return;this.timers.delete(id);t.fn();},Math.max(0,t.left));},
 clearTimeout(id){const t=this.timers.get(id);if(t){clearTimeout(t.native);this.timers.delete(id);}},
 freezeTimers(){for(const t of this.timers.values()){clearTimeout(t.native);t.left=Math.max(0,t.left-(performance.now()-t.at));}},
 resumeTimers(){for(const [id,t] of this.timers)this.arm(id,t);},
 clearTimers(){for(const id of this.timers.keys())this.clearTimeout(id);}
};
