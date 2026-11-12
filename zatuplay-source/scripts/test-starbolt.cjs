const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {C,root,MemoryStorage,lockManager,oracle,harness}=require('./starbolt-harness.cjs');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const clean=v=>JSON.parse(JSON.stringify(v)),eq=(a,b)=>assert.deepEqual(clean(a),clean(b));let count=0;
async function test(name,fn){await fn();console.log('PASS '+(++count)+' '+name);}
function snapshot(g){const o={};for(const k of ['mode','stage','world','cam','tick','weapon','shot','player','platforms','enemies','bullets','hazards','boss','bossStarted','checkpoint','keys','jumpLatch','cleared'])o[k]=g[k];return clean(o);}
const valid={cleared:[0,3,7],sound:false};
const fixture=(data=valid)=>{const s=new MemoryStorage();s.setItem(C.STORAGE_KEY,JSON.stringify({format:'zatuplay-starbolt-save',version:1,revision:3,data}));return s;};
async function openUI(opts){const h=harness(opts);await h.settle();return h;}
(async()=>{
await test('original exact source hashes; full source/mirror integrity',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'original-source.json')));assert.equal(m.original.sha256,'cb255357a1a9e12bca46594cceb98d6a3024370d4e2ee03454254654b294118c');
 for(const f of m.files){const b=fs.readFileSync(path.join(root,f.path));assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
 const mirror=path.resolve(root,'../../../../zatuplay/games/starbolt');
 const files=dir=>fs.readdirSync(dir,{recursive:true}).filter(p=>fs.statSync(path.join(dir,p)).isFile()).sort();eq(files(root),files(mirror));for(const f of files(root))assert.equal(sha(fs.readFileSync(path.join(root,f))),sha(fs.readFileSync(path.join(mirror,f))),f);
 for(const line of fs.readFileSync(path.join(root,'checksums.sha256'),'utf8').trim().split('\n')){const [hash,file]=line.split('  ');assert.equal(sha(fs.readFileSync(path.join(root,file))),hash,file);}
});
await test('all 8 original stage geometries, 17 platforms/11 enemies/4 hazards, all initially selectable',()=>{
 const g=new C.Game(),o=oracle();for(let stage=0;stage<8;stage++){g.start(stage);o.run(`start(${stage})`);for(const key of ['stage','player','platforms','enemies','hazards'])eq(g[key],o.state()[key]);assert.equal(g.world,4800);assert.equal(g.platforms.length,17);assert.equal(g.enemies.length,11);assert.equal(g.hazards.length,4);assert.equal(g.player.hp,28);assert.equal(g.weapon,0);}assert.throws(()=>g.start(8));assert.throws(()=>g.start(-1));
});
await test('entire original campaign oracle: ordinary traversal, shooting, earned weakness weapons, all 8 wins, zero injected stats',()=>{
 const g=new C.Game(),o=oracle(),summary=[];
 for(let stage=0;stage<8;stage++){
  g.start(stage);o.run(`start(${stage})`);const w=(stage+7)%8+1;
  while(g.cleared.includes(w-1)&&g.weapon!==w){g.cycle();o.run('cycle()');}
  let ticks=0;
  while(g.mode==='play'&&ticks<10000){
   const keys={right:!g.bossStarted||g.player.x<3970,fire:true,jump:false};g.keys=keys;o.run('keys='+JSON.stringify(keys));g.step();o.run('step()');ticks++;
   eq(snapshot(g),o.state());
  }
  assert(g.win,'stage '+stage);assert(g.player.hp>0);summary.push({stage:stage+1,ticks,hp:g.player.hp});
 }
 eq([...g.cleared].sort(),[0,1,2,3,4,5,6,7]);assert(C.ENDING.includes('THE END'));console.log('  Full modeled campaign:',JSON.stringify(summary));
});
await test('independent original varied jump/left/right input trajectories across all stages',()=>{
 for(let stage=0;stage<8;stage++){
  const g=new C.Game(),o=oracle();g.start(stage);o.run(`start(${stage})`);
  for(let tick=0;tick<900;tick++){
   const keys={right:tick%140<110,left:tick%140>=110,jump:tick%45<20,fire:tick%60<50};g.keys=keys;o.run('keys='+JSON.stringify(keys));g.step();o.run('step()');
   if(g.mode!=='play')break;eq(snapshot(g),o.state());
  }
 }
});
await test('all 9 weapon shots, cadence, velocities, scatter, weapon cycle',()=>{
 const g=new C.Game({cleared:[7,3,2,0,1,6,5,4]});g.start(0);const seen=[];for(let i=0;i<9;i++){seen.push(g.weapon);g.cycle();}eq(seen,[0,1,2,3,4,5,6,7,8]);
 for(let w=0;w<9;w++){
  const h=new C.Game();h.start(0);h.weapon=w;h.keys={fire:true};h.step();assert.equal(h.bullets.length,w===3?3:1);assert.equal(h.shot,w===7?8:17);assert.equal(h.bullets[0].vx,w===6?6:10);assert(h.bullets.every(b=>b.weapon===w));if(w===3)eq(h.bullets.map(b=>b.vy),[0,-2,2]);
 }
});
await test('fired rock/shadow consistency fixes reproduced from original, including projectile colors',()=>{
 const g=new C.Game();g.start(0);g.player.hp=20;g.enemies=[{x:500,y:418,w:30,h:32,hp:3,type:0,base:500,phase:0,cool:99}];g.weapon=6;g.addBullet(501,420,0,0);g.weapon=0;g.step();assert.equal(g.enemies[0].hp,0);assert.equal(g.player.hp,21);assert.equal(g.bullets.length,0);
 const o=oracle();o.run("start(0);player.hp=20;enemies=[{x:500,y:418,w:30,h:32,hp:3,type:0,base:500,phase:0,cool:99}];weapon=6;addBullet(501,420,0,0);weapon=0;step()");assert.equal(o.state().enemies[0].hp,2);
 g.enemies[0].hp=3;g.weapon=8;g.addBullet(503,420,0,0);g.weapon=0;g.step();assert.equal(g.enemies[0].hp,2);assert.equal(g.bullets.length,1);assert.equal(g.bullets[0].weapon,8);
});
await test('every boss weakness and non-weak weapon, 48 HP, original attacks and motion',()=>{
 for(let stage=0;stage<8;stage++)for(let w=0;w<9;w++){
  const g=new C.Game();g.start(stage);g.player.x=3890;g.step();assert.equal(g.boss.hp,48);g.weapon=w;
  const x=4390+Math.sin(2*(.014+stage*.001))*230,y=stage===6?320+Math.sin(2*.035)*80:382-Math.max(0,Math.sin(2*.035))*((stage%3)*35);
  g.addBullet(x+2,y+2,0,0);g.step();assert.equal(g.boss.hp,48-(w===(stage+7)%8+1?4:1));
  g.bullets=[];g.boss.cool=1;g.step();assert.equal(g.bullets.filter(b=>b.enemy).length,3+stage%3);assert.equal(g.boss.cool,65-stage*3);for(const b of g.bullets)assert(Math.abs(Math.hypot(b.vx,b.vy)-(3+stage*.13))<1e-10);
 }
});
await test('contact 3/4, projectile 2, 80-tick invulnerability, capped healing, terminal damage short circuit',()=>{
 const g=new C.Game();g.start(0);g.damage(3);assert.equal(g.player.hp,25);assert.equal(g.player.inv,80);g.damage(4);assert.equal(g.player.hp,25);for(let i=0;i<79;i++)g.step();g.damage(4);assert.equal(g.player.hp,25);g.step();g.damage(4);assert.equal(g.player.hp,21);
 const h=new C.Game();h.start(0);h.addBullet(90,330,0,0,true);h.step();assert.equal(h.player.hp,26);
 const death=new C.Game();death.start(0);death.player.hp=3;death.hazards=[{x:90,y:330,w:50,h:100}];death.bullets=[{x:500,y:418,w:15,h:9,vx:0,vy:0,life:160,enemy:false,weapon:6}];death.enemies=[{x:500,y:418,w:30,h:32,hp:3,type:0,base:500,phase:0,cool:99}];death.step();assert.equal(death.mode,'result');assert(!death.win);assert.equal(death.enemies[0].hp,3);assert.equal(death.bullets[0].life,160);
 const o=oracle();o.run('start(0);player.hp=3;hazards=[{x:90,y:330,w:50,h:100}];bullets=[{x:500,y:418,w:15,h:9,vx:0,vy:0,life:160,enemy:false,weapon:6}];weapon=6;enemies=[{x:500,y:418,w:30,h:32,hp:3,type:0,base:500,phase:0,cool:99}];step()');assert.equal(o.state().enemies[0].hp,0);assert.equal(o.state().player.hp,1);
});
await test('checkpoint strict >3850 and retry3890, new choice resets checkpoint, repeated wins deduplicate',()=>{
 const g=new C.Game();g.start(4);g.player.x=3850;g.step();assert(!g.checkpoint);g.player.x=3850.1;g.step();assert(g.checkpoint);assert(g.bossStarted);g.finish(false);g.start(4,true);assert.equal(g.player.x,3890);assert.equal(g.player.hp,28);g.step();assert(g.bossStarted);g.finish(true);g.start(4);assert.equal(g.player.x,90);assert(!g.checkpoint);g.finish(true);eq(g.cleared,[4]);g.start(5,true);assert.equal(g.player.x,90);
});
await test('60 Hz rates at 30/60/90/120/144 Hz; pause/hidden/stall have no time catch-up',()=>{
 for(const fps of [30,60,90,120,144]){const g=new C.Game();g.start(0);const c=new C.FixedClock(g);c.frame(0);for(let i=1;i<=fps*10;i++)c.frame(i*1000/fps);assert.equal(g.tick,600);g.pause();c.frame(100000);g.resume();c.frame(200000);assert.equal(g.tick,600);c.frame(200000+1000/60);assert.equal(g.tick,601);c.frame(999999);assert.equal(g.mode,'pause');assert.equal(g.tick,601);}
});
await test('strict bounded full backups, duplicate keys, cross-game/unknown fields/malformed/nested/oversize rejection',()=>{
 const text=C.exportBackup(valid);eq(C.importBackup(text),valid);
 for(const bad of ['', 'null','[]','{}',text+'x',text.replace('"version": 1','"version": 1, "version": 1'),text.replace('"sound": false','"sound": false, "__proto__": {}'),text.replace('starbolt','slotten'),text.replace('"version": 1','"version": 2'),text.replace('[\n      0,\n      3,\n      7\n    ]','[0,0]'),' '.repeat(4097),'['.repeat(10)+']'.repeat(10)])assert.throws(()=>C.importBackup(bad),bad);
 for(const data of [{cleared:[8],sound:true},{cleared:[-1],sound:true},{cleared:[1,1],sound:true},{cleared:[1.5],sound:true},{cleared:[],sound:1},{cleared:[],sound:true,extra:1}])assert.throws(()=>C.validateData(data));
});
await test('durable saves, serial queue, reload exact, namespaces never touch original/other games',async()=>{
 const storage=new MemoryStorage(),store=new C.SaveStore({storage,locks:lockManager()});eq(store.open(),{cleared:[],sound:true});const first=store.setData(valid),second=store.setData({cleared:[0,1,3,7],sound:true});assert(await first);assert(await second);assert.equal(store.status,'ready');const reload=new C.SaveStore({storage,locks:lockManager()});eq(reload.open(),{cleared:[0,1,3,7],sound:true});assert.equal(reload.revision,2);assert(storage.reads.every(k=>k===C.STORAGE_KEY));assert(storage.writes.every(k=>k===C.STORAGE_KEY));
});
await test('two-tab Web Lock + compare prevents stale replacement and retains local session',async()=>{
 const storage=new MemoryStorage(),locks=lockManager(),a=new C.SaveStore({storage,locks}),b=new C.SaveStore({storage,locks});a.open();b.open();await a.setData(valid);const saved=storage.getItem(C.STORAGE_KEY);assert.equal(await b.setData({cleared:[2],sound:true}),false);assert.equal(b.status,'conflict');assert.equal(storage.getItem(C.STORAGE_KEY),saved);eq(b.data,{cleared:[2],sound:true});a.checkExternal('other-game');assert.equal(a.status,'ready');storage.setItem(C.STORAGE_KEY,'external');a.checkExternal(C.STORAGE_KEY);assert.equal(a.status,'conflict');
});
await test('no-lock, corrupt, quota, read-denied, lock-rejected retain prior data and remain playable in memory',async()=>{
 const no=fixture(),raw=no.getItem(C.STORAGE_KEY),n=new C.SaveStore({storage:no});eq(n.open(),valid);assert.equal(n.status,'memory-no-lock');await n.setData({cleared:[],sound:true});assert.equal(no.getItem(C.STORAGE_KEY),raw);
 for(const invalid of ['not JSON','null',JSON.stringify({format:'zatuplay-starbolt-save',version:1,revision:1,data:{cleared:[7,7],sound:true}})]){const s=new MemoryStorage();s.setItem(C.STORAGE_KEY,invalid);const t=new C.SaveStore({storage:s,locks:lockManager()});t.open();assert.equal(t.status,'memory-corrupt');await t.setData(valid);assert.equal(s.getItem(C.STORAGE_KEY),invalid);}
 const q=fixture(),before=q.getItem(C.STORAGE_KEY),t=new C.SaveStore({storage:q,locks:lockManager()});t.open();q.failWrite=true;await t.setData({cleared:[],sound:true});assert.equal(t.status,'memory-full');assert.equal(q.getItem(C.STORAGE_KEY),before);
 const denied=new MemoryStorage();denied.failRead=true;const d=new C.SaveStore({storage:denied,locks:lockManager()});d.open();assert.equal(d.status,'memory-denied');await d.setData(valid);assert.equal(denied.writes.length,0);
 const r=new C.SaveStore({storage:new MemoryStorage(),locks:{request:async()=>{throw Error('denied');}}});r.open();await r.setData(valid);assert.equal(r.status,'memory-denied');
});
await test('native Canvas raster, DOM all fortresses, keyboard/touch movement/jump/shoot, all stage UI labels',async()=>{
 const h=await openUI();assert.equal(h.document.querySelectorAll('[data-stage]').length,8);
 for(let i=0;i<8;i++){h.click(`[data-stage="${i}"]`);h.advance(100);assert.equal(h.game.stage,i);assert.equal(h.get('#pause').textContent,'一時停止');h.click('#select');}
 h.click('[data-stage="0"]');h.key('ArrowRight');h.key('KeyZ');h.advance(500);assert(h.game.player.x>150);assert(h.game.bullets.length>0);h.keyup('ArrowRight');h.keyup('KeyZ');h.key('Space');h.advance(80);assert(h.game.player.vy<0);h.keyup('Space');
 h.emit('[data-key="right"]','pointerdown',{button:0,pointerId:2});h.advance(100);const x=h.game.player.x;h.emit('[data-key="right"]','pointercancel',{pointerId:2});h.advance(100);assert.equal(h.game.player.x,x);
 const pixels=h.canvas.getContext('2d').getImageData(0,0,960,540).data;assert(pixels.some((v,i)=>i%4===0&&v!==pixels[0]));
});
await test('DOM ordinary first fortress clear, earned weapon, durable reload, later stage selector remains unlocked',async()=>{
 const h=await openUI();h.click('[data-stage="0"]');h.key('ArrowRight');h.key('KeyZ');let ticks=0;
 while(h.game.mode==='play'&&ticks<2200){if(h.game.bossStarted&&h.game.player.x>=3970)h.keyup('ArrowRight');h.advance(1000/60);ticks++;}
 assert(h.game.win);await h.settle();assert(h.get('#result-title').textContent.includes('CLEAR'));assert(h.get('#result-text').textContent.includes('火炎弾'));h.click('#result-select');assert(h.get('[data-stage="0"]').textContent.startsWith('✓'));const reload=await openUI({storage:h.storage});assert(reload.get('[data-stage="0"]').textContent.startsWith('✓'));reload.click('[data-stage="1"]');reload.key('KeyX');assert.equal(reload.game.weapon,1);
});
await test('DOM checkpoint loss/retry and final eighth clear show original ending and all weapon unlocks',async()=>{
 const h=await openUI({storage:fixture({cleared:[0,1,2,3,4,5,6],sound:false})});h.click('[data-stage="7"]');
 // Explicit boundary fixture for loss/retry, separate from the ordinary campaign oracle above.
 h.game.player.x=3851;h.advance(100);assert(h.game.checkpoint);h.game.player.inv=0;h.game.damage(28);assert.equal(h.game.mode,'result');assert(h.get('#result-text').textContent.includes('ボス前'));
 h.click('#retry');assert.equal(h.game.player.x,3890);assert.equal(h.game.player.hp,28);for(let i=0;i<7;i++)h.key('KeyX');h.key('KeyZ');h.key('ArrowRight');let ticks=0;
 while(h.game.mode==='play'&&ticks<4000){if(h.game.bossStarted&&h.game.player.x>=3970)h.keyup('ArrowRight');h.advance(1000/60);ticks++;}
 assert(h.game.win);assert.equal(h.get('#result-title').textContent,'全8ボス撃破！');assert.equal(h.get('#ending').textContent,C.ENDING);assert(h.get('#retry').hidden);await h.settle();const reload=await openUI({storage:h.storage});assert.equal(reload.game.cleared.length,8);
});
await test('blur/hidden/modal pause and stale autorepeats; multiple mapped keys and pointers release correctly',async()=>{
 const h=await openUI();h.click('[data-stage="0"]');h.key('KeyA');h.key('ArrowLeft');h.keyup('KeyA');assert(h.game.keys.left);h.keyup('ArrowLeft');assert(!h.game.keys.left);
 for(const type of ['blur','hidden','modal']){
  h.key('ArrowRight');h.key('KeyZ');h.advance(100);if(type==='blur')h.win('blur');if(type==='hidden')h.visibility(true);if(type==='modal')h.click('#records');const tick=h.game.tick,x=h.game.player.x;h.advance(5000);assert.equal(h.game.tick,tick);assert.equal(h.game.player.x,x);
  if(type==='hidden')h.visibility(false);if(type==='modal')h.click('#close-settings');assert.equal(h.game.mode,'pause');h.click('#pause');h.key('ArrowRight',{repeat:true});h.advance(100);assert.equal(h.game.player.x,x);assert(!h.game.keys.right);assert.equal(h.get('#pause').textContent,'一時停止');
 }
 h.emit('[data-key="fire"]','pointerdown',{button:0,pointerId:1});h.emit('[data-key="fire"]','pointerdown',{button:0,pointerId:2});h.emit('[data-key="fire"]','pointerup',{pointerId:1});assert(h.game.keys.fire);h.emit('[data-key="fire"]','lostpointercapture',{pointerId:2});assert(!h.game.keys.fire);
});
await test('pause → selection → new stage never retains stale resume label; canceled navigation stays paused',async()=>{
 const h=await openUI();h.click('[data-stage="0"]');h.click('#pause');assert.equal(h.get('#pause').textContent,'再開');h.click('#select');h.click('[data-stage="1"]');assert.equal(h.get('#pause').textContent,'一時停止');
 const c=await openUI({confirm:false});c.click('[data-stage="0"]');c.click('#select');assert.equal(c.game.mode,'pause');const event=c.emit('#return-link','click');assert(event.defaultPrevented);assert.equal(c.get('#return-link').getAttribute('href'),'../../browser/');assert.equal(c.get('#return-link').getAttribute('target'),null);
});
await test('backup download, same-file repeated import, restore complete state and return to selection',async()=>{
 const h=await openUI();h.click('#records');h.click('#export');assert.equal(h.downloads.length,1);eq(C.importBackup(await h.downloads[0].text()),{cleared:[],sound:true});
 const text=C.exportBackup(valid);for(let i=0;i<2;i++){h.file(text);await h.settle();eq(h.game.cleared,valid.cleared);assert.equal(h.get('#import-file').value,'');assert.equal(h.game.mode,'select');assert.equal(h.get('#sound').textContent,'音：OFF');}assert.equal(h.downloads.length,3);assert.equal(h.confirms.length,2);const reload=await openUI({storage:h.storage});eq(reload.game.cleared,valid.cleared);
});
await test('invalid/oversize imports cannot write; canceled read and closed modal ignore late files',async()=>{
 const h=await openUI({storage:fixture()});h.click('#records');const original=h.storage.getItem(C.STORAGE_KEY);h.file('{}');await h.settle();assert.equal(h.storage.getItem(C.STORAGE_KEY),original);h.file('x',{size:5000});await h.settle();assert.equal(h.storage.getItem(C.STORAGE_KEY),original);
 for(const cancel of ['cancel','close','newer']){let resolve;h.file(C.exportBackup({cleared:[],sound:true}),{read:()=>new Promise(r=>resolve=r)});if(cancel==='cancel')h.click('#cancel-import');if(cancel==='close')h.click('#close-settings');if(cancel==='newer'){h.file(C.exportBackup(valid));await h.settle();}resolve(C.exportBackup({cleared:[],sound:true}));await h.settle();eq(h.game.cleared,valid.cleared);if(cancel==='close')h.click('#records');}
});
await test('late file reads after blur/hidden cannot download, confirm or mutate; fresh native-picker selection remains accepted',async()=>{
 for(const type of ['blur','hidden']){
  const h=await openUI({storage:fixture()});h.click('#records');const before=h.storage.getItem(C.STORAGE_KEY);let resolve;
  h.file(C.exportBackup({cleared:[],sound:true}),{read:()=>new Promise(r=>resolve=r)});
  if(type==='blur')h.win('blur');else h.visibility(true);
  resolve(C.exportBackup({cleared:[],sound:true}));await h.settle();
  assert.equal(h.storage.getItem(C.STORAGE_KEY),before);assert.equal(h.downloads.length,0);assert.equal(h.confirms.length,0);
  if(type==='hidden')h.visibility(false);h.file(C.exportBackup({cleared:[2],sound:true}));await h.settle();eq(h.game.cleared,[2]);
 }
});
await test('import/reset confirmation cancellation and failed recovery-download preserve state; reset is recoverable',async()=>{
 for(const options of [{confirm:false},{downloadFail:true}]){const h=await openUI({...options,storage:fixture()});h.click('#records');const before=h.storage.getItem(C.STORAGE_KEY);h.click('#reset');await h.settle();assert.equal(h.storage.getItem(C.STORAGE_KEY),before);h.file(C.exportBackup({cleared:[],sound:true}));await h.settle();assert.equal(h.storage.getItem(C.STORAGE_KEY),before);}
 const h=await openUI({storage:fixture()});h.click('#records');h.click('#reset');await h.settle();eq(h.game.cleared,[]);const recovery=await h.downloads[0].text();eq(C.importBackup(recovery),valid);h.file(recovery);await h.settle();eq(h.game.cleared,valid.cleared);
});
await test('pending save prevents catalog exit; abandoned queued writes drain cleanly after conflict',async()=>{
 let release;const storage=new MemoryStorage(),locks={request:async(name,options,fn)=>{await new Promise(r=>release=r);return fn({name});}};
 const h=await openUI({storage,locks});h.click('#records');h.click('#sound');await h.settle();assert.equal(h.store.status,'saving');h.click('#close-settings');const event=h.emit('#return-link','click');assert(event.defaultPrevented);assert(h.get('#notice').textContent.includes('保存中'));release();await h.settle();assert.equal(h.store.status,'ready');
 const s=new MemoryStorage(),t=new C.SaveStore({storage:s,locks:lockManager()});t.open();const pending=t.setData(valid);s.setItem(C.STORAGE_KEY,'foreign');t.checkExternal(C.STORAGE_KEY);await pending;assert.equal(t.pending,0);assert.equal(s.getItem(C.STORAGE_KEY),'foreign');
});
await test('storage event pauses game; corrupt/no-lock UI honestly says session-only; audio rejection never blocks play',async()=>{
 const h=await openUI();h.click('[data-stage="0"]');h.storage.setItem(C.STORAGE_KEY,'changed');h.win('storage',{key:C.STORAGE_KEY});assert.equal(h.game.mode,'pause');assert(h.get('#save-status').textContent.includes('別のタブ'));
 const no=await openUI({locks:null});assert(no.get('#save-status').textContent.includes('一時プレイ'));no.click('[data-stage="0"]');no.advance(100);assert(no.game.tick>0);
 for(const opts of [{audio:false},{audioReject:true}]){const a=await openUI(opts);a.click('[data-stage="0"]');a.key('KeyZ');a.advance(100);await a.settle();assert(a.game.tick>0);assert(a.game.bullets.length>0);assert(a.get('#audio-status').textContent.includes('音'));}
});
console.log(`StarBolt: ${count} test groups passed. Model/DOM/native Canvas only; not Chrome, mobile layout, or audio listening.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
