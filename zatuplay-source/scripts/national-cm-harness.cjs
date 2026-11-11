'use strict';
// Minimal DOM/event stand-in for deterministic logic tests, not a browser or layout test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../public/games/national-cm');
class MemoryStorage{constructor(raw=null){this.raw=raw;this.failRead=false;this.failWrite=false;this.writes=0}getItem(){if(this.failRead)throw Error('denied');return this.raw}setItem(k,v){if(this.failWrite)throw Error('quota');this.raw=String(v);this.writes++}}
function events(o){o.listeners={};o.addEventListener=(k,f)=>(o.listeners[k]||=[]).push(f);o.emit=(k,e={})=>{for(const f of o.listeners[k]||[])f({preventDefault(){},...e})};return o}
function createHarness({storage=new MemoryStorage(),deniedGetter=false,fetchFail=null}={}){
 const nodes=new Map(),tabs=[],closures=[],requests=[],scripts=[],downloads=[],opened=[],timers=new Map();let timerId=0;
 const document=events({hidden:false,activeElement:null});
 class Element{
  constructor(tag='div',attrs=''){events(this);this.tagName=tag.toUpperCase();this.id=attrs.match(/\bid="([^"]*)"/)?.[1]||'';this.attrs={};this.dataset={};this.style={};this.children=[];this.disabled=/\bdisabled\b/.test(attrs);this.hidden=/\bhidden\b/.test(attrs);this.value='';this.textContent='';this.open=false;this._html='';this.classList={toggle(){}};for(const [,k,v]of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g))this.dataset[k]=v;if(this.id)nodes.set(this.id,this)}
  set innerHTML(s){this._html=s;this.children=parse(s)}get innerHTML(){return this._html}
  querySelector(s){if(s[0]==='#')return nodes.get(s.slice(1));return this.querySelectorAll(s)[0]||null}
  querySelectorAll(s){const m=s.match(/^\[data-([\w-]+)(?:="([^"]+)")?\]$/);return m?this.children.filter(e=>e.dataset[m[1]]!==undefined&&(m[2]===undefined||e.dataset[m[1]]===m[2])):[]}
  setAttribute(k,v){this.attrs[k]=v}
  appendChild(e){this.children.push(e);if(e.tagName==='SCRIPT')scripts.push(e);return e}
  remove(){this.removed=true}
  focus(){document.activeElement=this}
  scrollIntoView(){}
  showModal(){this.open=true}
  close(){this.open=false;this.emit('close')}
  reset(){for(const id of ['addTitle','addUrl','addCompany','addCity'])nodes.get(id).value=''}
  click(){if(this.tagName==='A'&&this.download)downloads.push({url:this.href,name:this.download});return this.onclick?.({preventDefault(){}})}
 }
 function parse(html){const out=[];for(const [,tag,attrs]of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)){const e=new Element(tag,attrs);out.push(e)}return out}
 const all=parse(fs.readFileSync(path.join(root,'index.html'),'utf8'));tabs.push(...all.filter(e=>e.dataset.tab));closures.push(...all.filter(e=>e.dataset.close));
 document.querySelector=s=>nodes.get(s.slice(1))||null;
 document.querySelectorAll=s=>s==='[data-tab]'?tabs:s==='[data-close]'?closures:[];
 document.createElement=tag=>new Element(tag);document.head=new Element('head');
 const window=events({scrollTo(){},open:(...a)=>opened.push(a)});let fetchOverride=null;const blobs=new Map();
 class TestURL extends URL{}TestURL.createObjectURL=b=>{const url='blob:test-'+blobs.size;blobs.set(url,b);return url};TestURL.revokeObjectURL=()=>{};
 const sandbox={window,document,console,location:{origin:'https://example.test'},URL:TestURL,Blob,setTimeout:(f,ms)=>{const id=++timerId;timers.set(id,{f,ms});return id},clearTimeout:id=>timers.delete(id),fetch:async url=>{requests.push(url);if(fetchOverride)return fetchOverride(url);if(fetchFail&&url.includes(fetchFail))throw Error('offline');return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8'))}}};
 Object.defineProperty(sandbox,'localStorage',{get(){if(deniedGetter)throw Error('storage getter denied');return storage}});
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'data/core.js'),'utf8'),sandbox);vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),sandbox);
 const run=s=>vm.runInContext(s,sandbox),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
 return {root,nodes,window,document,storage,requests,scripts,downloads,opened,blobs,timers,run,json,setFetch:f=>{fetchOverride=f},setFail:f=>{fetchFail=f},fireTimeout:ms=>{for(const [id,t]of [...timers])if(t.ms===ms){timers.delete(id);t.f()}},click:id=>nodes.get(id).click()};
}
module.exports={createHarness,MemoryStorage,root};
