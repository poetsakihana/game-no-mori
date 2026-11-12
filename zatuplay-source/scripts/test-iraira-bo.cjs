'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {createHarness,MemoryStorage,locks,KEY,root}=require('./iraira-harness.cjs');
const box={structuredClone};vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(root,'model.js'),'utf8'),box);const M=box.NeonMaze;
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'iraira-native-courses.json'))).levels;
const plain=x=>JSON.parse(JSON.stringify(x));
async function started(options){const h=createHarness(options);h.act(100);h.act(200);await h.settle();return h;}
async function clear(h,level){h.pointer('pointerdown',180,666);for(const [x,y] of reference[level].points){h.advance(40);h.pointer('pointermove',180+(x-180)/.8,666+(y-666)/.8);if(h.get('[data-action="108"]'))break;}h.pointer('pointerup',180,41);await h.settle();assert(h.get('[data-action="108"]'),'stage '+(level+1)+' clear');}

test('all 30 native courses, widths, limits and 6,630 float32 vertices exactly match independent DEX reference',()=>{
 assert.equal(reference.length,30);for(const r of reference){const c=M.course(r.level);assert.equal(c.width,r.width);assert.equal(c.limit,r.limit);assert.deepEqual(plain(c.line.map(p=>[p.x,p.y])),r.points);}assert.throws(()=>M.course(30));
});
test('continuous collision, radius, goal, timeout boundary and best time use native rules',()=>{
 const g=new M.Game();g.start(0);assert.equal(g.state.x,180);g.move(180,166);assert.equal(g.state.screen,4);assert.equal(g.state.reason,'壁に当たった！');
 g.start(0);g.tick(75000);assert.equal(g.state.screen,2);g.tick(1);assert.equal(g.state.screen,4);assert.equal(g.state.reason,'時間切れ！');
 g.start(0);for(const p of g.course.line){g.tick(40);g.move(p.x,p.y);}assert.equal(g.state.screen,5);assert.equal(g.state.unlocked,2);const best=g.state.best[0];
 g.start(0);for(const p of g.course.line){g.tick(80);g.move(p.x,p.y);}assert.equal(g.state.best[0],best);assert.equal(g.state.unlocked,2);assert.equal(g.start(2),false);
});
test('all 30 stages clear sequentially through normal DOM buttons and captured pointer events, retain all bests and final ending after reload',async()=>{
 const h=await started();for(let n=0;n<30;n++){await clear(h,n);const s=h.value().state;assert.equal(s.screen,5);assert.equal(s.unlocked,Math.min(30,n+2));assert.equal(s.best.filter(x=>x!==null).length,n+1);assert.equal(h.captures.size,0);if(n<29)h.act(108);}
 assert(h.drawLog.includes('全ステージ制覇！'));const reload=createHarness({storage:h.storage});assert(reload.drawLog.includes('全ステージ制覇！'));reload.act(108);assert(reload.get('[data-action="229"]'));assert(reload.get('#game-status').textContent.includes('30/30'));
});
test('all 3 selection pages, locked buttons, title and page boundaries',async()=>{
 const h=createHarness();h.act(100);assert(h.get('[data-action="201"]').disabled);assert(h.get('[data-action="102"]').disabled);h.act(103);assert(h.get('[data-action="210"]').disabled);h.act(103);assert(h.get('[data-action="229"]').disabled);assert(h.get('[data-action="103"]').disabled);h.act(102);h.act(104);assert(h.get('[data-action="100"]'));await h.settle();
});
test('pointer grab radius, relative 0.8 movement, release, second pointer and no teleport',async()=>{
 const h=await started();h.pointer('pointerdown',100,666);h.pointer('pointermove',100,640);h.pointer('pointerup',100,640);await h.settle();assert.equal(h.value().state.y,666);
 h.pointer('pointerdown',180,666);h.pointer('pointerdown',200,666,2);h.pointer('pointermove',180,656,2);h.pointer('pointermove',180,656);h.pointer('pointerup',180,656);await h.settle();assert.equal(h.value().state.y,658);assert.equal(h.captures.size,0);
 h.pointer('pointermove',180,200);await h.settle();assert.equal(h.value().state.y,658);
});
test('mid-run save restores exact position and elapsed in paused state; explicit resume, keyboard and slow movement',async()=>{
 const h=await started();h.windowEvent('keydown',{key:'ArrowUp'});h.advance(100);h.windowEvent('keyup',{key:'ArrowUp'});await h.settle();assert.equal(h.value().state.y,657);
 const x=h.value().state;const r=createHarness({storage:h.storage});assert(r.get('[data-action="106"]'));r.advance(90000);assert.equal(r.value().state.elapsed,x.elapsed);r.act(106);r.windowEvent('keydown',{key:'Shift'});r.windowEvent('keydown',{key:'w'});r.advance(100);r.windowEvent('keyup',{key:'w'});r.windowEvent('keyup',{key:'Shift'});await r.settle();assert.equal(r.value().state.y,654);assert.equal(r.value().state.elapsed,x.elapsed+100);
});
test('manual stop, blur, hidden, pagehide, pointercancel and lost capture stop time/keys/audio until resume',async()=>{
 for(const stop of [h=>h.click('#pause'),h=>h.windowEvent('blur'),h=>h.visibility(true),h=>h.windowEvent('pagehide'),h=>h.pointer('pointercancel',180,666),h=>h.pointer('lostpointercapture',180,666)]){
  const h=await started();h.pointer('pointerdown',180,666);h.windowEvent('keydown',{key:'ArrowUp'});h.advance(50);stop(h);await h.settle();const s=h.value().state;assert.equal(s.screen,3);assert.equal(h.captures.size,0);h.advance(90000);h.visibility(false);h.windowEvent('pageshow');await h.settle();assert.equal(h.value().state.elapsed,s.elapsed);assert.equal(h.value().state.y,s.y);assert(h.get('[data-action="106"]'));h.act(106);h.advance(100);h.click('#pause');await h.settle();assert.equal(h.value().state.y,s.y);
 }
});
test('wall and timeout failure retain result, retry and restart cancellation work',async()=>{
 const h=await started();h.pointer('pointerdown',180,666);h.pointer('pointermove',350,666);await h.settle();assert(h.drawLog.includes('壁に当たった！'));assert.equal(h.value().state.deaths,1);const r=createHarness({storage:h.storage});assert(r.drawLog.includes('壁に当たった！'));r.act(107);r.advance(75001);await r.settle();assert(r.drawLog.includes('時間切れ！'));r.act(107);r.advance(500);r.click('#pause');await r.settle();const elapsed=r.value().state.elapsed;r.setConfirm(false);r.act(107);await r.settle();assert.equal(r.value().state.elapsed,elapsed);assert(r.get('[data-action="106"]'));r.setConfirm(true);r.act(107);await r.settle();assert.equal(r.value().state.elapsed,0);
});
test('sound toggle persists, no autoplay on reload, success/failure cue and unsupported audio notice',async()=>{
 const h=await started();await clear(h,0);assert(h.audioLog.includes('start'));h.click('#sound');await h.settle();assert.equal(h.value().state.sound,false);const r=createHarness({storage:h.storage});assert.equal(r.audioLog.length,0);assert.equal(r.get('#sound').textContent,'効果音 OFF');r.click('#sound');await r.settle();assert.equal(r.value().state.sound,true);
 const no=await started({audio:false});assert.match(no.get('#audio-status').textContent,/再生できません/);assert.equal(no.value().state.screen,2);
});
test('broken, unknown, invalid and denied saved data are never overwritten',async()=>{
 for(const raw of ['broken','{}',JSON.stringify({version:2,revision:1,state:{}}),JSON.stringify({version:1,revision:1,state:{...plain(new M.Game().state),unlocked:30}})]){
  const storage=new MemoryStorage({[KEY]:raw}),h=await started({storage});h.click('#sound');await h.settle();assert.equal(storage.data.get(KEY),raw);assert.equal(storage.writes,0);assert.match(h.status(),/上書きせず/);
 }
 const storage=new MemoryStorage();storage.failRead=true;const h=await started({storage});assert.equal(storage.writes,0);assert.match(h.status(),/読み込めません/);
 const d=await started({deniedGetter:true});assert.match(d.status(),/保存なし/);
});
test('Web Locks unavailable does not write, quota and lock failure keep progress and allow retry',async()=>{
 const no=await started({lockManager:null});assert.equal(no.storage.writes,0);assert.match(no.status(),/保存せず/);
 const h=await started();const before=h.storage.data.get(KEY);h.storage.failWrite=true;h.click('#sound');await h.settle();assert.equal(h.storage.data.get(KEY),before);assert.equal(h.get('#retry-save').hidden,false);assert.match(h.status(),/保存できません/);h.storage.failWrite=false;h.click('#retry-save');await h.settle();assert.equal(h.value().state.sound,false);assert.match(h.status(),/保存しました/);
 const bad=await started({lockManager:{request:()=>Promise.reject(Error('denied'))}});assert.equal(bad.storage.writes,0);assert.match(bad.status(),/保存できません/);
});
test('shared lock serializes simultaneous tabs and rejects stale snapshot without overwriting newer progress',async()=>{
 const storage=new MemoryStorage(),l=locks(),a=createHarness({storage,lockManager:l}),b=createHarness({storage,lockManager:l});a.act(100);b.act(100);await a.settle();await b.settle();assert.equal(storage.writes,1);assert.match(b.status(),/別のタブ/);assert.equal(b.get('#reload').hidden,false);const before=storage.data.get(KEY);b.windowEvent('keydown',{key:'ArrowUp'});b.advance(1000);await b.settle();assert.equal(storage.data.get(KEY),before);
});
test('storage update/delete/clear stops gameplay, ignores unrelated storage, reload is confirmed',async()=>{
 const h=await started();h.windowEvent('storage',{key:'other',newValue:'x',storageArea:h.storage});assert(!h.get('[data-action="106"]'));
 h.windowEvent('storage',{key:KEY,newValue:'x',storageArea:new MemoryStorage()});assert(!h.get('[data-action="106"]'));
 const before=h.storage.data.get(KEY);h.windowEvent('storage',{key:KEY,newValue:null,storageArea:h.storage});assert.match(h.status(),/別のタブ/);assert(h.get('[data-action="106"]').disabled);h.advance(90000);await h.settle();assert.equal(h.storage.data.get(KEY),before);h.setConfirm(false);h.click('#reload');assert.equal(h.reloads(),0);h.setConfirm(true);h.click('#reload');assert.equal(h.reloads(),1);
 const q=await started();q.windowEvent('storage',{key:null,newValue:null,storageArea:q.storage});assert.match(q.status(),/別のタブ/);
});
test('help pauses game, direction-button hold and key steps use the same collision model',async()=>{
 const h=await started();h.click('#help-button');assert.equal(h.get('#help').hidden,false);assert(h.get('[data-action="106"]'));h.act(106);const b=h.get('[data-direction="ArrowUp"]');h.emit(b,'pointerdown',{button:0,pointerId:2});h.advance(100);h.emit(b,'pointerup',{pointerId:2});await h.settle();assert.equal(h.value().state.y,657);h.emit(b,'click',{detail:0});await h.settle();assert.equal(h.value().state.y,655);
});
test('missing model, unavailable Canvas and runtime error fail visibly without overwriting saves',async()=>{
 for(const opt of [{model:false},{canvas:false}]){const h=createHarness(opt);assert.equal(h.get('#load-error').hidden,false);assert.match(h.get('#load-error').textContent,/停止/);assert.equal(h.storage.writes,0);}
 const h=await started(),raw=h.storage.data.get(KEY);h.windowEvent('error');assert.equal(h.get('#load-error').hidden,false);h.advance(10000);await h.settle();assert.equal(h.storage.data.get(KEY),raw);
});
test('every saved field is type/range checked and impossible progression, geometry and results are rejected',()=>{
 const s=plain(new M.Game().state);M.validateState(s);for(const bad of [{...s,x:NaN},{...s,page:3},{...s,level:1},{...s,sound:1},{...s,extra:1},{...s,screen:2,y:100},{...s,screen:5},{...s,screen:4},{...s,elapsed:Infinity},{...s,best:Array(29).fill(null)},{...s,best:[null,1000,...Array(28).fill(null)]}])assert.throws(()=>M.validateState(bad));
 for(const v of [{version:1,revision:0,state:s},{version:1,revision:1.5,state:s},{version:1,revision:1,state:s,extra:1}])assert.throws(()=>M.decode(JSON.stringify(v)));
});
test('production mirror files and cache identifiers match',()=>{
 const deploy=path.resolve(root,'../../../../zatuplay/games/iraira-bo');for(const name of fs.readdirSync(root)){assert.deepEqual(fs.readFileSync(path.join(root,name)),fs.readFileSync(path.join(deploy,name)),name);}
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const name of ['style.css','model.js','game.js']){const sha=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex').slice(0,12);assert(html.includes(`${name}?v=${sha}`),name);}
 assert(!html.includes('target="_blank"'));assert(html.includes('../../browser/'));
});

test('long visible RAF delay saves the actual timeout duration and never traps retry or stage selection',async()=>{
 const h=await started();h.advance(200000);await h.settle();assert.equal(h.value().state.screen,4);assert.equal(h.value().state.elapsed,200000);assert.match(h.status(),/保存しました/);
 const r=createHarness({storage:h.storage});assert(r.drawLog.includes('時間切れ！'));assert.match(r.status(),/読み込みました/);r.act(109);await r.settle();assert.equal(r.value().state.screen,1);assert.equal(r.value().state.elapsed,200000);r.act(200);await r.settle();assert.equal(r.value().state.screen,2);assert.equal(r.value().state.elapsed,0);
 r.advance(1e12);await r.settle();assert.equal(r.value().state.screen,4);assert.equal(r.value().state.elapsed,1e12);r.act(107);await r.settle();assert.equal(r.value().state.elapsed,0);assert.equal(r.value().state.screen,2);
 const g=new M.Game();g.start(0);g.tick(Infinity);g.tick(NaN);assert.equal(g.state.elapsed,0);
});
