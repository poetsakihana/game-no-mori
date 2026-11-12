'use strict';
// DOM, storage, Web Locks and lifecycle models. Not a browser or Chrome QA claim.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'../public/games/renai-sakusen');
const KEY='zatuplay.renai-sakusen.browser.v1';
class MemoryStorage{
 constructor(data={}){this.data=new Map(Object.entries(data));this.failRead=false;this.failWrite=false;this.writes=0;this.reads=[];}
 getItem(k){this.reads.push(k);if(this.failRead)throw Error('denied');return this.data.get(k)??null;}
 setItem(k,v){if(this.failWrite)throw Error('quota');this.data.set(k,String(v));this.writes++;}
}
function locks(){let tail=Promise.resolve();return {request(name,options,fn){const p=tail.then(()=>fn({name}));tail=p.catch(()=>{});return p;}};}
function harness({storage=new MemoryStorage(),lockManager=locks(),audioMode='ok'}={}){
 const dom=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8')),document=dom.document;
 let hidden=false,clock=0,seq=0;const events={},timers=new Map(),downloads=[],audioLog=[];
 Object.defineProperty(document,'hidden',{get:()=>hidden});
 const dialog=document.querySelector('#modal');dialog.open=false;dialog.showModal=function(){this.open=true;};dialog.close=function(){this.open=false;this.dispatchEvent(new dom.Event('close'));};
 class Audio{
 constructor(){if(audioMode==='constructor')throw Error('Audio unavailable');this.currentTime=0;this.destination={};}
 resume(){audioLog.push('resume');return audioMode==='resume'?Promise.reject(Error('blocked')):Promise.resolve();}
 suspend(){audioLog.push('suspend');return audioMode==='suspend'?Promise.reject(Error('blocked')):Promise.resolve();}
 createOscillator(){if(audioMode==='tone')throw Error('tone');audioLog.push('tone');return {frequency:{value:0},connect(){return this;},start(){},stop(){},disconnect(){}};}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;},disconnect(){}};}
 }
 const sandbox={document,console,navigator:{locks:lockManager},localStorage:storage,Blob,Date,TextEncoder,AudioContext:audioMode==='absent'?undefined:Audio,URL:{createObjectURL(b){downloads.push(b);return 'blob:model-'+downloads.length;},revokeObjectURL(){}},scrollTo(){},setTimeout(fn,ms=0){const id=++seq;timers.set(id,{fn,at:clock+ms});return id;},setInterval(fn,ms){const id=++seq;timers.set(id,{fn,at:clock+ms,interval:ms});return id;},clearTimeout(id){timers.delete(id);},clearInterval(id){timers.delete(id);},addEventListener(type,fn){(events[type]||=[]).push(fn);}};
 sandbox.window=sandbox;vm.createContext(sandbox);const run=s=>vm.runInContext(s,sandbox);
 for(const file of ['story.js','expansion.js','app.js','browser.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
 const q=sel=>document.querySelector(sel);
 function bind(){for(const n of document.querySelectorAll('[onclick]'))if(!n._bound){n._bound=true;n.addEventListener('click',()=>{sandbox.__target=n;run('(function(){'+n.getAttribute('onclick')+'}).call(__target)');});}}
 function emit(n,type,props={}){if(typeof n==='string')n=q(n);bind();const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);n.dispatchEvent(e);return e;}
 function click(n){if(typeof n==='string')n=q(n);if(!n)throw Error('missing button');if(n.disabled)return;return emit(n,'click');}
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
 async function settle(){for(let i=0;i<100;i++)await Promise.resolve();}
 async function confirm(){click('#confirm-action');await settle();}
 async function start(hero=1,name='テスト'){run(`chosen=${hero};setup()`);q('#playerName').value=name;click(button('この主人公ではじめる'));await confirm();}
 async function importRaw(raw){run('settings()');const input=q('[data-import]');Object.defineProperty(input,'files',{configurable:true,value:[{size:Buffer.byteLength(raw),text:async()=>raw}]});sandbox.__input=input;await run('importSave(__input)');await settle();return input;}
 function windowEvent(type,props={}){const e={type,target:document.body,preventDefault(){this.prevented=true;},...props};for(const f of events[type]||[])f(e);return e;}
 function advance(ms){const end=clock+ms;let count=0;while(true){const [id,t]=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0]||[];if(!t)break;if(++count>20000)throw Error('timer loop');clock=t.at;if(t.interval)t.at+=t.interval;else timers.delete(id);t.fn();}clock=end;}
 return {run,document,q,button,click,emit,settle,confirm,start,importRaw,storage,downloads,audioLog,windowEvent,advance,book:()=>JSON.parse(run('JSON.stringify(book)')),state:()=>JSON.parse(run('JSON.stringify(state)')),status:()=>q('#save-status').textContent,visibility(v){hidden=v;emit(document,'visibilitychange');}};
}
module.exports={root,KEY,harness,MemoryStorage,locks};
