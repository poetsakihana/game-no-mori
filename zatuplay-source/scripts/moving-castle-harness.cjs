'use strict';
// No browser emulation claims: small DOM shim + real native Canvas2D rendering.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {createCanvas,Image,Path2D} = require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../public/games/moving-castle');
class MemoryStorage {
 constructor(initial={}){this.data=new Map(Object.entries(initial));this.failRead=false;this.failWrite=false;}
 getItem(k){if(this.failRead)throw Error('read denied');return this.data.get(k)??null;}
 setItem(k,v){if(this.failWrite)throw Error('quota denied');this.data.set(k,String(v));}
}
function events(t={}){t.listeners={};t.addEventListener=(e,f)=>(t.listeners[e]||=[]).push(f);t.emit=(e,data={})=>{for(const f of t.listeners[e]||[])f({preventDefault(){},target:t,currentTarget:t,...data});};return t;}
async function createHarness({storage=new MemoryStorage(),deniedGetter=false,noCanvas=false}={}){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'), nodes=new Map(),buttons=[],canvases=[];
 const document=events({hidden:false,activeElement:null});
 class Element{
  constructor(id='',attrs=''){events(this);this.id=id;this.style={};this.dataset={};this.textContent='';this._html='';this.disabled=/\bdisabled\b/.test(attrs);this.captures=new Set();
   const classes=new Set((attrs.match(/class="([^"]*)"/)?.[1]||'').split(/\s+/));this.classList={contains:k=>classes.has(k),add:(...ks)=>ks.forEach(k=>classes.add(k)),remove:(...ks)=>ks.forEach(k=>classes.delete(k)),toggle:(k,f)=>{const on=f??!classes.has(k);on?classes.add(k):classes.delete(k);return on;}};
   for(const [,k,v]of attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g))this.dataset[k]=v;
  }
  set innerHTML(x){this._html=x;}get innerHTML(){return this._html;}
  focus(){document.activeElement=this;}blur(){if(document.activeElement===this)document.activeElement=null;}
  closest(s){return s.includes('button')&&this.tag==='button'?this:null;}
  setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);this.emit('lostpointercapture',{pointerId:id});}
 }
 for(const [,tag,attrs]of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)){
  const id=attrs.match(/\bid="([^"]*)"/)?.[1],dataKey=attrs.match(/\bdata-key="([^"]*)"/)?.[1];if(!id&&!dataKey&&!attrs.includes('data-panel'))continue;
  const el=new Element(id||'button-'+(dataKey||buttons.length),attrs);el.tag=tag;
  if(tag==='canvas'){const c=createCanvas(960,540);el.getContext=()=>noCanvas?null:c.getContext('2d');el.canvas=c;}
  nodes.set(el.id,el);if(tag==='button')buttons.push(el);
 }
 document.querySelector=s=>nodes.get(s.replace(/^#/,''));document.querySelectorAll=s=>s==='.touch-ui button'?buttons.filter(b=>b.dataset.key):s==='[data-panel]'?buttons.filter(b=>b.dataset.panel):[];
 document.createElement=tag=>{if(tag!=='canvas')return new Element(tag);const c=createCanvas(1,1);canvases.push(c);return c;};
 const window=events({}),images=[];
 class TrackedImage extends Image{constructor(){super();images.push(this);}}
 const sandbox={window,document,Image:TrackedImage,Path2D,console,performance:{now:()=>0},setTimeout(){},requestAnimationFrame(){},navigator:{},location:{protocol:'http:'},URL,Blob,confirm:()=>answer};let answer=true;
 Object.defineProperty(sandbox,'localStorage',{get(){if(deniedGetter)throw Error('getter denied');return storage;}});
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'browser-storage.js'),'utf8'),sandbox);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
 scripts[scripts.length-1]=scripts[scripts.length-1].replace('requestAnimationFrame(loop);\n})();','window.__test=code=>eval(code);requestAnimationFrame(loop);\n})();');
 for(const script of scripts)vm.runInContext(script,sandbox);
 await Promise.all(images.map(im=>im.decode()));
 const run=s=>window.__test(s);
 return {disposeTerrain(){run('terrainCache=null');for(const c of canvases){c.width=1;c.height=1;}canvases.length=0;},root,window,document,nodes,images,storage,run,confirm:x=>{answer=x;},click:id=>{const n=nodes.get(id);if(n.disabled)throw Error('disabled '+id);n.focus();n.emit('click');},press:(key,target=document)=>window.emit('keydown',{key,repeat:false,target}),release:key=>window.emit('keyup',{key}),pointer:(key,event='pointerdown',pointerId=1)=>nodes.get('button-'+key).emit(event,{pointerId}),state:()=>JSON.parse(run('JSON.stringify(G)')),snapshot:()=>JSON.parse(run('JSON.stringify({G,freeze,panelName,keys,holdTouch:[...holdTouch]})')),png:p=>fs.writeFileSync(p,nodes.get('world').canvas.toBuffer('image/png'))};
}
module.exports={createHarness,MemoryStorage,root};
