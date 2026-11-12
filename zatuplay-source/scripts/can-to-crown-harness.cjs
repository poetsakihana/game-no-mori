'use strict';
// Deterministic DOM + actual Canvas2D. Not a browser, CSS layout, or audio device.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'system-ui');
const root=path.resolve(__dirname,'../public/games/can-to-crown');
class MemoryStorage{constructor(){this.data=new Map();this.failRead=false;this.failWrite=false;this.writes=0;}getItem(k){if(this.failRead)throw Error('denied');return this.data.get(k)??null;}setItem(k,v){if(this.failWrite)throw Error('quota');this.data.set(k,String(v));this.writes++;}}
function lockManager(){let held=false;return{async request(name,options,fn){if(held)return fn(null);held=true;try{return await fn({name});}finally{held=false;}}};}
const coreContext={};vm.createContext(coreContext);vm.runInContext(fs.readFileSync(path.join(root,'core.js'),'utf8'),coreContext);const C=coreContext.CrownCore;
function harness({storage=new MemoryStorage(),locks=lockManager(),deniedGetter=false,audio=true,dataFailure=false,malformed=false}={}){
 const {document,HTMLElement,Event}=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8'));
 let active=document.body,hidden=false,clock=0,seq=0,reloads=0;const timers=new Map(),events={},audioLog=[],downloads=[],canvas=createCanvas(800,1600);
 Object.defineProperty(document,'activeElement',{get:()=>active});Object.defineProperty(document,'hidden',{get:()=>hidden});
 HTMLElement.prototype.focus=function(){active=this;};HTMLElement.prototype.showModal=function(){this.open=true;};HTMLElement.prototype.close=function(){this.open=false;};
 document.getElementById('game').getContext=()=>canvas.getContext('2d');
 const addTimer=(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:clock+ms});return id;};
 class ClockDate extends Date{static now(){return 1794470000000+clock;}}
 class AudioContext{constructor(){this.state='running';this.currentTime=0;this.destination={};}resume(){this.state='running';audioLog.push('resume');return Promise.resolve();}suspend(){this.state='suspended';audioLog.push('suspend');return Promise.resolve();}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}createOscillator(){return{frequency:{value:0},connect(){},disconnect(){},start(){audioLog.push('start');},stop(){audioLog.push('stop');}};}}
 const sandbox={document,console,Date:ClockDate,Math,performance:{now:()=>clock},navigator:{locks},AbortController,TextEncoder,Blob,
  location:{reload(){reloads++;}},URL:{createObjectURL(blob){downloads.push(blob);return 'blob:fake';},revokeObjectURL(){}},
  setTimeout:addTimer,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>addTimer(()=>fn(clock),50),
  addEventListener(type,fn){(events[type]||=[]).push(fn);},
  fetch:async()=>{if(dataFailure)throw Error('network failure');return{ok:true,text:async()=>malformed?'{}':fs.readFileSync(path.join(root,'reference/original-data.json'),'utf8')};}
 };
 if(audio)sandbox.AudioContext=AudioContext;sandbox.window=sandbox;
 Object.defineProperty(sandbox,'localStorage',{get(){if(deniedGetter)throw Error('getter denied');return storage;}});
 vm.createContext(sandbox);sandbox.crownLoadFailed=()=>{};sandbox.crownLoadTimer=addTimer(()=>{},15000);
 for(const name of ['core.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
 const get=s=>document.querySelector(s),emit=(node,type,props={})=>{if(typeof node==='string')node=get(node);if(!node)throw Error('No event target '+type);const e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e;};
 function click(selector){const n=typeof selector==='string'?get(selector):selector;if(!n||n.disabled)throw Error('Not clickable '+selector);emit(n,'click');}
 function advance(ms){const end=clock+ms;while(true){const item=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!item||item[1].at>end)break;clock=item[1].at;timers.delete(item[0]);item[1].fn();}clock=end;}
 function gap(ms){clock+=ms;const next=[...timers.entries()].find(([,v])=>v.at<=clock);if(next){timers.delete(next[0]);next[1].fn();}}
 async function settle(){for(let i=0;i<30;i++)await Promise.resolve();}
 const windowEvent=(type,props={})=>{for(const fn of events[type]||[])fn({type,...props});};
 return{document,get,emit,click,advance,gap,settle,windowEvent,canvas,storage,downloads,audioLog,root,
  visibility(v){hidden=v;emit(document,'visibilitychange');},state(){return C.decode(storage.getItem(C.KEY)).state;},raw(){return storage.getItem(C.KEY);},png(file){fs.writeFileSync(file,canvas.toBuffer('image/png'));},reloads:()=>reloads,
  async importText(text,name='save.json'){const n=get('#import');Object.defineProperty(n,'files',{configurable:true,value:[{name,size:Buffer.byteLength(text),text:async()=>text}]});await n.onchange();await settle();},
  dialogButton(text){const node=[...document.querySelectorAll('#dialog-actions button')].find(n=>n.textContent===text);click(node);},
 };
}
module.exports={harness,MemoryStorage,lockManager,C,root,data:JSON.parse(fs.readFileSync(path.join(root,'reference/original-data.json'),'utf8'))};
