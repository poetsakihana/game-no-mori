'use strict';
// DOM/input/time/audio models with actual native Canvas2D; not Chrome or CSS layout.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'system-ui');
const root=path.resolve(__dirname,'../public/games/fly-battle'),core={};vm.createContext(core);vm.runInContext(fs.readFileSync(path.join(root,'core.js'),'utf8'),core);const C=core.FlyBattle;
class MemoryStorage{constructor(){this.data=new Map();this.writes=0;this.failRead=false;this.failWrite=false;}getItem(key){if(this.failRead)throw Error('read denied');return this.data.get(key)??null;}setItem(key,value){if(this.failWrite)throw Error('write denied');this.data.set(key,String(value));this.writes++;}}
function lockManager(){let held=false;return{async request(name,opts,callback){if(held)return callback(null);held=true;try{return await callback({name});}finally{held=false;}}};}
function fixture(state){const storage=new MemoryStorage();storage.setItem(C.KEY,C.encode(state));return storage;}
function harness({storage=new MemoryStorage(),locks=lockManager(),audio=true,deniedGetter=false,frameMs=50,audioReject=false}={}){
 const {document,HTMLElement,Event}=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8'));const canvas=createCanvas(1000,650),timers=new Map(),events={},downloads=[],audioLog=[];let clock=0,seq=0,active=document.body,hidden=false,reloads=0;
 Object.defineProperty(document,'activeElement',{get:()=>active});Object.defineProperty(document,'hidden',{get:()=>hidden});HTMLElement.prototype.focus=function(){active=this;};HTMLElement.prototype.showModal=function(){this.open=true;};HTMLElement.prototype.close=function(){this.open=false;};
 $('game').getContext=()=>canvas.getContext('2d');
 class FakeAudio{constructor(src){this.src=src;this.paused=true;this.volume=1;this.playbackRate=1;}addEventListener(){}play(){this.paused=false;audioLog.push({action:'play',src:this.src,rate:this.playbackRate,volume:this.volume});return audioReject?Promise.reject(Error('rejected')):Promise.resolve();}pause(){this.paused=true;audioLog.push({action:'pause',src:this.src});}}
 class FakeDate extends Date{static now(){return 1794470000000+clock;}}
 const timer=(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:clock+ms});return id;};
 const sandbox={document,console,Math,Date:FakeDate,performance:{now:()=>clock},navigator:{locks},Blob,URL:{createObjectURL(blob){downloads.push(blob);return'blob:test';},revokeObjectURL(){}},location:{reload(){reloads++;}},setTimeout:timer,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>timer(()=>fn(clock),frameMs),addEventListener(type,fn){(events[type]||=[]).push(fn);}};
 if(audio)sandbox.Audio=FakeAudio;sandbox.window=sandbox;Object.defineProperty(sandbox,'localStorage',{get(){if(deniedGetter)throw Error('storage denied');return storage;}});vm.createContext(sandbox);
 for(const file of ['core.js','render.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
 function $(id){return document.getElementById(id);}function get(sel){return document.querySelector(sel);}function emit(node,type,props={}){if(typeof node==='string')node=get(node);if(!node)throw Error('Missing target '+type);const e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e;}
 function click(sel){const n=typeof sel==='string'?get(sel):sel;if(!n||n.disabled)throw Error('Not clickable '+sel);emit(n,'click');}
 function advance(ms){const end=clock+ms;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;clock=next[1].at;timers.delete(next[0]);next[1].fn();}clock=end;}
 function gap(ms){clock+=ms;const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(next){timers.delete(next[0]);next[1].fn();}}
 const windowEvent=(type,props={})=>{for(const fn of events[type]||[])fn({type,...props});};
 async function settle(){for(let i=0;i<30;i++)await Promise.resolve();}
 return{document,get,emit,click,advance,gap,settle,windowEvent,storage,downloads,audioLog,canvas,clock:()=>clock,reloads:()=>reloads,raw:()=>storage.getItem(C.KEY),state:()=>C.decode(storage.getItem(C.KEY)).state,png(file){fs.writeFileSync(file,canvas.toBuffer('image/png'));},visibility(value){hidden=value;emit(document,'visibilitychange');},async importText(text){const node=$('import');Object.defineProperty(node,'files',{configurable:true,value:[{size:Buffer.byteLength(text),text:async()=>text}]});emit(node,'change');await settle();},key(key,props={}){return emit(document,'keydown',{key,...props});}};
}
module.exports={C,root,harness,MemoryStorage,lockManager,fixture};
