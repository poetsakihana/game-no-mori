'use strict';
const EtoStore=(()=>{
 const KEY='zatuplay:eto-race:1',LIMIT=32768;
 const fresh=()=>({version:1,points:100,races:0,hits:0,cleared:[],xp:Array(12).fill(0),stats:Array.from({length:12},(_,i)=>[56+(i*7%20),55+(i*11%22),57+(i*5%19)]),history:[]});
 const blank=()=>({state:fresh(),sound:false});const copy=v=>JSON.parse(JSON.stringify(v));
 const exact=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...k].sort().join('|');const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
 function check(v){if(!exact(v,['state','sound'])||typeof v.sound!=='boolean')throw Error('記録の形式が違います');const s=v.state;if(!exact(s,['version','points','races','hits','cleared','xp','stats','history'])||s.version!==1||!int(s.points,0,1e9)||!int(s.races,0,1e9)||!int(s.hits,0,s.races)||!Array.isArray(s.xp)||s.xp.length!==12||s.xp.some(x=>!int(x,0,1160))||!Array.isArray(s.stats)||s.stats.length!==12||s.stats.some(a=>!Array.isArray(a)||a.length!==3||a.some(n=>!int(n,0,95)))||!Array.isArray(s.cleared)||s.cleared.length>12||new Set(s.cleared).size!==s.cleared.length||s.cleared.some(n=>!int(n,0,11))||!Array.isArray(s.history)||s.history.length>20||s.history.some(x=>typeof x!=='string'||x.length>=200))throw Error('記録に不正な値があります');return copy(v)}
 function decode(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).length>LIMIT)throw Error('32KB以下のJSONを選んでください');const d=JSON.parse(raw);if(!exact(d,['format','version','data','previous'])||d.format!=='eto-browser'||d.version!==1)throw Error('このブラウザ版の保存ではありません');return {data:check(d.data),previous:d.previous===null?null:check(d.previous)}}
 const encode=(data,previous=null)=>JSON.stringify({format:'eto-browser',version:1,data:check(data),previous:previous===null?null:check(previous)});
 let data=blank(),previous=null,baseline=null,phase='loading',owner=false,releaseLock,listen=()=>{};
 try{baseline=localStorage.getItem(KEY);if(baseline!==null){let d=decode(baseline);data=d.data;previous=d.previous}}catch{phase=baseline===null?'unavailable':'corrupt'}
 const initial=copy(data),notify=()=>listen(phase),set=p=>{phase=p;notify()};let departed=false,dirty=false;
 const ready=(async()=>{if(phase!=='loading')return;if(!navigator.locks){set('memory');return}await new Promise(resolve=>{navigator.locks.request(KEY,{ifAvailable:true},async lock=>{if(!lock||departed){set('memory');resolve();return}owner=true;set('saved');if(dirty)write(data);resolve();await new Promise(r=>releaseLock=r)}).catch(()=>{owner=false;set('memory');resolve()})})})();
 function write(next,{replace=false}={}){next=check(next);dirty=true;const old=data;data=copy(next);if(replace)previous=old;if(!owner||!['saved','quota'].includes(phase)){notify();return false}try{if(localStorage.getItem(KEY)!==baseline){owner=false;set('conflict');return false}let text=encode(data,previous);localStorage.setItem(KEY,text);baseline=text;dirty=false;set('saved');return true}catch{set('quota');return false}}
 function release(){departed=true;owner=false;if(releaseLock){releaseLock();releaseLock=null}if(['loading','saved','quota'].includes(phase))set('memory')}
 addEventListener('storage',e=>{if(e.key===KEY&&e.newValue!==baseline){owner=false;set('conflict')}});
 return {KEY,LIMIT,blank,check,decode,encode,initial,ready,write,release,subscribe(fn){listen=fn;notify()},get previous(){return previous&&copy(previous)},get raw(){return baseline},get phase(){return phase}};
})();
