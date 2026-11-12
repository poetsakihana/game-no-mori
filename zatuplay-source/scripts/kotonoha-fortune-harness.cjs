'use strict';
// linkedom actual DOM events + VM. Timers, storage, locking, focus and downloads are models, not Chrome.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'../public/games/kotonoha-fortune');
const KEY='zatuplay:kotonoha-fortune:v1';
class MemoryStorage{
 constructor(data={}){this.data=new Map(Object.entries(data));this.failRead=false;this.failWrite=false;this.writes=0;}
 getItem(k){if(this.failRead)throw Error('denied');return this.data.get(k)??null;}
 setItem(k,v){if(this.failWrite){const e=Error('quota');e.name='QuotaExceededError';throw e;}this.data.set(k,String(v));this.writes++;}
 removeItem(k){this.data.delete(k);}
}
function locks(){let tail=Promise.resolve();return{request(name,options,fn){const p=tail.then(fn||options);tail=p.catch(()=>{});return p;}};}
function createHarness({storage=new MemoryStorage(),lockManager=locks(),deniedGetter=false,secure=true,reduced=true,sourceDir=root}={}){
 const html=fs.readFileSync(path.join(sourceDir,'index.html'),'utf8');const dom=parseHTML(html),document=dom.document;
 let hidden=false,active=document.body,confirmation=true,clock=0,seq=0,revoked=0;
 const timers=new Map(),events={},downloads=[],alerts=[],confirmations=[];
 Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'activeElement',{get:()=>active});
 dom.HTMLElement.prototype.focus=function(){active=this;};dom.HTMLElement.prototype.scrollIntoView=function(){};
 Object.defineProperties(dom.HTMLSelectElement.prototype,{
  value:{configurable:true,get(){return [...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.getAttribute('value')??[...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.textContent??this.querySelector('option')?.getAttribute('value')??this.querySelector('option')?.textContent??'';},set(v){for(const o of this.querySelectorAll('option')){if((o.getAttribute('value')??o.textContent)===String(v))o.setAttribute('selected','');else o.removeAttribute('selected');}}},
  selectedIndex:{configurable:true,get(){const a=[...this.querySelectorAll('option')];const i=a.findIndex(o=>o.hasAttribute('selected'));return i<0?(a.length?0:-1):i;},set(v){[...this.querySelectorAll('option')].forEach((o,i)=>i===Number(v)?o.setAttribute('selected',''):o.removeAttribute('selected'));}}
 });
 const sandbox={document,console,navigator:{locks:lockManager},Blob,Uint8Array,Uint32Array,Date,Math,
  crypto:secure?crypto.webcrypto:undefined,
  URL:{createObjectURL(b){downloads.push(b);return 'blob:unit-'+downloads.length;},revokeObjectURL(){revoked++;}},
  confirm(text){confirmations.push(text);return confirmation;},alert:text=>alerts.push(text),
  matchMedia:q=>({matches:q.includes('reduced')?reduced:false}),scrollTo(){},
  setTimeout(fn,ms=0){const id=++seq;timers.set(id,{fn,at:clock+ms});return id;},clearTimeout:id=>timers.delete(id),
  addEventListener(type,fn){(events[type]||=[]).push(fn);}
 };sandbox.window=sandbox;
 Object.defineProperty(sandbox,'localStorage',{get(){if(deniedGetter)throw Error('denied');return storage;}});
 vm.createContext(sandbox);
 const run=s=>vm.runInContext(s,sandbox);
 for(const f of (fs.existsSync(path.join(sourceDir,'storage.js'))?['storage.js','app.js','arts.js','gallery.js','browser.js']:['app.js','arts.js','gallery.js']))vm.runInContext(fs.readFileSync(path.join(sourceDir,f),'utf8'),sandbox,{filename:f});
 const get=id=>document.getElementById(id);
 function bind(){for(const n of document.querySelectorAll('[onclick],[oninput],[onchange]'))for(const type of ['click','input','change']){const code=n.getAttribute('on'+type);if(code&&!n['on'+type]&&!n['_bound'+type]){n['_bound'+type]=true;n.addEventListener(type,()=>{sandbox.__target=n;run('(function(){'+code+'}).call(__target)');});}}}
 function emit(node,type,props={}){if(typeof node==='string')node=get(node);bind();const e=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);return e;}
 function click(node){if(typeof node==='string')node=get(node);if(node.disabled)return;return emit(node,'click');}
 function input(id,value,type='input'){get(id).value=value;emit(id,type);}
 function advance(ms=0){const end=clock+ms;let n=0;while(true){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;if(++n>10000)throw Error('timer loop');clock=next[1].at;timers.delete(next[0]);next[1].fn();}clock=end;}
 async function settle(){advance();for(let i=0;i<35;i++)await Promise.resolve();}
 function windowEvent(type,props={}){for(const f of events[type]||[])f({type,...props});}
 function visibility(v){hidden=v;emit(document,'visibilitychange');}
 return {document,get,run,click,input,emit,advance,settle,storage,windowEvent,visibility,timers,downloads,alerts,confirmations,
  state:()=>JSON.parse(run('JSON.stringify(data)')),ui:()=>JSON.parse(run('JSON.stringify(KotonohaBrowser.snapshot().ui)')),
  status:()=>get('browserStatus').textContent,setConfirm:v=>confirmation=v,revoked:()=>revoked,window:sandbox};
}
module.exports={root,KEY,createHarness,MemoryStorage,locks};
