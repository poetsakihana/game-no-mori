'use strict';
// DOM and deterministic audio/timer models. Not browser-layout or audible QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'../public/games/riddle-king');
const KEY='zatuplay-riddle-king-v1';
const questions=JSON.parse(fs.readFileSync(path.join(root,'questions.json'),'utf8'));
class MemoryStorage {
 constructor(data={}){this.data=new Map(Object.entries(data));this.failRead=false;this.failWrite=false;this.writes=0;}
 getItem(k){if(this.failRead)throw Error('read denied');return this.data.get(k)??null;}
 setItem(k,v){if(this.failWrite)throw Error('quota');this.data.set(k,String(v));this.writes++;}
}
function locks(){let tail=Promise.resolve();return{request(name,fn){const p=tail.then(fn);tail=p.catch(()=>{});return p;}};}
function createHarness({storage=new MemoryStorage(),lockManager=locks(),deniedGetter=false,audio=true,data=questions}={}){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),dom=parseHTML(html),document=dom.document;
 let hidden=false,active=document.body,confirmResult=true,clock=0,seq=0,revoked=0,reloads=0;
 const timers=new Map(),events={},downloads=[],audioLog=[];
 Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'activeElement',{get:()=>active});
 dom.HTMLElement.prototype.focus=function(){active=this;};dom.HTMLElement.prototype.blur=function(){active=document.body;};
 function addTimer(fn,ms,repeat=false){const id=++seq;timers.set(id,{fn,ms,at:clock+ms,repeat});return id;}
 class AudioContext {
  currentTime=0;destination={};
  resume(){audioLog.push('resume');return Promise.resolve();}suspend(){audioLog.push('suspend');return Promise.resolve();}
  createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  createOscillator(){return{frequency:{value:0},connect(){},start(){audioLog.push('start');},stop(t){audioLog.push(t===undefined?'stop':'schedule-stop');}};}
 }
 const sandbox={document,console,QUESTIONS:data,navigator:{locks:lockManager},Blob,
  URL:{createObjectURL(blob){downloads.push(blob);return 'blob:test';},revokeObjectURL(){revoked++;}},
  confirm:()=>confirmResult,location:{reload(){reloads++;}},
  setTimeout:(fn,ms)=>addTimer(fn,ms),clearTimeout:id=>timers.delete(id),
  setInterval:(fn,ms)=>addTimer(fn,ms,true),clearInterval:id=>timers.delete(id),
  addEventListener(type,fn){(events[type]||=[]).push(fn);}
 };
 if(audio)sandbox.AudioContext=AudioContext;sandbox.window=sandbox;
 Object.defineProperty(sandbox,'localStorage',{get(){if(deniedGetter)throw Error('blocked storage');return storage;}});
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'game.js'),'utf8'),sandbox,{filename:'game.js'});
 const get=s=>document.querySelector(s);
 function emit(node,type,props={}){if(typeof node==='string')node=get(node);if(!node)throw Error('missing node');const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e;}
 function click(s){const n=typeof s==='string'?get(s):s;if(!n)throw Error('missing '+s);if(n.disabled)throw Error('disabled '+s);return emit(n,'click');}
 function input(value){get('#answer').value=value;emit('#answer','input');}
 function windowEvent(type,props={}){for(const fn of events[type]||[])fn({type,...props});}
 function visibility(value){hidden=value;emit(document,'visibilitychange');}
 function advance(ms){const end=clock+ms;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;clock=next[1].at;if(next[1].repeat)next[1].at+=next[1].ms;else timers.delete(next[0]);next[1].fn();}clock=end;}
 async function settle(){for(let i=0;i<35;i++)await Promise.resolve();}
 return{document,get,emit,click,input,storage,settle,visibility,windowEvent,advance,timers,downloads,audioLog,
  status:()=>get('#save-status').textContent,value:()=>JSON.parse(storage.data.get(KEY)||'null'),setConfirm:v=>confirmResult=v,
  revoked:()=>revoked,reloads:()=>reloads};
}
module.exports={createHarness,MemoryStorage,locks,KEY,root,questions};
