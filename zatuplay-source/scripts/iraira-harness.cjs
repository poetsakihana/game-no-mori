'use strict';
// DOM, Canvas 2D, audio, clock, storage and Web Locks models. Not actual browser QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'../public/games/iraira-bo'),KEY='zatuplay-iraira-bo-v1';
class MemoryStorage{
 constructor(data={}){this.data=new Map(Object.entries(data));this.failRead=false;this.failWrite=false;this.writes=0;}
 getItem(k){if(this.failRead)throw Error('read denied');return this.data.get(k)??null;}
 setItem(k,v){if(this.failWrite)throw Error('quota');this.data.set(k,String(v));this.writes++;}
}
function locks(){let tail=Promise.resolve();return{request(n,fn){const p=tail.then(fn);tail=p.catch(()=>{});return p;}};}
function createHarness({storage=new MemoryStorage(),lockManager=locks(),deniedGetter=false,audio=true,model=true,canvas=true}={}){
 const dom=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8')),document=dom.document;
 let clock=0,hidden=false,active=document.body,confirmResult=true,reloads=0,raf=[];
 const events={},audioLog=[],drawLog=[],captures=new Map();
 Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'activeElement',{get:()=>active});
 dom.HTMLElement.prototype.focus=function(){active=this;};
 dom.HTMLElement.prototype.setPointerCapture=function(id){captures.set(id,this);};
 dom.HTMLElement.prototype.hasPointerCapture=function(id){return captures.get(id)===this;};
 dom.HTMLElement.prototype.releasePointerCapture=function(id){captures.delete(id);};
 const context=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>{if(k==='fillText')drawLog.push(args[0]);}),set:(o,k,v)=>(o[k]=v,true)});
 document.getElementById('game').getContext=()=>canvas?context:null;
 document.getElementById('game').getBoundingClientRect=()=>({left:0,top:0,width:360,height:800});
 class AudioContext{
  currentTime=0;destination={};resume(){audioLog.push('resume');return Promise.resolve();}suspend(){audioLog.push('suspend');return Promise.resolve();}
  createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){audioLog.push('start');},stop(t){audioLog.push(t===undefined?'stop':'schedule-stop');}};}
 }
 const sandbox={console,document,navigator:{locks:lockManager},performance:{now:()=>clock},structuredClone,Date,
  requestAnimationFrame:fn=>(raf.push(fn),raf.length),confirm:()=>confirmResult,location:{reload:()=>reloads++},
  addEventListener(type,fn){(events[type]||=[]).push(fn);}};
 if(audio)sandbox.AudioContext=AudioContext;sandbox.window=sandbox;
 Object.defineProperty(sandbox,'localStorage',{get(){if(deniedGetter)throw Error('blocked getter');return storage;}});
 vm.createContext(sandbox);
 if(model)vm.runInContext(fs.readFileSync(path.join(root,'model.js'),'utf8'),sandbox,{filename:'model.js'});
 vm.runInContext(fs.readFileSync(path.join(root,'game.js'),'utf8'),sandbox,{filename:'game.js'});
 const get=s=>document.querySelector(s);
 function emit(node,type,props={}){if(typeof node==='string')node=get(node);if(!node)throw Error('missing node');const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e;}
 function click(s){const n=typeof s==='string'?get(s):s;if(!n)throw Error('missing '+s);if(n.disabled)throw Error('disabled '+s);return emit(n,'click',{detail:1});}
 function act(id){return click(`[data-action="${id}"]`);}
 function windowEvent(type,props={}){const e={type,preventDefault(){},...props};for(const fn of events[type]||[])fn(e);}
 function advance(ms){clock+=ms;const pending=raf;raf=[];for(const fn of pending)fn(clock);}
 function pointer(type,x,y,id=1,extra={}){return emit('#game',type,{button:0,clientX:x,clientY:y,pointerId:id,...extra});}
 async function settle(){for(let i=0;i<50;i++)await Promise.resolve();}
 return{get,document,emit,click,act,windowEvent,advance,pointer,settle,storage,audioLog,drawLog,captures,
  value:()=>JSON.parse(storage.data.get(KEY)||'null'),status:()=>get('#save-status').textContent,
  visibility(v){hidden=v;emit(document,'visibilitychange');},setConfirm:v=>confirmResult=v,reloads:()=>reloads,
  clock:()=>clock};
}
module.exports={createHarness,MemoryStorage,locks,KEY,root};
