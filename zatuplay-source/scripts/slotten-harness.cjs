'use strict';
// Deterministic DOM/event/storage model. Not Chrome, native file-picker or audio QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'../public/games/slotten'),KEY='zatuplay:slotten:v1';
class MemoryStorage{
 constructor(data={}){this.data=new Map(Object.entries(data));this.failRead=false;this.failWrite=false;this.failKey=null;this.writes=0}
 getItem(k){if(this.failRead)throw Error('denied');return this.data.get(k)??null}
 setItem(k,v){if(this.failWrite||this.failKey===k){const e=Error('quota');e.name='QuotaExceededError';throw e}this.data.set(k,String(v));this.writes++}
}
function locks(){let tail=Promise.resolve();return{request(name,options,fn){const p=tail.then(fn);tail=p.catch(()=>{});return p}}}
function createHarness({storage=new MemoryStorage(),lockManager=locks(),sourceDir=root,random=[0,1,2],audio=null}={}){
 const dom=parseHTML(fs.readFileSync(path.join(sourceDir,'index.html'),'utf8')),document=dom.document;
 let hidden=false,active=document.body,confirmation=true,clock=0,seq=0,randomIndex=0;
 const timers=new Map(),frames=new Map(),events={},downloads=[],confirmations=[];
 Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'activeElement',{get:()=>active});
 dom.HTMLElement.prototype.focus=function(){active=this};
 const value=Object.getOwnPropertyDescriptor(dom.HTMLSelectElement.prototype,'value');
 if(!value?.set)Object.defineProperty(dom.HTMLSelectElement.prototype,'value',{configurable:true,get(){return [...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.getAttribute('value')??this.querySelector('option')?.getAttribute('value')??''},set(v){for(const o of this.querySelectorAll('option')){if(o.getAttribute('value')===String(v))o.setAttribute('selected','');else o.removeAttribute('selected')}}});
 const dialog=document.getElementById('settingsDialog');dialog.open=false;dialog.showModal=()=>{dialog.open=true};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new dom.Event('close'))};
 const sandbox={document,console,navigator:{locks:lockManager},localStorage:storage,Blob,Uint32Array,URL:{createObjectURL(b){downloads.push(b);return 'blob:test-'+downloads.length},revokeObjectURL(){}},performance:{now:()=>clock},crypto:{getRandomValues(a){a[0]=random[randomIndex++%random.length];return a}},AudioContext:audio,confirm(t){confirmations.push(t);return typeof confirmation==='function'?confirmation(t):confirmation},setTimeout(fn,ms=0){const id=++seq;timers.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){const id=++seq;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),addEventListener(type,fn){(events[type]||=[]).push(fn)}};sandbox.window=sandbox;
 vm.createContext(sandbox);const run=s=>vm.runInContext(s,sandbox);
 for(const f of ['engine.js','core.js','storage.js','browser.js'])vm.runInContext(fs.readFileSync(path.join(sourceDir,f),'utf8'),sandbox,{filename:f});
 const get=id=>document.getElementById(id);
 function emit(node,type,props={}){if(typeof node==='string')node=get(node);const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e}
 function click(node){if(typeof node==='string')node=get(node);if(node.disabled)return;return emit(node,'click')}
 function advance(ms=0){const end=clock+ms;let n=0;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;if(++n>10000)throw Error('timer loop');clock=next[1].at;timers.delete(next[0]);next[1].fn()}clock=end}
 function frame(ms=1000/60){advance(ms);const ready=[...frames.values()];frames.clear();for(const f of ready)f(clock)}
 function windowEvent(type,props={}){const e={type,target:document.body,preventDefault(){},...props};for(const f of events[type]||[])f(e)}
 async function settle(){for(let i=0;i<90;i++)await Promise.resolve();await run('SlotTenStore.flush()');for(let i=0;i<20;i++)await Promise.resolve()}
 async function importRaw(raw){const input=get('fileInput');Object.defineProperty(input,'files',{configurable:true,value:[{size:Buffer.byteLength(raw),text:async()=>raw}]});await input.onchange({target:input});await settle()}
 return {document,get,run,click,emit,advance,frame,settle,storage,windowEvent,downloads,confirmations,importRaw,timers,frames,
  state:()=>JSON.parse(run('JSON.stringify(slotState)')),status:()=>get('saveStatus').textContent,setConfirm:v=>confirmation=v,
  visibility(v){hidden=v;emit(document,'visibilitychange')},setRandom(values){random=values;randomIndex=0}
 };
}
module.exports={root,KEY,createHarness,MemoryStorage,locks};
