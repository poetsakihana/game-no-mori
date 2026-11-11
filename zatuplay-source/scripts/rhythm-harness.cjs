'use strict';
// Deterministic DOM and audio-clock model, real @napi-rs/canvas drawing.
// This is NOT a browser, a real AudioContext, or proof of audio/device playback.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let parseHTML;try{({parseHTML}=require('linkedom'));}catch{({parseHTML}=require('/tmp/rhythm-test-deps/node_modules/linkedom'));}
const {createCanvas,Image}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../public/games/rhythm');
class MemoryStorage{constructor(data={}){this.data=new Map(Object.entries(data));this.failRead=false;this.failWrite=false;this.writes=0;}getItem(k){if(this.failRead)throw Error('read denied');return this.data.get(k)??null;}setItem(k,v){if(this.failWrite)throw Error('quota');this.data.set(k,String(v));this.writes++;}}
async function createHarness({storage=new MemoryStorage(),deniedGetter=false,audioFail=false}={}){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const dom=parseHTML(html),document=dom.document;
 let wall=0,seq=1,audioTime=0,audioState='suspended',resumeReject=audioFail,suspendReject=false,active=document.body;
 const timers=new Map(),rafs=[],images=[],canvases=[];
 Object.defineProperty(document,'activeElement',{get:()=>active});
 dom.HTMLElement.prototype.focus=function(){active=this;};
 dom.HTMLElement.prototype.setPointerCapture=function(){};
 dom.HTMLElement.prototype.releasePointerCapture=function(){};
 Object.defineProperty(dom.HTMLSelectElement.prototype,'value',{get(){return this._value??this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(v){this._value=String(v);}});
 // linkedom intentionally does not implement form checked state/layout.
 for(const el of document.querySelectorAll('input')){el.checked=el.hasAttribute('checked');if(!el.value)el.value=el.getAttribute('value')||'';}
 dom.HTMLCanvasElement.prototype.getContext=function(){if(!this._canvas){this._canvas=createCanvas(+this.getAttribute('width')||300,+this.getAttribute('height')||150);canvases.push(this._canvas);}return this._canvas.getContext('2d');};
 const listeners={};const window={document,addEventListener:(type,fn)=>(listeners[type]||=[]).push(fn),scrollTo(){},speechSynthesis:{speaking:false,getVoices:()=>[],speak(){},cancel(){}}};
 Object.defineProperty(window,'localStorage',{get(){if(deniedGetter)throw Error('denied');return storage;}});
 function param(){return{value:1,setValueAtTime(v,t){if(!Number.isFinite(t)||!Number.isFinite(v))throw Error('invalid audio param');this.value=v;},linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);},exponentialRampToValueAtTime(v,t){this.setValueAtTime(v,t);}};}
 let nodes=0,oscillators=0;
 function gain(){nodes++;return{gain:param(),connect(){},disconnect(){}};}
 class AudioContext{get currentTime(){return audioTime;}get state(){return audioState;}constructor(){this.destination={};}async resume(){if(resumeReject)throw Error('audio denied');audioState='running';}async suspend(){if(suspendReject)throw Error('suspend denied');audioState='suspended';}createGain(){return gain();}createOscillator(){oscillators++;return{frequency:param(),connect(){},disconnect(){},start(t=audioTime){if(!Number.isFinite(t))throw Error('invalid oscillator time');},stop(t=audioTime){if(!Number.isFinite(t))throw Error('invalid stop time');}};}}
 window.AudioContext=AudioContext;
 class TrackedImage extends Image{constructor(){super();images.push(this);}}
 const setTimeout=(fn,delay=0)=>{const id=seq++;timers.set(id,{fn,at:wall+delay});return id;};
 const sandbox={window,document,console,Image:TrackedImage,SpeechSynthesisUtterance:class{constructor(s){this.text=s;}},performance:{now:()=>wall},setTimeout,clearTimeout:id=>timers.delete(id),setInterval(){},clearInterval(){},requestAnimationFrame:fn=>rafs.push(fn),navigator:{},AudioContext,Intl,Date,URL,Blob};
 vm.createContext(sandbox);
 for(const [,attrs,code]of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){const src=attrs.match(/src="([^"]+)"/);vm.runInContext(src?fs.readFileSync(path.join(root,src[1].split('?')[0]),'utf8'):code,sandbox);}
 await Promise.all(images.filter(i=>i.src).map(i=>i.decode()));
 const run=s=>vm.runInContext(s,sandbox);
 function emit(type,props={}){const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);(props.target||document).dispatchEvent(e);return e;}
 function windowEvent(type,props={}){for(const f of listeners[type]||[])f({type,...props});}
 async function tick(ms,{frame=true}={}){
  const target=wall+ms;
  while(wall<target){
   const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];const t=Math.min(target,next?.[1].at??Infinity);
   if(audioState==='running')audioTime+=(t-wall)/1000;wall=t;
   if(next&&next[1].at<=wall){timers.delete(next[0]);next[1].fn();await Promise.resolve();}else break;
  }
  if(frame){const batch=rafs.splice(0);for(const fn of batch)fn(wall);}await Promise.resolve();
 }
 async function advance(ms,step=20){for(let i=0;i<ms;i+=step)await tick(Math.min(step,ms-i));}
 async function click(id){const n=document.getElementById(id);if(!n)throw Error('Missing '+id);if(n.disabled)throw Error('Disabled '+id);n.focus();const e=new dom.Event('click',{bubbles:true,cancelable:true});Object.assign(e,{detail:1});n.dispatchEvent(e);await Promise.resolve();await Promise.resolve();return n;}
 return{run,document,window,storage,images,canvases,tick,advance,emit,windowEvent,click,root,setAudioTime:t=>{audioTime=t;},getAudioTime:()=>audioTime,setResumeReject:v=>{resumeReject=v;},setSuspendReject:v=>{suspendReject=v;},async settle(){await Promise.resolve();await Promise.resolve();},frame(){const q=rafs.splice(0);for(const fn of q)fn(wall);},png:p=>fs.writeFileSync(p,document.getElementById('canvas')._canvas.toBuffer('image/png')),stats:()=>({nodes,oscillators}),dispose(){for(const c of canvases){c.width=1;c.height=1;}}};
}
module.exports={createHarness,MemoryStorage,root};
