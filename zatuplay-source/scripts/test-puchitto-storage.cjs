const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path');
const base=path.join(__dirname,'../public/games/puchitto-break-150');
const source=fs.readFileSync(base+'/assets/storage.js','utf8');
function setup(raw=null,options={}){
 const elements=new Map(),events={};let writes=0,stored=raw,disposed=0,reloads=0;
 function element(id){return {id,textContent:'',inert:false,hidden:true,focus(){},children:[],setAttribute(){},append(...a){this.children.push(...a);for(const x of a)if(x.id)elements.set(x.id,x)},click(){}}}
 for(const id of ['save-status','backup','restore','reset-prepare','reset-review','reset-confirm','reset-cancel'])elements.set(id,element(id));
 const context={console,JSON,Set,Number,Error,Blob,URL,setTimeout(){},location:{reload(){reloads++}},playfield:{dispose(){disposed++}},confirm:()=>false,
 document:{getElementById:id=>elements.get(id),createElement:()=>element(''),querySelectorAll:()=>[],body:element('body'),head:element('head')},
 localStorage:{getItem(){if(options.readError)throw Error('read');return stored},setItem(k,v){if(options.quota)throw Error('quota');stored=v;writes++}},
 navigator:options.noLocks?{}:{locks:{request:(name,opt,fn)=>Promise.resolve(fn(options.locked?null:{}))}}};
 context.window=context;context.addEventListener=(name,cb)=>events[name]=cb;
 vm.createContext(context);vm.runInContext(source,context);
 return {context,elements,events,get value(){return stored},get disposed(){return disposed},get reloads(){return reloads},get writes(){return writes},set value(v){stored=v}};
}
const good={done:[1,150],favorites:[2],sound:false};
let s=setup();assert.deepEqual(JSON.parse(JSON.stringify(s.context.BrowserSave.read())),{done:[],favorites:[],sound:false});assert(s.context.BrowserSave.write(good));assert.equal(s.writes,1);
s=setup(JSON.stringify(good));assert.equal(s.context.BrowserSave.read().done.length,2);
for(const raw of ['{oops','null','[]','{}',JSON.stringify({...good,done:[151]}),JSON.stringify({...good,done:[1,1]}),JSON.stringify({...good,sound:1})]){s=setup(raw);assert(s.elements.has('storage-stop'));assert.equal(s.value,raw);assert.equal(s.writes,0)}
s=setup(null,{locked:true});assert(s.elements.has('storage-stop'));assert.equal(s.writes,0);
s=setup(null,{noLocks:true});assert(s.elements.has('storage-stop'));
s=setup(null,{quota:true});assert.equal(s.context.BrowserSave.write(good),false);assert(s.elements.has('storage-stop'));assert.equal(s.value,null);
s=setup(null,{readError:true});assert(s.elements.has('storage-stop'));
s=setup();s.value=JSON.stringify(good);assert.equal(s.context.BrowserSave.write({done:[],favorites:[],sound:false}),false);assert.equal(s.value,JSON.stringify(good));
s=setup();s.events.storage({key:'puchitto-break-150-v1'});assert(s.elements.has('storage-stop'));assert.equal(s.context.BrowserSave.write(good),false);
const cat=vm.createContext({});vm.runInContext(fs.readFileSync(base+'/assets/catalog.js','utf8')+';globalThis.entries=catalog;',cat);assert.equal(cat.entries.length,150);assert.equal(new Set(cat.entries.map(x=>x.id)).size,150);
console.log('PASS: empty/valid saves, 7 malformed formats fail closed, exclusive tab lock, unsupported lock, quota/read denial, stale snapshot, external-change guard, all 150 unique catalog entries.');

// Reset is never performed by preparing/cancelling a backup, or declining confirmation.
s=setup(JSON.stringify(good));
s.elements.get('reset-prepare').onclick();assert.equal(s.writes,0);assert.equal(s.elements.get('reset-review').hidden,false);
s.elements.get('reset-confirm').onclick();assert.equal(s.writes,0);
s.elements.get('reset-cancel').onclick();assert.equal(s.writes,0);assert.equal(s.elements.get('reset-review').hidden,true);
s.context.confirm=()=>true;s.elements.get('reset-confirm').onclick();assert.equal(s.writes,0);
s.elements.get('reset-prepare').onclick();s.elements.get('reset-confirm').onclick();
assert.equal(s.writes,1);assert.deepEqual(JSON.parse(s.value),{done:[],favorites:[],sound:false});
s=setup(JSON.stringify(good));s.elements.get('reset-prepare').onclick();s.context.BrowserSave.write({...good,done:[1,2]});s.context.confirm=()=>true;s.elements.get('reset-confirm').onclick();assert.equal(s.writes,1);assert.deepEqual(JSON.parse(s.value).done,[1,2]);
s=setup(JSON.stringify(good));s.elements.get('reset-prepare').onclick();s.value=JSON.stringify({...good,done:[3]});s.context.confirm=()=>true;s.elements.get('reset-confirm').onclick();assert.equal(s.writes,0);assert.deepEqual(JSON.parse(s.value).done,[3]);assert(s.elements.has('storage-stop'));
// Test actual progress/ending function against 0,149,150, replay and reset states.
const site=fs.readFileSync(base+'/assets/site.js','utf8');
const progress=site.match(/function updateProgress\(\) \{[\s\S]*?\n\}/)[0];
const ui={progress:{},'collection-ending':{}};
const ending=vm.createContext({catalog:cat.entries,save:{done:new Set()},$:id=>ui[id]});
vm.runInContext(progress,ending);
for(const count of [0,149,150,150,0]){ending.save.done=new Set(Array.from({length:count},(_,i)=>i+1));ending.updateProgress();assert.equal(ui['collection-ending'].hidden,count!==150);}
console.log('PASS: reset prepare/cancel/decline do not write; explicit reset writes defaults; stale internal/external state blocked; ending only at all150 and clears after reset.');

(async()=>{
// Simulate delayed navigation: a callback from the old game must not overwrite replacement.
for(const mode of ['reset','restore']){
 const state=setup(JSON.stringify(good));state.context.confirm=()=>true;
 const replacement={done:[5],favorites:[],sound:false};
 if(mode==='reset'){
  state.elements.get('reset-prepare').onclick();state.elements.get('reset-confirm').onclick();
 }else{
  await state.elements.get('restore').onchange({target:{value:'backup.json',files:[{size:100,text:async()=>JSON.stringify({format:'puchitto-break-150',version:1,data:replacement})}]}});
 }
 assert.equal(state.disposed,1);assert.equal(state.reloads,1);assert.equal(state.writes,1);
 const saved=state.value;
 assert.equal(state.context.BrowserSave.write(good),false);
 assert.equal(state.value,saved);assert.equal(state.writes,1);
 assert.deepEqual(JSON.parse(saved),mode==='reset'?{done:[],favorites:[],sound:false}:replacement);
}
console.log('PASS: reset and restore dispose old playfield and revoke old writer before deferred reload.');
})().catch(e=>{console.error(e);process.exitCode=1});
