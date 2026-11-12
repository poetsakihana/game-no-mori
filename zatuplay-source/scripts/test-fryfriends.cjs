'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {root,KEY,MemoryStorage,locks,createHarness}=require('./fryfriends-harness.cjs');
const json=x=>JSON.parse(JSON.stringify(x)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const tests=[];async function test(name,fn){await fn();tests.push(name);console.log('PASS',name)}
const start=h=>{h.click(h.document.querySelector('[data-ch="0"]'));h.click('start')};
function forceChain(h,type=0,n=6){h.run(`game.board=Array(36).fill(${type});game.selected=Array.from({length:${n}},(_,i)=>i);paint();commit()`)}
// Ordinary DOM actions. The solver reads only tile labels, chooses a legal path and activates buttons.
function bestPath(h){
 const tiles=[...h.document.querySelectorAll('[data-tile]')],board=tiles.map(e=>e.getAttribute('aria-label').replace(/ \d行\d列$/,''));
 const g=h.game();let best=[],bestScore=-1;
 const adj=(a,b)=>a!==b&&Math.abs(a%6-b%6)<=1&&Math.abs((a/6|0)-(b/6|0))<=1;
 const neighbors=board.map((t,a)=>board.flatMap((u,b)=>u===t&&adj(a,b)?[b]:[]));
 const goalType=g.c.type,goalName=goalType>=0?json(h.run('names'))[goalType]:null;
 let visits=0;
 function walk(p){if(++visits>150000)return;if(p.length>=3){const n=p.length,value=(g.c.chainGoal?(n>=5?100000:0):goalName&&board[p[0]]===goalName?100000:0)+n*n;if(value>bestScore){best=[...p];bestScore=value}}if(p.length>=12)return;for(const b of neighbors[p.at(-1)])if(!p.includes(b))walk([...p,b])}
 for(let a=0;a<36;a++)walk([a]);return best;
}
function ordinaryTurn(h,mode='tap'){const p=bestPath(h);assert.ok(p.length>=3);for(const i of p){const tile=h.document.querySelector(`[data-tile="${i}"]`);if(mode==='keyboard')h.emit(tile,'keydown',{key:'Enter',repeat:false});else{h.pointer('pointerdown',i);h.pointer('pointerup',i)}}h.click('commit');return p.length}
(async()=>{
await test('Original 15 chapters, exact objectives and moves, unmodified content/art and 115 WebP decodes',async()=>{
 const h=createHarness(),c=json(h.run('chapters'));const expected=[[450,18,-1],[650,18,-1],[12,22,1],[12,22,3],[12,22,6],[15,24,4],[1000,24,-1],[3,28,-1,5],[18,28,6],[1400,28,-1],[18,28,4],[18,28,0],[4,30,-1,5],[1600,30,-1],[1800,32,-1]];
 assert.equal(c.length,15);c.forEach((v,i)=>{assert.equal(v.id,i+1);assert.deepEqual([v.target,v.moves,v.type,...(v.chainGoal?[v.chainGoal]:[])],expected[i]);for(const key of ['title','tag','intro','goal','end'])assert.ok(v[key].length>0)});
 const p=JSON.parse(fs.readFileSync(path.join(root,'provenance.json')));assert.equal(p.originalAssets.length,118);for(const f of p.unchangedAssets){const b=fs.readFileSync(path.join(root,f.path));assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256)}
 const content=fs.readFileSync(path.join(root,'content.js'),'utf8');assert.equal(sha(content.slice(content.indexOf('const names='))),p.originalContentSection.sha256);
 const {loadImage}=require('@napi-rs/canvas');const images=p.unchangedAssets.filter(f=>f.path.endsWith('.webp'));assert.equal(images.length,115);for(const f of images){const im=await loadImage(fs.readFileSync(path.join(root,f.path)));assert.ok(im.width>0&&im.height>0,f.path)}
 for(let ep=1;ep<=15;ep++)for(let page=0;page<7;page++){h.run(`reader(${ep},${page})`);assert.match(h.get('modalBody').innerHTML,new RegExp(`ep${ep}-${page}\\.webp`));assert.equal(h.get('prev').disabled,page===0);assert.equal(h.get('next').disabled,page===6)}
});
await test('Ordinary UI first clear, record reload, complete board/result persistence and no duplicate reward',async()=>{
 const h=createHarness();start(h);for(let i=0;i<15;i++){h.click('hint');h.click('commit')}assert.equal(h.state().stars[1],1);assert.equal(h.state().coins,20);assert.equal(h.game().score,450);assert.match(h.get('modalBody').textContent,/みんなの笑顔/);const before=h.state();h.run('finish(true);showResult();finish(true)');assert.deepEqual(h.state(),before);await h.settle();const reload=createHarness({storage:h.storage});assert.deepEqual(reload.state(),before);assert.match(reload.get('modalBody').textContent,/みんなの笑顔/);reload.click('resultHome');assert.equal(reload.document.querySelector('[data-ch="1"]').disabled,false);assert.equal(reload.document.querySelector('[data-ch="2"]').disabled,true);
});
await test('Ordinary DOM play through all 15 stages, including target and long-chain chapters (model, not Chrome)',async()=>{
 const h=createHarness({seed:2404});let attempts=0,turns=0,long=0,target=0;start(h);
 for(let ch=0;ch<15;ch++){
  let retries=0;
  while(true){attempts++;while(!h.game().done){const n=ordinaryTurn(h,turns%2?'tap':'keyboard');turns++;if(n>=5)long++}if(h.game().result.win)break;if(++retries>80)throw Error(`stage ${ch+1} not won`);h.click('retry')}
  if(h.game().c.type>=0)target++;assert.ok(h.state().stars[ch+1]);if(ch<14){h.click('continue');h.click('start')}
 }
 assert.equal(Object.keys(h.state().stars).length,15);assert.equal(target,7);assert.ok(long>=7);h.click('showEnding');assert.match(h.get('modalBody').textContent,/全15話クリア/);await h.settle();console.log('  DOM solver evidence:',JSON.stringify({attempts,turns,longChains:long,stars:Object.values(h.state().stars).reduce((a,b)=>a+b,0)}));
});
await test('All 15 objective counters, sequential unlock, guest gates 3/9/10, 45 stars and star improvement/replay',async()=>{
 const h=createHarness();start(h);
 for(let i=0;i<15;i++){
  if(i){h.click('continue');h.click('start')}
  const c=h.game().c;while(!h.game().done)forceChain(h,c.type>=0?c.type:i%7);
  assert.equal(h.state().stars[i+1],3);assert.equal(h.game().result.bonus,60);assert.equal(h.game().result.win,true);
  h.run('friends()');for(const guest of [3,9,10])assert.equal(h.get('modalBody').innerHTML.includes(`guest${guest}.webp`),i+1>=guest);h.click('close');h.run('showResult()');
 }
 assert.equal(Object.values(h.state().stars).reduce((a,b)=>a+b,0),45);h.run('ending()');assert.match(h.get('modalBody').textContent,/友情マスター/);h.click('close');h.run('home()');h.click(h.document.querySelector('[data-ch="0"]'));h.click('start');forceChain(h);forceChain(h);assert.equal(h.game().result.bonus,0);
 const t=createHarness();start(t);for(let i=0;i<15;i++){t.click('hint');t.click('commit')}assert.equal(t.state().coins,20);t.click('retry');forceChain(t);forceChain(t);assert.equal(t.game().result.bonus,40);assert.equal(t.state().stars[1],3);await h.settle();await t.settle();
});
await test('Independent 1/2/3 star boundaries and score/coin formula for 3–36 chains',async()=>{
 for(const [moves,expected] of [[0,1],[4,1],[5,2],[8,2],[9,3],[17,3]]){
  const h=createHarness();start(h);const spent=18-moves;h.run(`game.moves=${moves};game.score=${spent*10*36*34};game.typeCounts=[${spent*36},0,0,0,0,0,0];save.seen=[0];save.coins=${spent*36};finish(true)`);assert.equal(h.game().result.stars,expected);assert.equal(h.state().coins,expected*20+spent*36);await h.settle();assert.match(h.status(),/保存済み/)
 }
 for(let n=3;n<=36;n++){const h=createHarness();h.click('endless');const snake=Array.from({length:36},(_,i)=>{const row=i/6|0;return row*6+(row%2?5-i%6:i%6)});h.run(`game.board=Array(36).fill(2);game.selected=${JSON.stringify(snake.slice(0,n))};commit()`);assert.equal(h.game().score,10*n*(n-2));assert.equal(h.game().moves,29);assert.equal(h.state().coins,n>=6?n:0);await h.settle();assert.match(h.status(),/保存済み/)}
});
await test('Diagonal/orthogonal legality, no repeat, backtracking, mixed/short/repeated chains and gravity',()=>{
 const h=createHarness();h.click('endless');h.run('game.board=Array(36).fill(0);paint()');h.run('select(0);select(7);select(14);select(7)');assert.deepEqual(h.game().selected,[0,7]);h.run('select(0)');assert.deepEqual(h.game().selected,[0]);h.run('select(0);select(35)');assert.deepEqual(h.game().selected,[0]);h.click('commit');assert.equal(h.game().moves,30);
 h.run('game.board[1]=1;select(1)');assert.deepEqual(h.game().selected,[1]);h.run('game.selected=[0,0,0];commit()');assert.equal(h.game().moves,30);h.run('game.selected=[0,7,35];commit()');assert.equal(h.game().moves,30);
 const b=Array.from({length:36},(_,i)=>(Math.floor(i/6)+i%6)%7);b[0]=b[6]=b[12]=0;h.run(`game.board=${JSON.stringify(b)};game.selected=[0,6,12];commit()`);const after=h.game().board;assert.deepEqual([after[18],after[24],after[30]],[b[18],b[24],b[30]]);for(let col=1;col<6;col++)for(let r=0;r<6;r++)assert.equal(after[r*6+col],b[r*6+col]);assert.ok(h.run('findPath(game.board)'));
});
await test('Guaranteed dead-board repair, three free helps, long-chain hint preference',async()=>{
 const h=createHarness();start(h);const dead=Array.from({length:36},(_,i)=>i%6%3+((i/6|0)%2)*3);h.run(`game.board=${JSON.stringify(dead)}`);assert.equal(h.run('findPath(game.board)'),null);assert.equal(h.run('ensure()'),true);assert.equal(h.game().board[0],h.game().board[1]);assert.equal(h.game().board[1],h.game().board[2]);h.run('paint()');for(let i=0;i<4;i++)h.click('shuffle');assert.equal(h.game().helps,0);assert.equal(h.game().moves,18);assert.match(h.get('message').textContent,/使い切った/);await h.settle();assert.equal(createHarness({storage:h.storage}).game().helps,0);
 const s=h.state();s.stars={};s.best={};for(let i=1;i<=7;i++){s.stars[i]=3;s.best[i]=2000}s.coins=420;s.attempt=null;s.screen='home';h.run(`save=FryStore.validate(${JSON.stringify(s)});restoreAttempt();renderHome()`);h.click(h.document.querySelector('[data-ch="7"]'));h.click('start');h.run('game.board=Array(36).fill(0);paint()');h.click('hint');assert.equal(h.game().selected.length,5);h.click('commit');assert.equal(h.game().chains,1);
});
await test('30-move endless via ordinary hint/commit and high-score/retry/result idempotence',async()=>{
 const h=createHarness();h.click('endless');for(let i=0;i<30;i++){h.click('hint');h.click('commit')}assert.equal(h.game().moves,0);assert.equal(h.state().endless,900);const before=h.state();h.run('finish(false);showResult();finish(false)');assert.deepEqual(h.state(),before);const retry=h.get('retry');h.click(retry);h.click(retry);assert.equal(h.game().moves,30);assert.equal(h.confirmations.length,0);await h.settle();assert.equal(createHarness({storage:h.storage}).state().endless,900);
});
await test('Tap, drag and keyboard; pointercancel/leave/lost capture/modal/blur discard stale input',async()=>{
 const h=createHarness();h.click('endless');h.run('game.board=Array(36).fill(0);paint()');h.pointer('pointerdown',0);h.pointer('pointermove',7);h.pointer('pointermove',14);assert.deepEqual(h.game().selected,[0,7,14]);h.pointer('pointermove',7);assert.deepEqual(h.game().selected,[0,7]);h.pointer('pointermove',0);assert.deepEqual(h.game().selected,[0]);h.pointer('pointermove',0);assert.deepEqual(h.game().selected,[0]);h.pointer('pointermove',7);h.pointer('pointermove',14);h.pointer('pointermove',0);assert.deepEqual(h.game().selected,[0,7,14]);h.pointer('pointercancel',null);assert.equal(h.game().moves,30);h.pointer('pointerdown',0);h.pointer('pointermove',1);h.pointer('pointermove',2);h.pointer('pointerup',2);assert.equal(h.game().moves,29);
 for(const type of ['pointercancel','pointerleave','lostpointercapture']){h.run('game.board=Array(36).fill(0);paint()');h.pointer('pointerdown',0);h.pointer('pointermove',1);h.pointer(type,null);h.pointer('pointerup',2);assert.equal(h.game().moves,29);assert.deepEqual(h.game().selected,[])}
 h.run('game.board=Array(36).fill(0);paint()');for(const i of [0,1,2]){h.pointer('pointerdown',i);h.pointer('pointerup',i)}h.click('commit');assert.equal(h.game().moves,28);
 for(const i of [6,7,8])h.emit(h.document.querySelector(`[data-tile="${i}"]`),'keydown',{key:'Enter',repeat:false});h.emit(h.document.querySelector('[data-tile="9"]'),'keydown',{key:'Enter',repeat:true});assert.equal(h.game().selected.length,3);h.click('help');assert.deepEqual(h.game().selected,[]);h.run('select(0);commit()');assert.equal(h.game().moves,28);h.click('close');h.click('hint');h.windowEvent('blur');h.pointer('pointerup',2);h.click('commit');assert.equal(h.game().moves,28);assert.equal(h.run('inputPaused'),true);h.click('resumeInput');assert.deepEqual(h.game().selected,[]);h.click('hint');h.click('commit');assert.equal(h.game().moves,27);
 h.click('hint');h.visibility(true);h.visibility(false);assert.equal(h.run('inputPaused'),true);assert.deepEqual(h.game().selected,[]);h.click('resumeInput');await h.settle();
});
await test('Completed taps survive leaving the board for Commit; active drags still cancel on leave/capture loss',async()=>{
 const h=createHarness();h.click('endless');h.run('game.board=Array(36).fill(0);paint()');
 for(const i of [0,7,12]){h.pointer('pointerdown',i);h.pointer('pointerup',i);h.pointer('lostpointercapture',i)}
 assert.deepEqual(h.game().selected,[0,7,12]);h.pointer('pointerleave',null);assert.deepEqual(h.game().selected,[0,7,12]);h.click('commit');assert.equal(h.game().score,30);assert.equal(h.game().moves,29);
 for(const ending of ['pointerleave','lostpointercapture']){h.run('game.board=Array(36).fill(0);paint()');h.pointer('pointerdown',0);h.pointer('pointermove',7);h.pointer('pointermove',12);h.pointer(ending,null);h.pointer('pointerup',12);h.click('commit');assert.deepEqual(h.game().selected,[]);assert.equal(h.game().score,30);assert.equal(h.game().moves,29)}await h.settle();
});
await test('Drag traverses board gaps/padding/descendants; outside/null/cancel/leave and released input remain safe',async()=>{
 const h=createHarness();h.click('endless');h.run('game.board=Array(36).fill(0);paint()');
 const moveOver=hit=>{const original=h.document.elementFromPoint;h.document.elementFromPoint=()=>hit;h.pointer('pointermove',null);h.document.elementFromPoint=original};
 h.pointer('pointerdown',0);h.pointer('pointermove',null);assert.deepEqual(h.game().selected,[0]);assert.ok(h.run('drag'));
 const decoration=h.document.createElement('span');h.document.querySelector('.board').append(decoration);moveOver(decoration);assert.deepEqual(h.game().selected,[0]);assert.ok(h.run('drag'));
 moveOver(h.document.querySelector('[data-tile="7"] img'));h.pointer('pointermove',null);h.pointer('pointermove',14);assert.deepEqual(h.game().selected,[0,7,14]);
 h.pointer('pointermove',null);h.pointer('pointermove',7);h.pointer('pointermove',null);h.pointer('pointermove',0);assert.deepEqual(h.game().selected,[0]);
 h.pointer('pointermove',7);h.pointer('pointermove',null);h.pointer('pointermove',14);h.pointer('pointerup',null);assert.equal(h.game().score,30);assert.equal(h.game().moves,29);
 h.pointer('pointermove',null);h.pointer('pointermove',2);h.pointer('pointerup',2);assert.deepEqual(h.game().selected,[]);assert.equal(h.game().moves,29);
 for(const finish of ['outside','null','pointerleave','pointercancel','lostpointercapture','blur']){
  h.run('game.board=Array(36).fill(0);paint()');h.pointer('pointerdown',0);h.pointer('pointermove',null);h.pointer('pointermove',7);
  if(finish==='outside'||finish==='null')moveOver(finish==='null'?null:h.document.body);else if(finish==='blur')h.windowEvent('blur');else h.pointer(finish,null);
  h.pointer('pointermove',14);h.pointer('pointerup',14);h.click('commit');assert.deepEqual(h.game().selected,[]);assert.equal(h.game().moves,29);assert.equal(h.game().score,30);if(finish==='blur')h.click('resumeInput');
 }
 h.pointer('pointerdown',0);h.pointer('pointerup',0);h.pointer('pointermove',null);assert.deepEqual(h.game().selected,[0]);h.pointer('pointermove',7);assert.deepEqual(h.game().selected,[0]);
 await h.settle();
});
await test('Unfinished board preserved through home/reload; abandonment cancel or backed-up confirmation',async()=>{
 const h=createHarness();start(h);ordinaryTurn(h);h.click('shuffle');h.click('sound');const a=h.state().attempt;h.click('back');assert.deepEqual(h.state().attempt,a);await h.settle();const r=createHarness({storage:h.storage});assert.equal(r.state().sound,true);assert.deepEqual(r.state().attempt,a);assert.equal(r.state().screen,'home');r.click('resume');assert.deepEqual(r.state().attempt,a);assert.deepEqual(r.game().selected,[]);r.click('back');r.setConfirm(false);r.click('endless');await r.settle();assert.deepEqual(r.state().attempt,a);r.setConfirm(true);r.click('endless');await r.settle();assert.equal(r.game().index,-1);assert.deepEqual(r.run('FryStore.decodeBackup(FryStore.backup()).attempt')&&json(r.run('FryStore.decodeBackup(FryStore.backup()).attempt')),a);
});
await test('Full JSON export/import, cancel, same file twice, backup and confirmed reset/restoration',async()=>{
 const h=createHarness();start(h);ordinaryTurn(h);h.click('shuffle');h.click('sound');await h.settle();const before=h.state();h.click('records');h.click('export');const raw=await h.downloads.at(-1).text();assert.deepEqual(JSON.parse(raw).state,before);h.click('close');h.click('hint');h.click('commit');const later=h.state();h.click('records');h.setConfirm(false);await h.importRaw(raw);assert.deepEqual(h.state(),later);h.setConfirm(true);await h.importRaw(raw);assert.deepEqual(h.state(),before);const backup=json(h.run('FryStore.decodeBackup(FryStore.backup())'));assert.deepEqual(backup,later);assert.equal(h.get('importFile').value,'');await h.importRaw(raw);assert.deepEqual(h.state(),before);await h.settle();assert.deepEqual(createHarness({storage:h.storage}).state(),before);
 h.click('records');h.click('resetRecord');await h.settle();assert.deepEqual(h.state(),json(h.run('FryStore.blank()')));await h.importRaw(h.run('FryStore.backup()'));assert.deepEqual(h.state(),before);
});
await test('Deep malformed/nested/XSS/unknown/future saves rejected atomically',async()=>{
 const h=createHarness();start(h);h.click('hint');h.click('commit');await h.settle();const before=h.state(),durable=h.storage.getItem(KEY),base=JSON.parse(h.run('FryStore.encode(snapshot())'));
 const mutate=fn=>{const x=json(base);fn(x);return JSON.stringify(x)};
 const invalid=['{','[]',mutate(x=>x.version=99),mutate(x=>x.state.stars[1]='<img src=x onerror=alert(1)>'),mutate(x=>x.state.stars[2]=3),mutate(x=>x.state.seen.push(x.state.seen[0])),mutate(x=>x.state.best[1]=1),mutate(x=>x.state.sound='true'),mutate(x=>x.state.unknown=0),mutate(x=>x.state.attempt.board[0]=7),mutate(x=>x.state.attempt.board.pop()),mutate(x=>x.state.attempt.moves=-1),mutate(x=>x.state.attempt.score=999999999),mutate(x=>x.state.attempt.result={win:true,stars:3,bonus:60}),mutate(x=>x.state.attempt.typeCounts=[999,0,0,0,0,0,0]),mutate(x=>x.state.attempt.count=1),mutate(x=>x.state.attempt.helps=4),mutate(x=>x.state.attempt.chains=1),mutate(x=>x.state.attempt.index=15),mutate(x=>x.state.attempt.done=true),mutate(x=>x.state.seen=[]),mutate(x=>x.state.coins=-1),mutate(x=>x.state.stars=JSON.parse('{"__proto__":3}')),mutate(x=>x.state.attempt.typeCounts[0]=1),' '.repeat(200000)];
 for(const raw of invalid){h.click('records');await h.importRaw(raw);assert.deepEqual(h.state(),before);assert.equal(h.storage.getItem(KEY),durable);assert.equal(h.document.querySelector('[onerror]'),null)}
});
await test('Corrupt raw protection, failed backup/write, quota and denial preserve durable and current state',async()=>{
 const storage=new MemoryStorage({[KEY]:'{corrupt original'}),h=createHarness({storage});start(h);h.click('hint');h.click('commit');await h.settle();assert.equal(storage.getItem(KEY),'{corrupt original');assert.match(h.status(),/保護/);const raw=h.run('FryStore.encode(snapshot())');storage.failWrite=true;await h.importRaw(raw);const before=h.state();assert.equal(storage.getItem(KEY),'{corrupt original');storage.failWrite=false;h.run('FryStore.retry();persist()');await h.settle();assert.equal(storage.getItem(KEY),'{corrupt original');await h.importRaw(raw);assert.equal(JSON.parse(storage.getItem(KEY+':backup')).raw,'{corrupt original');assert.deepEqual(h.state(),before);
 for(const failureKey of [KEY,KEY+':backup']){const t=createHarness();start(t);await t.settle();const previous=t.state(),durable=t.storage.getItem(KEY);t.storage.failKey=failureKey;t.click('records');t.click('resetRecord');await t.settle();assert.deepEqual(t.state(),previous);assert.equal(t.storage.getItem(KEY),durable);assert.match(t.status(),/容量/)}
 const denied=new MemoryStorage();denied.failRead=true;const t=createHarness({storage:denied});start(t);t.click('hint');t.click('commit');await t.settle();assert.equal(denied.writes,0);assert.match(t.status(),/利用できません/);
});
await test('Large corrupt raw backup exports bounded full recovery state and exact separate archival bytes',async()=>{
 for(const original of ['x'.repeat(300000),'\u0000'.repeat(300000)]){
  const storage=new MemoryStorage({[KEY]:original}),h=createHarness({storage});start(h);h.click('hint');h.click('commit');await h.settle();const previous=h.state();assert.equal(storage.getItem(KEY),original);h.click('records');h.click('resetRecord');await h.settle();assert.equal(h.game(),null);assert.equal(JSON.parse(storage.getItem(KEY+':backup')).raw,original);
  h.click('records');assert.match(h.get('backup').textContent,/復元用JSON/);assert.match(h.get('backupRaw').textContent,/保管用/);h.click('backupRaw');assert.equal(await h.downloads.at(-1).text(),original);assert.equal(h.downloads.at(-1).type,'text/plain;charset=utf-8');h.click('backup');const recovery=await h.downloads.at(-1).text();assert.ok(Buffer.byteLength(recovery)<h.run('FryStore.MAX_BYTES'));assert.equal(Object.hasOwn(JSON.parse(recovery),'raw'),false);assert.deepEqual(JSON.parse(recovery).state,previous);await h.importRaw(recovery);assert.deepEqual(h.state(),previous);assert.equal(h.game().score,30);await h.settle();assert.deepEqual(createHarness({storage}).state(),previous);
 }
 const storage=new MemoryStorage({[KEY]:'x'.repeat(300000)}),h=createHarness({storage,lockManager:null});start(h);h.click('hint');h.click('commit');const previous=h.state();h.click('records');h.click('resetRecord');await h.settle();h.click('records');h.click('backup');const recovery=await h.downloads.at(-1).text();assert.ok(Buffer.byteLength(recovery)<h.run('FryStore.MAX_BYTES'));await h.importRaw(recovery);assert.deepEqual(h.state(),previous);assert.equal(storage.writes,0);assert.equal(storage.getItem(KEY),'x'.repeat(300000));
});
await test('No-lock memory fallback writes nothing; two tabs cannot overwrite one another',async()=>{
 const storage=new MemoryStorage(),h=createHarness({storage,lockManager:null});start(h);h.click('hint');h.click('commit');await h.settle();assert.equal(storage.writes,0);const before=h.state();h.click('records');h.click('resetRecord');await h.settle();assert.equal(storage.writes,0);assert.match(h.confirmations.at(-1),/メモリ/);await h.importRaw(h.run('FryStore.backup()'));assert.deepEqual(h.state(),before);assert.equal(storage.writes,0);
 const shared=new MemoryStorage(),lock=locks(),a=createHarness({storage:shared,lockManager:lock}),b=createHarness({storage:shared,lockManager:lock});start(a);start(b);a.click('hint');a.click('commit');b.click('hint');b.click('commit');await a.settle();await b.settle();assert.match(b.status(),/別タブ/);const durable=shared.getItem(KEY),beforeB=b.state();await b.importRaw(a.run('FryStore.encode(FryStore.blank())'));assert.deepEqual(b.state(),beforeB);assert.equal(shared.getItem(KEY),durable);
});
await test('Late file read, new/cancelled picker, modal navigation, lifecycle and confirmed lock wait are cancelled',async()=>{
 function deferred(h){h.click('records');let release;const raw=h.run('FryStore.encode(FryStore.blank())'),input=h.get('importFile');Object.defineProperty(input,'files',{configurable:true,value:[{size:raw.length,text:()=>new Promise(r=>release=()=>r(raw))}]});const promise=input.onchange({target:input});return {release,promise}}
 const actions=[h=>h.click('close'),h=>h.click('home'),h=>h.click('records'),h=>h.windowEvent('blur'),h=>h.windowEvent('pagehide'),h=>h.visibility(true),h=>h.emit('importFile','cancel'),h=>h.click('import')];
 for(const action of actions){const h=createHarness();start(h);await h.settle();const d=deferred(h);action(h);const before=h.state(),durable=h.storage.getItem(KEY);d.release();await d.promise;await h.settle();assert.deepEqual(h.state(),before);assert.equal(h.confirmations.length,0);if(before.screen==='game')assert.equal(h.storage.getItem(KEY),durable)}
 const h=createHarness();start(h);const d=deferred(h);await h.importRaw(h.run('FryStore.encode({...snapshot(),sound:true})'));const before=h.state();d.release();await d.promise;assert.deepEqual(h.state(),before);assert.equal(h.confirmations.length,1);
 for(const cancel of [h=>h.click('close'),h=>h.windowEvent('pagehide'),h=>h.click('home'),h=>h.click('records'),h=>h.emit('importFile','cancel')]){
  const pending=[],lock={request(n,o,fn){return new Promise(resolve=>pending.push(()=>resolve(fn())))}};const t=createHarness({lockManager:lock});t.click('records');const p=t.importRaw(t.run('FryStore.encode({...FryStore.blank(),sound:true})'));for(let i=0;i<25;i++)await Promise.resolve();assert.equal(t.run('busy'),true);cancel(t);for(let i=0;i<150;i++){await Promise.resolve();pending.shift()?.()}await p;assert.equal(t.state().sound,false);assert.equal(t.storage.getItem(KEY+':backup'),null);assert.equal(t.get('importFile').value,'');
 }
});
await test('Stale detached modal actions cannot operate on a newer intro, reader, result, ending or backup view',async()=>{
 const h=createHarness();h.run('intro(0)');const oldStart=h.get('start'),oldClose=h.get('close').onclick;h.run('closeModal();intro(0)');const newStart=h.get('start');h.click(oldStart);oldStart.onclick();oldClose();assert.equal(h.game(),null);assert.equal(h.get('start'),newStart);assert.equal(h.get('modal').open,true);h.click(newStart);assert.equal(h.game().index,0);
 h.run('reader(15,0)');const oldNext=h.get('next');h.run('closeModal();reader(1,4)');const newNext=h.get('next');h.click(oldNext);oldNext.onclick();assert.equal(h.run('readPage'),4);assert.equal(h.get('next'),newNext);h.click(newNext);assert.equal(h.run('readPage'),5);
 const oldPrev=h.get('prev');h.run('reader(2,2)');h.click(oldPrev);assert.equal(h.run('readPage'),2);assert.match(h.get('modalBody').textContent,/第2話/);
 h.click('close');for(let i=0;i<15;i++){h.click('hint');h.click('commit')}const staleResult=['retry','continue','resultHome'].map(id=>h.get(id));h.run('showResult()');const result=h.get('retry'),before=h.state();for(const node of staleResult){h.click(node);node.onclick();assert.deepEqual(h.state(),before);assert.equal(h.get('retry'),result);assert.equal(h.get('modal').open,true)}
 h.run('for(let id=1;id<=15;id++){save.stars[id]=3;save.best[id]=2000}save.coins=900;ending()');const oldEnding=h.get('endingHome');h.run('ending()');const newEnding=h.get('endingHome');h.click(oldEnding);assert.equal(h.get('endingHome'),newEnding);assert.equal(h.get('modal').open,true);
 h.click('records');const oldRecords=['export','import','backup','backupRaw','raw','retrySave','resetRecord'].map(id=>h.get(id));h.click('records');const newExport=h.get('export'),recordsBefore=h.state(),epoch=h.run('ioEpoch'),writes=h.storage.writes,downloads=h.downloads.length,confirmations=h.confirmations.length;for(const node of oldRecords){h.click(node);node.onclick()}assert.equal(h.get('export'),newExport);assert.deepEqual(h.state(),recordsBefore);assert.equal(h.run('ioEpoch'),epoch);assert.equal(h.storage.writes,writes);assert.equal(h.downloads.length,downloads);assert.equal(h.confirmations.length,confirmations);h.click(newExport);assert.equal(h.downloads.length,downloads+1);await h.settle();
});
await test('Queued close event cannot cancel a newer modal or a confirmed pending restore',async()=>{
 const h=createHarness();start(h);for(let i=0;i<15;i++){h.click('hint');h.click('commit')}h.click('continue');h.emit('modal','close');assert.equal(h.run('modalKind'),'intro');h.click('start');assert.equal(h.game().index,1);
 const pending=[],lock={request(n,o,fn){return new Promise(resolve=>pending.push(()=>resolve(fn())))}};const t=createHarness({lockManager:lock});t.click('records');const p=t.importRaw(t.run('FryStore.encode({...FryStore.blank(),sound:true})'));for(let i=0;i<20;i++)await Promise.resolve();t.emit('modal','close');assert.equal(t.run('busy'),true);for(let i=0;i<80;i++){await Promise.resolve();pending.shift()?.()}await p;assert.equal(t.state().sound,true);
});
await test('WebAudio unavailable, constructor and asynchronous resume failures do not break play',async()=>{
 for(const audio of ['none','throw','reject']){const h=createHarness({audio});start(h);h.click('sound');ordinaryTurn(h);await h.settle();assert.equal(h.game().moves,17);assert.equal(h.state().sound,true);assert.match(h.get('audioStatus').textContent,/音なし/);h.windowEvent('blur');await h.settle()}
});
await test('Catalog departure warns only when current record is unsaved, and cancellation retains the attempt',async()=>{
 const h=createHarness({lockManager:null});start(h);h.setConfirm(false);const before=h.state(),e=h.click('catalogLink');assert.equal(e.defaultPrevented,true);assert.deepEqual(h.state(),before);assert.match(h.confirmations.at(-1),/保存が完了/);h.setConfirm(true);assert.equal(h.click('catalogLink').defaultPrevented,false);const t=createHarness();start(t);await t.settle();t.click('catalogLink');assert.equal(t.confirmations.length,0);
});
await test('Versioned resources, safety/credits, relative catalog link, checksums and exact mirror',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/href="\.\.\/\.\.\/index.html"/);assert.match(html,/実際の油には入らない/);for(const m of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))([^" ]*)"/g))assert.equal(m[2],'?v=0.3.0-web.3');
 const list=fs.readFileSync(path.join(root,'CHECKSUMS.sha256'),'utf8').trim().split('\n');for(const line of list){const [hash,file]=line.split('  ');const b=fs.readFileSync(path.join(root,file));assert.equal(sha(b),hash,file);assert.deepEqual(b,fs.readFileSync(path.resolve(root,'../../../../zatuplay/games/fryfriends',file)))}
});
console.log(`PASS: ${tests.length} suites. DOM/storage/locks/input models plus real image decode. Public Chrome and actual downloads remain separate.`);
})().catch(e=>{console.error(e);process.exitCode=1});
