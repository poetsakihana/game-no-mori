'use strict';
// DOM/storage/locks/event models. This is not Chrome or real pointer-device verification.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'../public/games/fryfriends'),KEY='zatuplay:fryfriends:v1';
class MemoryStorage{constructor(data={}){this.data=new Map(Object.entries(data));this.failRead=false;this.failWrite=false;this.failKey=null;this.writes=0;}getItem(k){if(this.failRead)throw Error('denied');return this.data.get(k)??null}setItem(k,v){if(this.failWrite||this.failKey===k){const e=Error('quota');e.name='QuotaExceededError';throw e}this.data.set(k,String(v));this.writes++}}
function locks(){let tail=Promise.resolve();return{request(n,o,f){const p=tail.then(f);tail=p.catch(()=>{});return p}}}
function createHarness({storage=new MemoryStorage(),lockManager=locks(),seed=17,audio='none'}={}){
 const dom=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8')),document=dom.document;
 let active=document.body,hidden=false,confirmation=true,clock=0,seq=0,point=null,random=seed;
 const events={},timers=new Map(),downloads=[],confirmations=[];
 Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'activeElement',{get:()=>active});document.elementFromPoint=()=>point;
 dom.HTMLElement.prototype.focus=function(){active=this};dom.HTMLElement.prototype.scrollIntoView=function(){};
 const modal=document.getElementById('modal');Object.defineProperty(modal,'open',{get(){return this.hasAttribute('open')}});modal.showModal=function(){this.setAttribute('open','')};modal.close=function(){this.removeAttribute('open');this.dispatchEvent(new dom.Event('close'))};
 const math=Object.create(Math);math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296};
 const sandbox={document,console,Math:math,navigator:{locks:lockManager},localStorage:storage,Blob,URL:{createObjectURL(b){downloads.push(b);return 'blob:test-'+downloads.length},revokeObjectURL(){}},confirm(s){confirmations.push(s);return confirmation},setTimeout(fn,ms=0){const id=++seq;timers.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>timers.delete(id),addEventListener(t,fn){(events[t]||=[]).push(fn)}};
 if(audio!=='none')sandbox.AudioContext=function(){if(audio==='throw')throw Error('audio denied');this.currentTime=0;this.destination={};this.resume=()=>Promise.reject(Error('resume denied'));this.suspend=()=>Promise.reject(Error('suspend denied'));this.createOscillator=()=>({connect(){},frequency:{value:0},start(){},stop(){},disconnect(){}});this.createGain=()=>({connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}})};
 sandbox.window=sandbox;vm.createContext(sandbox);const run=s=>vm.runInContext(s,sandbox);
 for(const f of ['content.js','storage.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f});
 const get=id=>document.getElementById(id);
 function emit(node,type,props={}){if(typeof node==='string')node=get(node);const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{detail:0,...props});node.dispatchEvent(e);return e}
 function click(node){if(typeof node==='string')node=get(node);if(!node)throw Error('missing click target');if(node.disabled)return;return emit(node,'click')}
 function pointer(type,tile,props={}){const board=document.querySelector('.board'),node=tile===null?board:document.querySelector(`[data-tile="${tile}"]`);point=node;const e={target:node,pointerId:1,pointerType:'mouse',button:0,clientX:10,clientY:10,preventDefault(){},...props};board['on'+type]?.(e)}
 function windowEvent(t,props={}){for(const f of events[t]||[])f({type:t,preventDefault(){},...props})}
 async function settle(){for(let i=0;i<120;i++)await Promise.resolve();await run('FryStore.flush()')}
 async function importRaw(raw){const input=get('importFile');Object.defineProperty(input,'files',{configurable:true,value:[{size:Buffer.byteLength(raw),text:async()=>raw}]});await input.onchange({target:input});await settle()}
 return {document,get,run,emit,click,pointer,windowEvent,settle,importRaw,storage,downloads,confirmations,state:()=>JSON.parse(run('JSON.stringify(snapshot())')),game:()=>JSON.parse(run('JSON.stringify(game)')),setConfirm(v){confirmation=v},status:()=>get('saveStatus').textContent,visibility(v){hidden=v;emit(document,'visibilitychange')},advance(ms=0){clock+=ms;for(const [id,t] of timers)if(t.at<=clock){timers.delete(id);t.fn()}}};
}
module.exports={root,KEY,MemoryStorage,locks,createHarness};
