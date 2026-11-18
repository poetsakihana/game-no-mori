const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path');
const base=path.join(__dirname,'../public/games/puchitto-break-150');
const source=fs.readFileSync(base+'/assets/storage.js','utf8');
function setup(raw=null,options={}){
 const elements=new Map(),events={};let writes=0,stored=raw;
 function element(id){return {id,textContent:'',inert:false,children:[],setAttribute(){},append(...a){this.children.push(...a);for(const x of a)if(x.id)elements.set(x.id,x)},click(){}}}
 for(const id of ['save-status','backup','restore'])elements.set(id,element(id));
 const context={console,JSON,Set,Number,Error,Blob,URL,setTimeout(){},location:{reload(){}},confirm:()=>false,
 document:{getElementById:id=>elements.get(id),createElement:()=>element(''),querySelectorAll:()=>[],body:element('body'),head:element('head')},
 localStorage:{getItem(){if(options.readError)throw Error('read');return stored},setItem(k,v){if(options.quota)throw Error('quota');stored=v;writes++}},
 navigator:options.noLocks?{}:{locks:{request:(name,opt,fn)=>Promise.resolve(fn(options.locked?null:{}))}}};
 context.window=context;context.addEventListener=(name,cb)=>events[name]=cb;
 vm.createContext(context);vm.runInContext(source,context);
 return {context,elements,events,get value(){return stored},get writes(){return writes},set value(v){stored=v}};
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
