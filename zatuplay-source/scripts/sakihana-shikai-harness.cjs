'use strict';
// Model DOM/events/audio/storage; genuine Canvas2D/SVG rasterization. Not browser QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),{createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
for(const font of ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'])if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'serif');
const root=path.resolve(__dirname,'../public/games/sakihana-shikai');
const core={};vm.createContext(core);vm.runInContext(fs.readFileSync(path.join(root,'browser-save.js'),'utf8'),core);const C=core.SakihanaSave;
class MemoryStorage{constructor(){this.data=new Map();this.writes=0;this.failRead=false;this.failWrite=false;}getItem(k){if(this.failRead)throw Error('read denied');return this.data.get(k)??null;}setItem(k,v){if(this.failWrite)throw Error('write denied');this.data.set(k,String(v));this.writes++;}}
function lockManager(){let held=false;return{async request(name,opts,cb){if(held)return cb(null);held=true;try{return await cb({name});}finally{held=false;}}};}
let preloaded;
async function harness({storage=new MemoryStorage(),locks=lockManager(),deniedGetter=false,frameMs=1000/60,audio=true,audioReject=false,fetchFail=false,render=false}={}){
 preloaded ||= Promise.all(fs.readdirSync(path.join(root,'assets')).map(async file=>[file,await loadImage(path.join(root,'assets',file))])).then(v=>new Map(v));const images=await preloaded;
 const {document,HTMLElement,Event}=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8')),canvas=createCanvas(1000,500),events={},timers=new Map(),downloads=[],audioLog=[];let clock=0,seq=0,active=document.body,hidden=false;
 Object.defineProperty(document,'activeElement',{get:()=>active});Object.defineProperty(document,'hidden',{get:()=>hidden});HTMLElement.prototype.focus=function(){active=this;};HTMLElement.prototype.showModal=function(){this.open=true;};HTMLElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
 const element=document.getElementById('world');const drawing=render?canvas.getContext('2d'):new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});element.getContext=()=>drawing;Object.defineProperties(element,{clientWidth:{value:1000},clientHeight:{value:500},width:{get:()=>canvas.width,set:v=>canvas.width=v},height:{get:()=>canvas.height,set:v=>canvas.height=v}});element.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:500});
 function Image(){const target={};Object.defineProperty(target,'src',{set(value){const native=images.get(value.split('/').pop().split('?')[0]);Object.setPrototypeOf(target,native);target.native=native;},get(){return '';}});return target;}
 const ctx=canvas.getContext('2d'),nativeDraw=ctx.drawImage.bind(ctx);ctx.drawImage=(im,...args)=>nativeDraw(im.native||im,...args);
 // Napi Image accessors need the native receiver; return a lightweight wrapper.
 function Sprite(){this.complete=true;Object.defineProperty(this,'src',{set:value=>{this.native=images.get(value.split('/').pop().split('?')[0]);this.naturalWidth=this.native.width;}});}
 class AudioContext{constructor(){this.currentTime=0;this.destination={};audioLog.push('create');}resume(){audioLog.push('resume');return audioReject?Promise.reject(Error()):Promise.resolve();}suspend(){audioLog.push('suspend');return Promise.resolve();}createOscillator(){return{type:'',frequency:{value:0},connect:()=>({connect(){}}),start(){audioLog.push('tone');},stop(){}};}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}}
 class FakeDate extends Date{static now(){return 1794470000000+clock;}}
 const timer=(fn,ms)=>{const n=++seq;timers.set(n,{fn,at:clock+ms});return n;};
 const sandbox={document,console,Math,Date:FakeDate,performance:{now:()=>clock},navigator:{locks},Blob,Image:Sprite,devicePixelRatio:1,URL:{createObjectURL(b){downloads.push(b);return 'blob:test';},revokeObjectURL(){}},setTimeout:timer,clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>timer(()=>fn(clock),frameMs),addEventListener(type,fn){(events[type]||=[]).push(fn);},fetch:async()=>({ok:!fetchFail,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'poems.json'),'utf8'))})};
 if(audio)sandbox.AudioContext=AudioContext;sandbox.window=sandbox;Object.defineProperty(sandbox,'localStorage',{get(){if(deniedGetter)throw Error();return storage;}});vm.createContext(sandbox);
 // Return JSON into its original realm, matching the browser's JSON.parse/fetch behavior.
 sandbox.fetch=async()=>({ok:!fetchFail,json:async()=>vm.runInContext('JSON.parse('+JSON.stringify(fs.readFileSync(path.join(root,'poems.json'),'utf8'))+')',sandbox)});
 for(const f of ['browser-save.js','cast.js','story.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f});
 const get=sel=>document.querySelector(sel);
 function emit(node,type,props={}){if(typeof node==='string')node=get(node);const e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e;}
 function windowEvent(type,props={}){const e={type,target:active,preventDefault(){this.defaultPrevented=true;},...props};for(const f of events[type]||[])f(e);return e;}
 function click(sel){const el=typeof sel==='string'?get(sel):sel;if(!el||el.disabled)throw Error('Not clickable '+sel);active=el;if(el.getAttribute('onclick')?.includes("closest('dialog').close()"))el.closest('dialog').close();else emit(el,'click');}
 function advance(ms){const end=clock+ms;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end+.00001)break;clock=next[1].at;timers.delete(next[0]);next[1].fn();}clock=end;}
 function gap(ms){clock+=ms;const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(next){timers.delete(next[0]);next[1].fn();}}
 async function settle(){for(let i=0;i<30;i++)await Promise.resolve();}
 const read=code=>vm.runInContext(code,sandbox);await settle();
 return {document,get,emit,click,advance,gap,settle,windowEvent,storage,downloads,audioLog,canvas,read,raw:()=>storage.getItem(C.KEY),state:()=>JSON.parse(read('JSON.stringify(snapshot())')),paused:()=>read('paused'),target:()=>read('target'),close(id){get(id).close();},walk(x,y,ms=3500){emit('#world','pointerdown',{button:0,isPrimary:true,clientX:x,clientY:y});advance(ms);},key(key,props={}){return windowEvent('keydown',{key,...props});},keyup(key){windowEvent('keyup',{key});},visibility(v){hidden=v;emit(document,'visibilitychange');},async importText(raw){const file=get('#file');Object.defineProperty(file,'files',{configurable:true,value:[{size:Buffer.byteLength(raw),text:async()=>raw}]});emit(file,'change');await settle();},png(file){fs.writeFileSync(file,canvas.toBuffer('image/png'));}};
}
module.exports={C,root,harness,MemoryStorage,lockManager};
