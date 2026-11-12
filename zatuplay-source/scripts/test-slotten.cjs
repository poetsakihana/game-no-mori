'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {root,KEY,createHarness,MemoryStorage,locks}=require('./slotten-harness.cjs');
const clone=v=>JSON.parse(JSON.stringify(v)),hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const tests=[];async function test(name,fn){await fn();tests.push(name);console.log('PASS',name)}
async function spin(h){h.click('manual');await h.settle();h.frame(2000);await h.settle()}
async function change(h,id,v){h.get(id).value=String(v);h.emit(id,'change');await h.settle()}
function deferred(h){let resolve;const input=h.get('fileInput');Object.defineProperty(input,'files',{configurable:true,value:[{size:100,text:()=>new Promise(r=>resolve=r)}]});return {promise:input.onchange({target:input}),resolve}}
function gatedLocks(){const pending=[];return {pending,request(n,o,f){return new Promise(resolve=>pending.push(()=>resolve(f())))},async release(){for(let i=0;i<100;i++){await Promise.resolve();pending.shift()?.()}}}}
(async()=>{
await test('Exact original assets and 10-machine engine, 8,640 independent payout oracle cases',()=>{
 assert.equal(hash(fs.readFileSync(path.join(root,'original/engine.js'))),'89b96d523382037ef4e04b7d578a46d6848af527c46d56fcd636c1e4273b7160');
 assert.equal(hash(fs.readFileSync(path.join(root,'original/index.html.txt'))),'6258240cfbeacfeba1babb84dbe2698c3222f4ea7de28f05535e2abb79c880bb');
 assert.deepEqual(fs.readFileSync(path.join(root,'engine.js')),fs.readFileSync(path.join(root,'original/engine.js')));
 const oracle={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(root,'original/engine.js'),'utf8'),oracle);const original=oracle.module.exports,h=createHarness();assert.deepEqual(clone(h.run('MACHINES')),clone(original.MACHINES));
 let cases=0,wins=0,max=0;for(let m=0;m<10;m++)for(const bet of [5,10,25,50])for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++){
  const expected=original.payout([a,b,c],bet,original.MACHINES[m]);const result=h.run(`C.begin({...C.blank(),machine:${m},bet:${bet}},(()=>{const a=[${a},${b},${c}];return ()=>a.shift()})())`);assert.equal(result.pending.payout,expected);assert.equal(result.coins,1000-bet);assert.equal(result.spins,1);const final=h.run(`C.settle(${JSON.stringify(result)})`);assert.equal(final.coins,1000-bet+expected);assert.equal(final.wins,expected?1:0);assert.equal(final.earned,expected);assert.equal(final.pending,null);assert.deepEqual(clone(h.run(`C.settle(${JSON.stringify(final)})`)),clone(final));cases++;if(expected)wins++;max=Math.max(max,expected)
 }assert.deepEqual([cases,wins,max],[8640,240,3450]);
 assert.deepEqual(clone(h.run('C.blank()')),{coins:1000,spins:0,wins:0,earned:0,machine:0,sound:true,bet:10,speed:1000,reels:[0,1,2],last:null,pending:null});
});
await test('Original modulo-6 random mapping, error before debit, safe integer headroom',async()=>{
 const h=createHarness({random:[0xffffffff,6,11]});h.click('manual');await h.settle();assert.deepEqual(h.state().pending.reels,[3,0,5]);h.frame(1200);await h.settle();const before=h.state();h.run('crypto.getRandomValues=()=>{throw Error("unavailable")}');h.click('manual');await h.settle();assert.deepEqual(h.state(),before);assert.match(h.get('result').textContent,/コインは使っていません/);
 assert.throws(()=>h.run('C.begin({...C.blank(),coins:Number.MAX_SAFE_INTEGER})'));assert.throws(()=>h.run('C.begin({...C.blank(),spins:Number.MAX_SAFE_INTEGER})'));assert.throws(()=>h.run('C.begin({...C.blank(),earned:Number.MAX_SAFE_INTEGER})'));
});
await test('All machines, symbols/paytable, four bets, three speeds, one normal UI-model spin each',async()=>{
 const h=createHarness();for(let m=0;m<10;m++){
  h.click(h.document.querySelectorAll('.tile')[m]);await h.settle();assert.equal(h.get('name').textContent,h.run(`MACHINES[${m}].name`));assert.equal(h.document.querySelectorAll('#paytable th').length,6);
  for(let j=0;j<6;j++)assert.equal(h.document.querySelectorAll('#paytable td')[j].textContent,h.run(`((8+${j}*3)*MACHINES[${m}].mult).toFixed(1)+'倍'`));
  await change(h,'bet',[5,10,25,50][m%4]);await change(h,'speed',[1800,1000,500][m%3]);assert.equal(h.state().bet,[5,10,25,50][m%4]);assert.equal(h.state().speed,[1800,1000,500][m%3]);const before=h.state();await spin(h);assert.equal(h.state().coins,before.coins-before.bet);assert.equal(h.state().spins,before.spins+1);assert.equal(h.state().pending,null);
 }assert.equal(h.state().spins,10);const restored=createHarness({storage:h.storage});assert.deepEqual(restored.state(),h.state());assert.equal(restored.get('bet').value,String(h.state().bet));assert.equal(restored.get('speed').value,String(h.state().speed));
});
await test('Pending debit/outcome atomic, reload credits exactly once, retries and stale RAF cannot settle twice',async()=>{
 const h=createHarness({random:[5,5,5]});h.click('manual');await h.settle();const p=h.state(),durable=JSON.parse(h.storage.getItem(KEY)).state;assert.deepEqual(p,durable);assert.equal(p.coins,990);assert.equal(p.spins,1);assert.equal(p.pending.payout,230);const stale=[...h.frames.values()][0];
 const restored=createHarness({storage:h.storage});await restored.settle();assert.equal(restored.state().coins,1220);assert.equal(restored.state().earned,230);assert.equal(restored.state().wins,1);assert.equal(restored.state().spins,1);assert.equal(restored.state().pending,null);
 const twice=createHarness({storage:h.storage});await twice.settle();assert.deepEqual(twice.state(),restored.state());stale(2000);await h.settle();assert.equal(h.storage.getItem(KEY),twice.storage.getItem(KEY));assert.match(h.status(),/別タブ/);assert.equal(h.state().coins,1220);
});
await test('Final settlement quota failure leaves recoverable pending; start failure is honest memory mode',async()=>{
 const h=createHarness({random:[0,0,0]});h.click('manual');await h.settle();const pending=h.storage.getItem(KEY);h.storage.failWrite=true;h.frame(1500);await h.settle();assert.equal(h.state().coins,1070);assert.equal(h.storage.getItem(KEY),pending);assert.match(h.status(),/未保存分/);h.storage.failWrite=false;const reload=createHarness({storage:h.storage});await reload.settle();assert.equal(reload.state().coins,1070);assert.equal(reload.state().wins,1);
 const s=new MemoryStorage();s.failWrite=true;const a=createHarness({storage:s,random:[1,1,1]});await spin(a);assert.equal(a.state().coins,1100);assert.equal(s.writes,0);assert.match(a.status(),/保存容量/);s.failWrite=false;a.click('settings');a.click('retry');await a.settle();assert.equal(JSON.parse(s.getItem(KEY)).state.coins,1100);
});
await test('Auto stop during spin / 450ms gap, repeated controls and machine switch do not add spins',async()=>{
 for(const during of ['spin','gap']){const h=createHarness();h.click('auto');await h.settle();assert.equal(h.state().spins,1);if(during==='gap'){h.frame(1000);await h.settle();h.advance(449)}h.click('auto');h.frame(2000);await h.settle();h.advance(1000);await h.settle();assert.equal(h.state().spins,1);assert.equal(h.run('auto'),false)}
 const h=createHarness();h.click('auto');for(let i=0;i<20;i++)h.click('manual');await h.settle();assert.equal(h.state().spins,1);h.click(h.document.querySelectorAll('.tile')[8]);assert.equal(h.state().machine,0);h.frame(1000);await h.settle();h.click(h.document.querySelectorAll('.tile')[8]);await h.settle();h.advance(600);await h.settle();assert.equal(h.state().machine,8);assert.equal(h.state().spins,1);assert.equal(h.run('auto'),false);
 const repeated=createHarness();for(let i=0;i<20;i++)repeated.click('manual');await repeated.settle();assert.equal(repeated.state().spins,1);
 const continuing=createHarness();continuing.click('auto');await continuing.settle();continuing.frame(1000);await continuing.settle();continuing.advance(449);await continuing.settle();assert.equal(continuing.state().spins,1);continuing.advance(1);await continuing.settle();assert.equal(continuing.state().spins,2);continuing.click('auto');continuing.frame(1000);await continuing.settle();assert.equal(continuing.state().spins,2);
});
await test('Lifecycle blur/hidden/pagehide/modal/help/return finishes current spin and cancels auto',async()=>{
 const actions=[h=>h.windowEvent('blur'),h=>h.visibility(true),h=>h.windowEvent('pagehide'),h=>h.click('settings'),h=>{h.get('help').open=true;h.emit('help','toggle')},h=>h.click('returnLink')];
 for(const action of actions){const h=createHarness({random:[2,2,2]});h.click('auto');await h.settle();const stale=[...h.frames.values()][0];action(h);await h.settle();const done=h.state();assert.equal(done.pending,null);assert.equal(done.coins,1130);assert.equal(h.run('auto'),false);stale(5000);h.frame(5000);await h.settle();assert.deepEqual(h.state(),done);h.windowEvent('pageshow');await h.settle();assert.deepEqual(h.state(),done)}
 for(const phase of ['prepare','settle']){const lock=gatedLocks(),h=createHarness({lockManager:lock});h.click('auto');if(phase==='settle'){await lock.release();await h.settle();h.frame(1000)}h.windowEvent('blur');await lock.release();await h.settle();assert.equal(h.run('auto'),false);assert.equal(h.state().pending,null);assert.equal(h.state().spins,1);h.advance(2000);await h.settle();assert.equal(h.state().spins,1)}
});
await test('Original refill boundaries/addition, insufficient funds, statistics unaffected',async()=>{
 const h=createHarness();for(const n of [0,1,49,99]){const next=clone(h.run(`C.refill({...C.blank(),coins:${n}})`));assert.equal(next.coins,n+1000);assert.equal(next.spins,0)}for(const n of [100,101,1000])assert.throws(()=>h.run(`C.refill({...C.blank(),coins:${n}})`));
 h.run('slotState={...C.blank(),coins:99};renderControls()');h.click('refill');await h.settle();assert.equal(h.state().coins,1099);const before=h.state();h.click('refill');await h.settle();assert.deepEqual(h.state(),before);h.run('slotState={...C.blank(),coins:4};renderControls()');h.click('auto');await h.settle();assert.equal(h.state().spins,0);assert.equal(h.run('auto'),false);assert.match(h.get('result').textContent,/コイン不足/);
});
await test('Complete JSON download/import, cancel/reset, same-file repeat and recoverable previous snapshot',async()=>{
 const h=createHarness({random:[4,4,4]});await spin(h);await change(h,'bet',25);await change(h,'speed',500);h.click('sound');await h.settle();h.click('settings');h.click('export');const raw=await h.downloads.at(-1).text(),expected=h.state();
 h.setConfirm(false);h.click('reset');await h.settle();assert.deepEqual(h.state(),expected);h.setConfirm(true);h.click('reset');await h.settle();assert.equal(h.state().coins,1000);assert.equal(h.state().spins,0);assert.deepEqual(clone(h.run('C.decodeBackup(S.backup())')),expected);
 h.setConfirm(false);await h.importRaw(raw);assert.equal(h.state().spins,0);h.setConfirm(true);await h.importRaw(raw);assert.deepEqual(h.state(),expected);await h.importRaw(raw);assert.deepEqual(h.state(),expected);assert.equal(h.get('fileInput').value,'');const reload=createHarness({storage:h.storage});assert.deepEqual(reload.state(),expected);
 const pending=reload.run('C.encode(C.begin(slotState,()=>3))');await h.importRaw(pending);assert.equal(h.state().pending,null);assert.equal(h.state().spins,expected.spins+1);assert.equal(h.state().coins,expected.coins-25+425);assert.equal(h.state().wins,expected.wins+1);
});
await test('Late import reads invalidated by new/canceled import, reset cancel, close, blur, hidden, departure',async()=>{
 const actions=[h=>h.emit('fileInput','cancel'),h=>h.click('import'),h=>h.click('closeSettings'),h=>h.windowEvent('blur'),h=>h.visibility(true),h=>h.windowEvent('pagehide'),h=>h.click('returnLink'),h=>h.windowEvent('keydown',{key:'Escape'}),h=>{h.setConfirm(false);h.click('reset')}];
 for(const action of actions){const h=createHarness();h.click('settings');const d=deferred(h),before=h.state(),prior=h.confirmations.length;action(h);const confirms=h.confirmations.length;d.resolve(h.run('C.encode({...C.blank(),machine:8})'));await d.promise;await h.settle();assert.deepEqual(h.state(),before);assert.equal(h.confirmations.length,confirms);assert.ok(confirms===prior||confirms===prior+1)}
 const h=createHarness();h.click('settings');const d=deferred(h);await h.importRaw(h.run('C.encode({...C.blank(),machine:7})'));d.resolve(h.run('C.encode({...C.blank(),machine:3})'));await d.promise;assert.equal(h.state().machine,7);assert.equal(h.confirmations.length,1);
 const canceled=createHarness();canceled.click('settings');const old=deferred(canceled);canceled.setConfirm(false);await canceled.importRaw(canceled.run('C.encode({...C.blank(),machine:7})'));old.resolve(canceled.run('C.encode({...C.blank(),machine:3})'));await old.promise;assert.equal(canceled.state().machine,0);assert.equal(canceled.confirmations.length,1);
});
await test('Restore waiting for Web Lock cancels on latest lifecycle or picker event without writes',async()=>{
 for(const action of [h=>h.click('closeSettings'),h=>h.windowEvent('pagehide'),h=>h.emit('fileInput','cancel'),h=>h.windowEvent('keydown',{key:'Escape'}),h=>h.windowEvent('blur')]){
  const lock=gatedLocks(),h=createHarness({lockManager:lock});h.click('settings');const p=h.importRaw(h.run('C.encode({...C.blank(),machine:9})'));for(let i=0;i<20;i++)await Promise.resolve();assert.equal(h.run('writing'),true);action(h);await lock.release();await p;assert.equal(h.state().machine,0);assert.equal(h.storage.writes,0);
 }
});
await test('Strict bounded complete backups reject invalid fields, prototype keys, pending mismatch and oversize',async()=>{
 const h=createHarness();await spin(h);h.click('settings');const before=h.state(),bytes=h.storage.getItem(KEY),good=JSON.parse(h.run('C.encode(slotState)'));
 const invalid=['{','null','[]',JSON.stringify({...good,other:0}),JSON.stringify({...good,version:2}),JSON.stringify({...good,revision:-1}),JSON.stringify({...good,state:{coins:1000}}),' '.repeat(100000)];
 for(const [key,value] of [['coins',-1],['coins',1.5],['coins',1e20],['spins',null],['wins',99],['earned','0'],['earned',40],['spins',2],['last',null],['machine',10],['machine',1.1],['sound',1],['bet',0],['speed',0],['reels',[0,1]],['reels',[0,1,6]],['last',{}],['pending',{}]])invalid.push(JSON.stringify({...good,state:{...before,[key]:value}}));
 invalid.push(JSON.stringify({...good,state:{...before,...JSON.parse('{"__proto__":{}}')}}));
 const pending=clone(h.run('C.begin(slotState,()=>5)'));for(const edit of [p=>p.payout++,p=>p.id++,p=>p.machine=9,p=>p.reels=[0,0,0],p=>p.bet=50,p=>p.speed=500]){const s=clone(pending);edit(s.pending);invalid.push(JSON.stringify({...good,state:s}))}
 for(const raw of invalid){const count=h.confirmations.length;await h.importRaw(raw);assert.deepEqual(h.state(),before);assert.equal(h.storage.getItem(KEY),bytes);assert.equal(h.confirmations.length,count)}
 const normal=JSON.stringify(good);
 for(const raw of [normal.replace('"version":1','"version":999,"version":1'),normal.replace('"version":1','"vers\\u0069on":999,"version":1'),normal.replace('"coins":'+before.coins,'"coins":0,"coins":'+before.coins),normal.replace('"reels":[','"reels":[],"reels":['),'['.repeat(200)+'0'+']'.repeat(200)]){await h.importRaw(raw);assert.deepEqual(h.state(),before);assert.equal(h.storage.getItem(KEY),bytes)}
 const b=JSON.parse(h.run('C.backup(S.baseline,slotState)'));
 const backupRaw=JSON.stringify(b);for(const raw of [backupRaw.replace('"version":1','"version":999,"version":1'),backupRaw.replace('"state":','"st\\u0061te":{},"state":')]){await h.importRaw(raw);assert.deepEqual(h.state(),before);assert.equal(h.storage.getItem(KEY),bytes)}for(const raw of [JSON.stringify({...b,version:9}),JSON.stringify({...b,raw:6}),JSON.stringify({...b,x:0}),JSON.stringify({...b,state:{}})]){await h.importRaw(raw);assert.deepEqual(h.state(),before);assert.equal(h.storage.getItem(KEY),bytes)}
});
await test('Corrupt/future saves and original APK key preserved, confirmed recovery backs up exact raw',async()=>{
 for(const raw of ['{broken','{"format":"future","version":9}']){const storage=new MemoryStorage({[KEY]:raw,slotten:'APK ORIGINAL'}),h=createHarness({storage});assert.match(h.status(),/壊れている/);await spin(h);assert.equal(storage.getItem(KEY),raw);assert.equal(storage.getItem('slotten'),'APK ORIGINAL');h.click('settings');h.click('reset');await h.settle();assert.equal(JSON.parse(storage.getItem(KEY+':backup')).raw,raw);assert.equal(JSON.parse(storage.getItem(KEY)).state.spins,0);assert.equal(storage.getItem('slotten'),'APK ORIGINAL')}
 const storage=new MemoryStorage({[KEY]:'{corrupt'}),h=createHarness({storage});h.click('settings');storage.failWrite=true;h.click('reset');await h.settle();assert.equal(storage.getItem(KEY),'{corrupt');storage.failWrite=false;h.click('retry');await h.settle();assert.equal(storage.getItem(KEY),'{corrupt');
 const huge=new MemoryStorage({[KEY]:'x'.repeat(100000)}),big=createHarness({storage:huge});big.click('settings');big.click('reset');await big.settle();assert.equal(huge.getItem(KEY),'x'.repeat(100000));assert.equal(big.state().coins,1000);
 const escapedStorage=new MemoryStorage({[KEY]:'\x00'.repeat(20000)}),escaped=createHarness({storage:escapedStorage});escaped.click('settings');escaped.click('reset');await escaped.settle();assert.equal(escapedStorage.getItem(KEY),'\x00'.repeat(20000));assert.equal(escapedStorage.writes,0);assert.match(escaped.get('settingsNotice').textContent,/大きすぎ/);assert.match(escaped.status(),/壊れている/);
});
await test('Replacement backup/main write failure retains both memory and durable main; backup remains recoverable',async()=>{
 for(const failKey of [KEY,KEY+':backup']){const h=createHarness();await spin(h);const before=h.state(),raw=h.storage.getItem(KEY);h.click('settings');h.storage.failKey=failKey;h.click('reset');await h.settle();assert.deepEqual(h.state(),before);assert.equal(h.storage.getItem(KEY),raw);if(failKey===KEY)assert.deepEqual(clone(h.run('C.decodeBackup(S.backup())')),before)}
});
await test('No Web Locks / denied reads no-write memory mode, recoverable reset and full roundtrip',async()=>{
 for(const mode of ['noLocks','denied']){const storage=new MemoryStorage({slotten:'untouched'});if(mode==='denied')storage.failRead=true;const h=createHarness({storage,lockManager:mode==='noLocks'?null:locks()});await spin(h);assert.equal(h.state().spins,1);assert.equal(storage.writes,0);h.click('settings');const raw=h.run('C.encode(slotState)');h.click('reset');await h.settle();assert.equal(h.state().spins,0);assert.equal(storage.writes,0);await h.importRaw(raw);assert.equal(h.state().spins,1);assert.equal(storage.writes,0);assert.equal(storage.data.get('slotten'),'untouched')}
});
await test('Two independent tabs compare inside shared Web Lock; conflict stops spins and destructive writes',async()=>{
 const storage=new MemoryStorage(),lock=locks(),a=createHarness({storage,lockManager:lock}),b=createHarness({storage,lockManager:lock});a.click('manual');b.click('manual');await a.settle();await b.settle();assert.equal(a.state().spins,1);assert.equal(b.state().spins,0);assert.match(b.status(),/別タブ/);a.frame(1000);await a.settle();const bytes=storage.getItem(KEY);await spin(b);b.click('settings');await b.importRaw(b.run('C.encode({...C.blank(),machine:9})'));assert.equal(storage.getItem(KEY),bytes);assert.equal(b.state().spins,0);
 const c=createHarness({storage,lockManager:lock});c.click('auto');await c.settle();c.windowEvent('storage',{key:KEY,newValue:'another tab'});await c.settle();assert.equal(c.run('auto'),false);assert.match(c.status(),/別タブ/);assert.equal(c.state().pending,null);
});
await test('Sound exceptions/rejected promises do not stop spins; mute and lifecycle stop oscillator/context',async()=>{
 const events=[];class Audio{constructor(){this.currentTime=0;this.destination={};events.push('create')}resume(){events.push('resume');return Promise.reject(Error('blocked'))}suspend(){events.push('suspend');return Promise.resolve()}createOscillator(){return{frequency:{value:0},connect(){},disconnect(){events.push('disconnect')},start(){events.push('start')},stop(){events.push('stop')}}}createGain(){return{connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}}}
 const h=createHarness({audio:Audio,random:[0,0,0]});h.click('manual');await h.settle();assert.ok(events.includes('start'));h.click('sound');await h.settle();assert.equal(h.state().sound,false);assert.ok(events.includes('suspend'));h.frame(1000);await h.settle();assert.equal(h.state().wins,1);assert.equal(createHarness({storage:h.storage}).state().sound,false);
 const fail=createHarness({audio:class{constructor(){throw Error('no audio')}}});await spin(fail);assert.equal(fail.state().spins,1);
 const paused=createHarness({audio:Audio});paused.click('manual');await paused.settle();const n=events.length;paused.windowEvent('blur');await paused.settle();assert.ok(events.slice(n).includes('suspend'));assert.equal(paused.state().pending,null);
});
await test('Navigation/version references, no network assets or APK storage access, keyboard repeat guard',()=>{
 const h=createHarness(),html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal(h.get('returnLink').getAttribute('href'),'../../browser/');assert.match(html,/ブラウザ版 1\.0-web\.1/);for(const n of h.document.querySelectorAll('script[src],link[rel="stylesheet"]')){const ref=n.getAttribute('src')||n.getAttribute('href');assert.match(ref,/\?v=1\.0-web\.1$/);assert.ok(fs.existsSync(path.join(root,ref.split('?')[0])))}assert.doesNotMatch(html,/(?:src|href)="https?:/);let prevented=false;h.windowEvent('keydown',{key:'Enter',repeat:true,target:h.get('manual'),preventDefault(){prevented=true}});assert.equal(prevented,true);
 for(const f of ['browser.js','storage.js']){const s=fs.readFileSync(path.join(root,f),'utf8');assert.doesNotMatch(s,/localStorage\.(?:getItem|setItem)\(['"]slotten['"]/);assert.doesNotMatch(s,/\bfetch\(|XMLHttpRequest|WebSocket/)}
});
console.log(`SlotTen: ${tests.length} deterministic suites passed. No actual Chrome/audio/mobile/native-picker claim.`);
})().catch(e=>{console.error(e);process.exitCode=1});
