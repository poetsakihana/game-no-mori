'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createHarness,MemoryStorage,root}=require('./moving-castle-harness.cjs');
const SAVE='walking-castle-sakihana-v2',LEGACY='walking-castle-sakihana-v1';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');let passed=0,valid;
require('node:v8').setFlagsFromString('--expose-gc');const collect=require('node:vm').runInNewContext('gc');
async function test(name,f){await f();collect();console.log(`PASS ${++passed}: ${name}`);}
async function start(opts){const h=await createHarness(opts);h.click('newGameBtn');h.run('closePanel()');return h;}
(async()=>{
await test('source artwork, 50 chapter data, no missing worker/external runtime, exact mirror',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),m=JSON.parse(fs.readFileSync(path.join(root,'SOURCE_ASSETS.json')));
 const images=[...html.matchAll(/data:image\/([^;]+);base64,([A-Za-z0-9+/=]+)/g)].map(x=>({type:x[1],bytes:Buffer.from(x[2],'base64').length,sha256:sha(Buffer.from(x[2],'base64'))}));
 assert.equal(images.length,13);assert.deepEqual(images,m.embeddedImages);assert.equal(sha(html.match(/window.WALKING_CASTLE_CHAPTERS=(\[.*?\]);/s)[1]),m.chapterDataSha256);
 assert(!/serviceWorker\.register|__test|https:\/\//.test(html));
 for(const name of fs.readdirSync(root))assert.equal(sha(fs.readFileSync(path.join(root,name))),sha(fs.readFileSync(path.resolve(root,'../../../../zatuplay/games/moving-castle',name))));
});
await test('real Canvas2D title, decoded hero/atlas/props and colorful actual pixels',async()=>{
 const h=await createHarness();assert.equal(h.window.WalkingCastle.chapterCount,50);assert.equal(h.nodes.get('continueBtn').disabled,true);assert(h.run('tileReady()'));assert(h.images.every(im=>im.complete&&im.naturalWidth));
 h.run('drawIntro(0)');const px=h.nodes.get('world').canvas.getContext('2d').getImageData(0,0,960,540).data,colors=new Set();for(let i=0;i<px.length;i+=400)colors.add([...px.slice(i,i+3)].join(','));assert(colors.size>50);h.png('/tmp/moving-castle-title-canvas.png');h.disposeTerrain();
});
await test('normal start, movement, hero sword, magic, dodge, castle mode and potion',async()=>{
 const h=await start();valid=h.state();const x=valid.player.x;h.press('ArrowRight');h.run('update(.1)');h.release('ArrowRight');assert(h.state().player.x>x);
 h.run("G.player.x=1000;G.player.y=500;enemies=[{x:1040,y:500,hp:100,maxHp:100,r:18,boss:false}];attack()");assert(h.run('enemies[0].hp')<100);h.run('skill()');assert(h.state().player.sp<100);assert(h.run('enemies[0]?.hp||0')<70);
 h.run('dodge()');assert(h.state().player.dodgeCD>0);h.press('c');assert.equal(h.state().mode,'castle');h.press('c');assert.equal(h.state().mode,'hero');
 h.run("G.player.hp=20;openPanel('items');usePotion()");assert.equal(h.state().player.potions,2);assert.equal(h.state().player.hp,95);
});
await test('single-award gathering/chests, healing mechanic and original upgrade costs/caps',async()=>{
 const h=await start();h.run("enemies=[];const n=worlds[0].nodes.find(n=>n.type==='chest');G.player.x=n.x;G.player.y=n.y;interact()");assert.equal(h.state().player.potions,4);assert.equal(h.state().resources.wood,33);h.run('interact()');assert.equal(h.state().player.potions,4);
 h.run('G.player.hp=5;G.castle.hp=100;G.player.x=740;G.player.y=750;interact()');assert.equal(h.state().player.hp,120);assert.equal(h.state().castle.hp,190);
 h.run("buy('weapon')");assert.equal(h.state().player.weapon,2);assert.equal(h.state().player.atk,38);assert.deepEqual(h.state().resources,{wood:28,ore:13,crystal:6});
 const before=h.state().resources;h.run("G.player.weapon=6;buy('weapon')");assert.deepEqual(h.state().resources,before);
});
await test('50 real rendered chapter canvases, gate locks, boss rewards, castle transitions, ending/reload',async()=>{
 const h=await start();
 for(let i=0;i<50;i++){
  h.run(`closePanel();G.chapter=${i};G.maxUnlocked=${i};buildEnemies();G.player.x=2500;G.player.y=790;G.castle.x=2500;G.castle.y=790;interact();camera.x=1500;camera.y=520;drawUIWorld(elapsed)`);assert.equal(h.state().chapter,i);assert.equal(h.run('enemies.find(e=>e.boss).kind'),h.run(`WORLD[${i}].bossKind`));
  const frame=h.nodes.get('world').canvas.toBuffer('image/png');if([0,10,20,30,40,49].includes(i))fs.writeFileSync(`/tmp/moving-castle-chapter-${i+1}.png`,frame);h.disposeTerrain();collect();await new Promise(setImmediate);
  h.run('damageEnemy(enemies.find(e=>e.boss),999999,"test")');assert(h.state().data[i].cleared);const saved=JSON.parse(h.storage.getItem(SAVE));assert(saved.data[i].cleared);
  if(i===49){assert.equal(saved.completed,true);assert.equal(h.run('panelName'),'ending');break;}
  h.run('G.castle.x=360;interact()');assert.equal(h.state().chapter,i);h.run('G.castle.x=2500;interact()');assert.equal(h.state().chapter,i+1);assert.equal(h.run('panelName'),'story');
 }
 const loaded=await createHarness({storage:h.storage});loaded.click('continueBtn');assert(loaded.state().completed);assert.equal(loaded.run('panelName'),'ending');loaded.run('action("travel","0")');assert.equal(loaded.state().chapter,0);assert(!loaded.run('enemies.some(e=>e.boss)'));loaded.run('action("travel","50")');assert.equal(loaded.state().chapter,0);
});
await test('save/reload keeps state, regenerates unfinished enemies and saves every 20 active seconds',async()=>{
 const h=await start();h.run("G.player.x=930;G.resources.wood=123;G.player.weapon=3;G.player.atk=48;G.data[0].kills=8;saveGame()");
 const loaded=await createHarness({storage:h.storage});loaded.click('continueBtn');assert.equal(loaded.state().player.x,930);assert.equal(loaded.state().resources.wood,123);assert.equal(loaded.state().player.weapon,3);assert.equal(loaded.state().data[0].kills,8);assert.equal(loaded.run('enemies.find(e=>e.boss).hp'),380);
 const n=loaded.state().saves;loaded.run('autoSaveClock=19.99;update(.02)');assert.equal(loaded.state().saves,n+1);
});
await test('v1 migration retains legacy bytes and final-clear false flag is repaired',async()=>{
 const old={...valid,version:1,chapter:2,maxUnlocked:2,data:valid.data.slice(0,3)};old.data[0].cleared=true;
 const storage=new MemoryStorage({[LEGACY]:JSON.stringify(old)}),h=await createHarness({storage});h.click('continueBtn');assert.equal(h.state().data.length,50);assert(h.state().data[0].cleared);h.run('saveGame()');assert.equal(storage.getItem(LEGACY),JSON.stringify(old));assert.equal(JSON.parse(storage.getItem(SAVE)).version,2);
 const fixed=h.run(`sanitizeSave(${JSON.stringify({...valid,chapter:49,maxUnlocked:49,data:valid.data.map((d,i)=>({...d,cleared:i===49})),completed:false})})`);assert(fixed.completed);
});
await test('bad saves remain untouched on canceled New Game, failed Continue and pagehide',async()=>{
 for(const raw of ['{broken','[]','false','{}',JSON.stringify({...valid,chapter:.5}),JSON.stringify({...valid,player:{...valid.player,hp:'bad'}})]){
  const storage=new MemoryStorage({[SAVE]:raw}),h=await createHarness({storage});assert(h.nodes.get('continueBtn').disabled);assert.equal(storage.getItem(SAVE),raw);h.confirm(false);h.click('newGameBtn');assert.equal(h.state(),null);h.run('startGame(true)');assert.equal(h.state(),null);h.window.emit('pagehide');assert.equal(storage.getItem(SAVE),raw);
 }
});
await test('schema rejects dangerous numeric/types and strips extra fields/IDs, clamps positions',async()=>{
 const h=await createHarness();
 for(const change of ['chapter:50','version:99','resources:{wood:-1,ore:1,crystal:1}','player:{...x.player,hp:Infinity}','castle:{...x.castle,engine:9}','player:{...x.player,nextXp:0}','data:[{cleared:"yes"}]'])assert.equal(h.run(`(()=>{const x=${JSON.stringify(valid)};return sanitizeSave({...x,${change}})})()`),null,change);
 const s=h.run(`(()=>{const x=${JSON.stringify(valid)};x.player.x=-9;x.castle.y=99999;x.data[0].collected=['0-0','0-0','<img>'];x.player.unknown='<x>';return sanitizeSave(x)})()`);assert.equal(s.player.x,35);assert.equal(s.castle.y,1525);assert.equal(s.data[0].collected.join(','),'0-0');assert.equal(s.player.unknown,undefined);
});
await test('unavailable storage and quota failure allow play, never increment saves or falsely claim success',async()=>{
 for(const opts of [{deniedGetter:true},{storage:Object.assign(new MemoryStorage(),{failWrite:true})}]){const h=await start(opts);assert.equal(h.state().saves,0);assert.match(h.nodes.get('browserSaveStatus').textContent,/保存できません/);}
 const h=await start();h.run("openPanel('pause')");const old=h.storage.getItem(SAVE),saves=h.state().saves;h.storage.failWrite=true;h.run('G.resources.wood=900;saveGame()');assert.equal(h.storage.getItem(SAVE),old);assert.equal(h.state().saves,saves);h.confirm(false);h.run('title()');assert.equal(h.state().resources.wood,900);assert.equal(h.run('panelName'),'pause');
 h.confirm(true);h.run('title()');assert.equal(h.state(),null);assert.equal(h.storage.getItem(SAVE),old);
});
await test('blur / visibility / pagehide save and stop inputs, retain existing panel, explicit resume',async()=>{
 const h=await start();h.press('ArrowRight');h.window.emit('blur');assert.equal(h.run('panelName'),'pause');assert.deepEqual(h.snapshot().keys,{});const seconds=h.state().seconds;h.run('update(1)');assert.equal(h.state().seconds,seconds);
 h.run("openPanel('items')");h.document.hidden=true;h.document.emit('visibilitychange');assert.equal(h.run('panelName'),'items');h.run('closePanel()');assert.equal(h.run('panelName'),'items');h.document.hidden=false;h.document.emit('visibilitychange');assert.equal(h.run('panelName'),'items');
 h.run('G.resources.wood=321');h.window.emit('pagehide');assert.equal(JSON.parse(h.storage.getItem(SAVE)).resources.wood,321);h.run('closePanel()');assert.equal(h.run('freeze'),false);
});
await test('touch capture / cancel, menu reset, no held keys or stray potion while paused',async()=>{
 const h=await start();h.pointer('arrowright','pointerdown',21);assert.equal(h.run('keys.arrowright'),true);h.pointer('arrowright','lostpointercapture',21);assert.equal(h.run('keys.arrowright'),false);
 h.pointer('arrowright','pointerdown',22);h.run("openPanel('pause')");assert.deepEqual(h.snapshot().keys,{});assert.equal(h.nodes.get('button-arrowright').dataset.pointer,undefined);assert(![...h.nodes.values()].some(n=>n.classList.contains('pressed')));
 h.run('G.player.hp=10;usePotion()');assert.equal(h.state().player.potions,3);h.press('q');assert.equal(h.state().player.potions,3);h.run('closePanel()');assert.equal(h.run('moveVector().x'),0);
 h.pointer('arrowright','pointerdown',23);h.pointer('arrowright','pointercancel',23);assert.equal(h.run('keys.arrowright'),false);
});
await test('sound setting persists; save/audio button focus permits movement and Space stays native',async()=>{
 const h=await start();h.click('muteBtn');assert(h.run('muted'));h.press('ArrowRight',h.nodes.get('muteBtn'));h.run('update(.1)');assert(h.state().player.x>510);h.release('ArrowRight');h.click('browserSaveBtn');const x=h.state().player.x;h.press('d',h.nodes.get('browserSaveBtn'));h.run('update(.1)');assert(h.state().player.x>x);h.release('d');
 h.press(' ',h.nodes.get('browserSaveBtn'));assert.equal(h.state().player.attackTimer,0);h.run("openPanel('pause');closePanel()");assert.equal(h.document.activeElement,null);const loaded=await createHarness({storage:h.storage});assert(loaded.run('muted'));
});
await test('other-tab storage change pauses and prevents overwriting newer save',async()=>{
 const h=await start();h.window.emit('storage',{key:SAVE});assert.equal(h.run('panelName'),'pause');const before=h.storage.getItem(SAVE);h.run('G.resources.wood=999;saveGame()');assert.equal(h.storage.getItem(SAVE),before);assert.match(h.nodes.get('browserSaveStatus').textContent,/別タブ/);
});
await test('death penalties retain original rules, map/journal/items/50-chapter menu reachable',async()=>{
 const h=await start();h.run('G.player.hp=1;hurtPlayer(999)');assert.equal(h.state().player.hp,84);assert.equal(h.state().resources.ore,11);h.run('hurtCastle(999)');assert.equal(h.state().castle.hp,210);assert.equal(h.state().resources.wood,16);
 for(const p of ['chapters','map','items','journal','help','pause']){h.run(`openPanel('${p}')`);assert(h.nodes.get('panelContent').innerHTML.length>100);assert.equal(h.run('panelName'),p);h.run('closePanel()');}
 h.run('action("travel","1")');assert.equal(h.state().chapter,0);
});
console.log(`\n${passed} groups passed. VM + real native Canvas2D, not browser layout/audio/manual play QA.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
