// Native Canvas2D + DOM/time/lock models. NOT a real browser or CSS layout engine.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../public/games/starbolt');
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'sans-serif');
function source(file){return fs.readFileSync(path.join(root,file),'utf8').replace(/^import .*?;\n/gm,'').replace(/\bexport /g,'');}
const core={TextEncoder};vm.createContext(core);vm.runInContext(source('core.js')+'\n'+source('storage.js')+'\nglobalThis.C={Game,FixedClock,NAMES,AREAS,COLORS,WEAPONS,ENDING,overlap,SaveStore,STORAGE_KEY,LOCK_NAME,MAX_BYTES,validateData,strictJSON,exportBackup,importBackup};',core);const C=core.C;
class MemoryStorage{constructor(){this.map=new Map();this.reads=[];this.writes=[];this.failRead=false;this.failWrite=false;}getItem(key){this.reads.push(key);if(this.failRead)throw new Error('denied');return this.map.get(key)??null;}setItem(key,value){if(this.failWrite)throw Object.assign(new Error('full'),{name:'QuotaExceededError'});this.map.set(key,String(value));this.writes.push(key);}}
function lockManager(){let queue=Promise.resolve();return{request(name,options,fn){const pending=queue.then(()=>fn({name}));queue=pending.catch(()=>{});return pending;}};}
function oracle(){
 const elements=new Map();const doc={getElementById(id){if(!elements.has(id))elements.set(id,{style:{},getContext(){return {};}});return elements.get(id);},querySelectorAll(){return[];}};
 const box={document:doc,localStorage:{getItem(){return null;},setItem(){}},requestAnimationFrame(){}};box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(root,'reference/engine.js.txt'),'utf8'),box);
 return {run:code=>vm.runInContext(code,box),state:()=>JSON.parse(vm.runInContext('JSON.stringify({mode,stage,world,cam,tick,weapon,shot,player,platforms,enemies,bullets,hazards,boss,bossStarted,checkpoint,keys,jumpLatch,cleared})',box))};
}
function harness({storage=new MemoryStorage(),locks=lockManager(),audio=true,audioReject=false,downloadFail=false,confirm=true}={}){
 const {document,HTMLElement,Element,Event}=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8'));
 const canvas=createCanvas(960,540),events={},timers=new Map(),downloads=[],confirms=[],audioLog=[];let time=0,seq=0,hidden=false,active=document.body;
 Object.defineProperty(document,'activeElement',{get:()=>active});Object.defineProperty(document,'hidden',{get:()=>hidden});
 HTMLElement.prototype.focus=function(){active=this;};HTMLElement.prototype.showModal=function(){this.open=true;};HTMLElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
 HTMLElement.prototype.setPointerCapture=function(id){this.captured=id;};HTMLElement.prototype.hasPointerCapture=function(id){return this.captured===id;};HTMLElement.prototype.releasePointerCapture=function(){this.captured=null;};
 document.getElementById('c').getContext=()=>canvas.getContext('2d');
 class FakeAudio{constructor(){this.state='suspended';this.currentTime=0;this.destination={};}resume(){audioLog.push('resume');if(audioReject)return Promise.reject(Error('rejected'));this.state='running';return Promise.resolve();}suspend(){this.state='suspended';audioLog.push('suspend');return Promise.resolve();}createOscillator(){return{frequency:{},connect(){},disconnect(){},start(){audioLog.push('beep');},stop(){}};}createGain(){return{gain:{},connect(){},disconnect(){}};}}
 const timer=(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:time+ms});return id;};
 const sandbox={document,Element,console,TextEncoder,Blob,URL:{createObjectURL(blob){if(downloadFail)throw Error('denied');downloads.push(blob);return'blob:test';},revokeObjectURL(){}},navigator:{locks},localStorage:storage,Date,Math,requestAnimationFrame:fn=>timer(()=>fn(time),1000/60),setTimeout:timer,clearTimeout:id=>timers.delete(id),addEventListener(type,fn){(events[type]||=[]).push(fn);},confirm(message){confirms.push(message);return typeof confirm==='function'?confirm(message):confirm;}};
 sandbox.window=sandbox;if(audio)sandbox.AudioContext=FakeAudio;vm.createContext(sandbox);
 vm.runInContext(['core.js','storage.js','render.js','app.js'].map(source).join('\n')+'\nglobalThis.__test={game,store,clock};',sandbox);
 function get(s){return document.querySelector(s);}function emit(node,type,props={}){if(typeof node==='string')node=get(node);const e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e;}
 function win(type,props={}){for(const fn of events[type]||[])fn({type,target:active,preventDefault(){},...props});}
 function click(s){const n=typeof s==='string'?get(s):s;if(!n||n.disabled)throw Error('not clickable '+s);emit(n,'click');}
 function advance(ms){const end=time+ms;while(true){const n=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!n||n[1].at>end)break;time=n[1].at;timers.delete(n[0]);n[1].fn();}time=end;}
 async function settle(){for(let i=0;i<60;i++)await Promise.resolve();}
 function file(text,{size=Buffer.byteLength(text),read=async()=>text}={}){const input=get('#import-file');Object.defineProperty(input,'files',{configurable:true,value:[{size,text:read}]});emit(input,'change');}
 return{...sandbox.__test,document,get,emit,win,click,advance,settle,storage,downloads,confirms,audioLog,canvas,file,key(code,props={}){win('keydown',{code,...props});},keyup(code){win('keyup',{code});},visibility(value){hidden=value;emit(document,'visibilitychange');},png(name){fs.writeFileSync(name,canvas.toBuffer('image/png'));}};
}
module.exports={C,root,source,MemoryStorage,lockManager,oracle,harness};
