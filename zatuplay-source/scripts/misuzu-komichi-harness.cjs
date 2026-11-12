'use strict';
// DOM/event/storage models with real native Canvas pixels and actual SVG decoding; not a browser substitute.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),{createCanvas,Image:NativeImage,GlobalFonts}=require('@napi-rs/canvas');
const jpFont='/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc';
if(fs.existsSync(jpFont)){GlobalFonts.registerFromPath(jpFont,'Yu Mincho');GlobalFonts.registerFromPath(jpFont,'serif');}
const root=path.resolve(__dirname,'../public/games/misuzu-komichi');
const KEY='zatuplay:misuzu-komichi:v1';
class MemoryStorage{constructor(data={}){this.data=new Map(Object.entries(data));this.failRead=false;this.failWrite=false;this.writes=0;}getItem(k){if(this.failRead)throw Error('denied');return this.data.get(k)??null}setItem(k,v){if(this.failWrite){const e=Error('quota');e.name='QuotaExceededError';throw e}this.data.set(k,String(v));this.writes++}}
function locks(){let tail=Promise.resolve();return{request(name,options,fn){const p=tail.then(fn);tail=p.catch(()=>{});return p}}}
function createHarness({storage=new MemoryStorage(),lockManager=locks(),width=1280,height=720,sourceDir=root}={}){
 const dom=parseHTML(fs.readFileSync(path.join(sourceDir,'index.html'),'utf8')),document=dom.document;
 let hidden=false,active=document.body,confirmation=true,clock=0,seq=0,raf=null;
 const timers=new Map(),events={},downloads=[],confirmations=[],realCanvases=new Map(),images=[];
 Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'activeElement',{get:()=>active});
 dom.HTMLElement.prototype.focus=function(){active=this};dom.HTMLElement.prototype.setPointerCapture=function(){};
 const value=Object.getOwnPropertyDescriptor(dom.HTMLSelectElement.prototype,'value');
 if(!value?.set)Object.defineProperty(dom.HTMLSelectElement.prototype,'value',{configurable:true,get(){return [...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.getAttribute('value')??this.querySelector('option')?.getAttribute('value')??''},set(v){for(const o of this.querySelectorAll('option')){if(o.getAttribute('value')===String(v))o.setAttribute('selected','');else o.removeAttribute('selected')}}});
 for(const id of ['world','hero']){const el=document.getElementById(id),c=createCanvas(id==='world'?width:600,id==='world'?height:650);realCanvases.set(id,c);el.getBoundingClientRect=()=>({width:c.width,height:c.height,left:0,top:0});el.getContext=()=>c.getContext('2d');Object.defineProperty(el,'width',{get:()=>c.width,set:v=>{c.width=v}});Object.defineProperty(el,'height',{get:()=>c.height,set:v=>{c.height=v}})}
 function Image(){const image=new NativeImage();images.push(image);const wrapper={};Object.defineProperties(wrapper,{src:{set(v){image.src=fs.readFileSync(path.join(sourceDir,v.split('?')[0]))}},complete:{get:()=>image.complete},naturalWidth:{get:()=>image.width},native:{value:image}});return wrapper}
 for(const c of realCanvases.values()){const ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);ctx.drawImage=(im,...args)=>draw(im.native||im,...args)}
 const sandbox={document,console,navigator:{locks:lockManager},localStorage:storage,Blob,URL:{createObjectURL(b){downloads.push(b);return 'blob:test-'+downloads.length},revokeObjectURL(){}},Image,devicePixelRatio:1,performance:{now:()=>clock},confirm(t){confirmations.push(t);return confirmation},setTimeout(fn,ms=0){const id=++seq;timers.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{raf=fn},addEventListener(type,fn){(events[type]||=[]).push(fn)}};sandbox.window=sandbox;
 vm.createContext(sandbox);const run=s=>vm.runInContext(s,sandbox);
 for(const f of ['storage.js','poems.js','app.js','events.js','browser.js'])vm.runInContext(fs.readFileSync(path.join(sourceDir,f),'utf8'),sandbox,{filename:f});
 const get=id=>document.getElementById(id);
 function bind(){for(const n of document.querySelectorAll('[onclick]')){if(!n._bound){n._bound=true;n.addEventListener('click',()=>{sandbox.__target=n;run('(function(){'+n.getAttribute('onclick')+'}).call(__target)')})}}}
 function emit(node,type,props={}){if(typeof node==='string')node=get(node);bind();const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e}
 function click(node){if(typeof node==='string')node=get(node);if(node.disabled)return;return emit(node,'click')}
 function advance(ms=0){const end=clock+ms;let n=0;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;if(++n>10000)throw Error('timer loop');clock=next[1].at;timers.delete(next[0]);next[1].fn()}clock=end}
 function frame(ms=1000/60){advance(ms);if(raf)raf(clock)}
 function windowEvent(type,props={}){const e={type,target:document.body,preventDefault(){},stopImmediatePropagation(){},...props};for(const f of events[type]||[])f(e)}
 async function settle(){for(let i=0;i<70;i++)await Promise.resolve();await run('MisuzuStore.flush()')}
 async function importRaw(raw){const input=get('importFile');Object.defineProperty(input,'files',{configurable:true,value:[{size:Buffer.byteLength(raw),text:async()=>raw}]});await input.onchange({target:input});await settle()}
 return {document,get,run,click,emit,advance,frame,settle,storage,windowEvent,downloads,confirmations,realCanvases,images,importRaw,
  state:()=>JSON.parse(run('JSON.stringify(state)')),status:()=>get('saveStatus').textContent,setConfirm:v=>confirmation=v,
  visibility(v){hidden=v;emit(document,'visibilitychange')},canvasPNG(id='world'){return realCanvases.get(id).toBuffer('image/png')}};
}
module.exports={root,KEY,createHarness,MemoryStorage,locks};
