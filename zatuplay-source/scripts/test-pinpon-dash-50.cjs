const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const dir=path.resolve(__dirname,'../public/games/pinpon-dash-50');
let saved; const noop=()=>{}; const canvas=new Proxy({},{get:()=>noop});
const elements=new Map();function element(){return {textContent:'',hidden:false,dataset:{},style:{},setAttribute:noop,append:noop,replaceChildren:noop,focus:noop,blur:noop,addEventListener:noop,querySelectorAll:()=>[],getContext:()=>canvas};}
const ctx=vm.createContext({console,Math,Set,Map,HTMLElement:class{},HTMLButtonElement:class{},document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll:()=>[],createElement:element,addEventListener:noop},window:{addEventListener:noop},PortSave:{data:null,write(v){saved=JSON.parse(JSON.stringify(v))},settings:noop},requestAnimationFrame:noop});
vm.runInContext(fs.readFileSync(path.join(dir,'game.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);assert.equal(run('stages.length'),50);
run('partySize=4;startRun()'); assert.equal(saved.team.length,4);
for(let n=0;n<50;n++){assert.equal(run('stageIndex'),n);for(let p=0;p<4;p++)run('finishTurn(true);advanceTurn()');}
assert.equal(run('mode'),'ending');assert.equal(run('team.every(r=>r.cleared===50)'),true);
run('startRun();finishTurn(false);advanceTurn()');assert.equal(run('turn'),1);
run('togglePause()');assert.equal(run('mode'),'paused');run('togglePause()');assert.equal(run('mode'),'playing');
run('startRun(); player.x=houses[0].x;player.y=houses[0].y;ring()');assert.equal(run('stageVisits'),1);assert.equal(run('team[0].rings'),1);
run('time+=1;ring()');assert.equal(run('stageVisits'),1);assert.equal(run('team[0].rings'),2);
console.log('PASS: 50-stage model progression/4 players, elimination, pause, ring repeat, stage checkpoint');
async function boot(raw,opts={}){let current=raw,appended=[],events={},writes=0;const document={getElementById:()=>({textContent:''}),createElement(){return {style:{},append:noop,setAttribute:noop,click:noop}},body:{append(x){appended.push(x)}}};const c={document,window:{addEventListener(k,v){events[k]=v}},localStorage:{getItem(){if(opts.readError)throw Error('read');return current},setItem(k,v){if(opts.quota)throw Error('quota');writes++;current=v}},navigator:opts.noLock?{}:{locks:{request(k,o,fn){return fn(opts.lockBusy?null:{});}}},location:{reload:noop},console,Blob,URL,setTimeout,Promise};vm.runInNewContext(fs.readFileSync(path.join(dir,'browser-boot.js'),'utf8'),c);await new Promise(r=>setTimeout(r,0));return {c,appended,get current(){return current},get writes(){return writes}};}
(async()=>{for(const raw of ['{bad','null','{"version":99}']){const b=await boot(raw);assert.equal(b.writes,0);assert.equal(b.c.window.PortSave,undefined);}
const sample={version:1,partySize:1,stageIndex:0,team:[],sound:false};const b=await boot(null);b.c.window.PortSave.write(sample);assert.equal(JSON.parse(b.current).version,1);assert.equal(b.writes,1);
for(const opts of [{readError:true},{noLock:true},{lockBusy:true}]){const b=await boot(null,opts);assert.equal(b.c.window.PortSave,undefined);assert.equal(b.writes,0);}
const q=await boot(null,{quota:true});assert.throws(()=>q.c.window.PortSave.write(sample));assert.equal(q.current,null);assert.equal(q.writes,0);
console.log('PASS: storage corruption/unknown version, normal write, read denial, lock absence/conflict, quota preservation');})().catch(e=>{console.error(e);process.exitCode=1});
