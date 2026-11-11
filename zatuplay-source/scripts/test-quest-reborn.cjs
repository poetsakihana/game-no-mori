'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { createHarness, MemoryStorage, root } = require('./quest-harness.cjs');
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
const copy = value => JSON.parse(JSON.stringify(value));
(async () => {
  const core = await import(pathToFileURL(path.join(root, 'core.js')));
  const models = await import(pathToFileURL(path.join(root, 'models.js')));
  const { SAVE, SETTINGS, normalizeSave, normalizeSettings, createSaveStore } = await import(pathToFileURL(path.join(root, 'browser-storage.js')));
  const start = async (options = {}, kind = 'masuda') => {
    const h = await createHarness(options); h.click('newGame');
    if (h.nodes.get('confirmNew')?.onclick) h.click('confirmNew');
    h.click(kind === 'masuda' ? 'chooseMasuda' : 'chooseClaire');
    if (h.snapshot().mode === 'game') h.click('storyNext');
    return h;
  };
  const base = await start(); const valid = JSON.parse(base.storage.getItem(SAVE));
  await test('title, module initialization and original Masuda starting state', () => {
    assert.equal(base.window.questBootReady, true); assert.deepEqual(base.errors, []);
    assert.equal(base.snapshot().state.floor, 1); assert.equal(base.snapshot().hero.maxHp, 160);
    assert.equal(base.run('enemies.length'), 7); assert.equal(base.run('props.length'), 4);
    assert.equal(base.snapshot().paused, false); assert(normalizeSave(valid));
  });
  await test('Claire starting state and fully local 3D scene construction', async () => {
    const h = await start({}, 'claire'); assert.equal(h.snapshot().hero.maxHp, 130); assert.equal(h.snapshot().hero.maxMp, 120);
    assert(h.run('levelGroup.children.length') > 50); assert.equal(h.run('actorGroup.children.length'), 8);
    h.run('frame(16)'); assert.equal(h.run('renderer.renders'), 1);
  });
  await test('100 regular enemies, 21 unique bosses, 7 regions and 20 body families', () => {
    assert.equal(core.NORMAL_IDS.length, 100); assert.equal(new Set(core.NORMAL_IDS).size, 100);
    assert.equal(core.FLOOR_BOSSES.length, 21); assert.equal(new Set(core.FLOOR_BOSSES).size, 21);
    assert.equal(core.BIOMES.length, 7); assert.equal(new Set(core.NORMAL_IDS.map(id => core.ENEMIES[id].shape)).size, 20);
    assert.equal(Object.keys(core.ENEMIES).length, 121);
    core.FLOOR_BOSSES.forEach((id, i) => { assert(core.ENEMIES[id].boss); assert.equal(core.ENEMIES[id].floor, i + 1); });
  });
  await test('all 21 encounter sets are valid and collectively expose all 100 normal enemies', () => {
    assert.equal(core.FLOOR_ENCOUNTERS.length, 21);
    core.FLOOR_ENCOUNTERS.forEach((ids, i) => { assert.equal(ids.length, 6); ids.forEach(id => { assert(!core.ENEMIES[id].boss); assert.equal(core.ENEMIES[id].region, Math.floor(i / 3)); }); });
    assert.equal(new Set(core.FLOOR_ENCOUNTERS.flat()).size, 100);
  });
  await test('all 121 original enemy models and both hero models build and animate without WebGL', () => {
    for (const def of Object.values(core.ENEMIES)) {
      const group = models.enemyModel(def, def.boss); assert(group.children.length > 0);
      models.animateModel(group, 2, true, .2); models.disposeTree(group);
    }
    for (const kind of ['masuda', 'claire']) { const group = models.heroModel(kind); models.animateModel(group, 2, true, .2, .1); models.disposeTree(group); }
  });
  await test('1,260 generated dungeons: every tile and all seven rooms reachable on all 21 floors', () => {
    for (let seed = 0; seed < 60; seed++) for (let floor = 1; floor <= 21; floor++) {
      const map = core.makeDungeon(seed * 7919, floor), field = core.directionField(map, 0, 12);
      assert.equal(field.size, map.tiles.size); assert.equal(map.rooms.length, 7);
      for (const room of map.rooms) { assert(field.has(`${room.x},${room.z}`)); assert(core.walkable(map, room.x, room.z)); }
    }
  });
  await test('seed determinism, collision, sliding, steering and attack arc', () => {
    const a = core.makeDungeon(88, 3), b = core.makeDungeon(88, 3);
    assert.deepEqual([...a.tiles], [...b.tiles]); assert.deepEqual(a.rooms, b.rooms);
    assert.notDeepEqual(a.rooms, core.makeDungeon(89, 3).rooms);
    assert(!core.walkable(a, 100, 100)); const hero = { x: 0, z: 12 };
    core.slideMove(hero, 100, 0, a); assert.equal(hero.x, 0); core.slideMove(hero, .1, 0, a); assert.equal(hero.x, .1);
    assert(core.inArc({x:0,z:0,angle:0}, {x:0,z:1}, 2)); assert(!core.inArc({x:0,z:0,angle:0}, {x:0,z:-1}, 2));
    const field = core.directionField(a, 0, 0); assert.equal(core.steer(field, 0, 3, 0, 0).z, 2);
  });
  await test('keyboard movement, jump, dodge, potion and magic consume original resources', () => {
    const startZ = base.snapshot().hero.z; base.press('KeyW'); base.run('updateHero(.1)'); base.release('KeyW');
    assert(base.snapshot().hero.z < startZ); base.press('KeyL'); assert.equal(base.snapshot().hero.vy, 6); base.release('KeyL');
    base.press('Space'); assert(base.snapshot().hero.dodge > 0); base.release('Space');
    base.run('hero.dodge=0;hero.hp=1;'); base.press('KeyH'); base.release('KeyH'); assert.equal(base.snapshot().state.potions, 5); assert(base.snapshot().hero.hp > 1);
    const mp = base.snapshot().hero.mp; base.press('KeyK'); base.release('KeyK'); assert.equal(base.snapshot().hero.mp, mp - 18); assert.equal(base.run('projectiles.length'), 3);
  });
  await test('chest can be looted only once and persists its equipment / rewards', async () => {
    const h = await start(); h.run('hero.x=-12;hero.z=0;interact()'); const s = h.snapshot();
    assert.deepEqual(s.state.opened, [2]); assert.equal(s.state.gold, 33); assert.equal(s.state.potions, 7); assert.equal(s.state.weapon, 1);
    h.run('interact()'); assert.equal(h.snapshot().state.gold, 33);
    const reload = await createHarness({ storage:h.storage }); reload.click('continueGame');
    assert.deepEqual(reload.snapshot().state.opened, [2]); assert.equal(reload.run('props.find(p=>p.id===2).opened'), true);
  });
  await test('camp purchases and rest use game currency only; insufficient gold cannot purchase', async () => {
    const h = await start(); h.run('hero.z=13.5;interact()'); h.click('buyPotion'); assert.equal(h.snapshot().state.potions, 6);
    h.run('state.gold=200;hero.hp=10;hero.mp=0;camp()'); h.click('buyPotion'); assert.equal(h.snapshot().state.gold, 180);
    h.click('restCamp'); assert.equal(h.snapshot().state.gold, 150); assert.equal(h.snapshot().hero.hp, 160); assert.equal(h.snapshot().hero.mp, 85);
    h.click('forgeCamp'); assert.equal(h.snapshot().state.weapon, 1); assert.equal(h.snapshot().state.gold, 100);
    h.click('armorCamp'); assert.equal(h.snapshot().state.armor, 1); assert.equal(h.snapshot().state.gold, 60); h.click('leaveCamp');
  });
  await test('boss defeat, bestiary, key, XP / level reward, and B1→B2 progression persist', async () => {
    const h = await start(); h.run('hitEnemy(enemies.find(e=>e.boss),99999,0,true)'); const s = h.snapshot();
    assert.equal(s.state.key, true); assert.equal(s.state.kills.rootwarden, 1); assert(s.state.level >= 2); assert(s.state.dead.includes('4-0'));
    const loaded = await createHarness({storage:h.storage}); loaded.click('continueGame'); assert.equal(loaded.run('enemies.some(e=>e.boss)'), false);
    loaded.run('hero.x=12;hero.z=-12;interact()'); assert.equal(loaded.snapshot().state.floor, 2); assert.equal(loaded.snapshot().state.key, false); assert.deepEqual(loaded.snapshot().state.dead, []);
    assert.equal(loaded.run('enemies.find(e=>e.boss).type'), 'silkqueen'); assert.equal(JSON.parse(h.storage.getItem(SAVE)).floor, 2);
  });
  await test('all 21 floor scenes build and gated stairs advance only after each guardian', async () => {
    const h = await start();
    for (let floor = 1; floor <= 21; floor++) {
      assert.equal(h.snapshot().state.floor, floor); h.run('closeModal();hero.x=12;hero.z=-12;interact()'); assert.equal(h.snapshot().state.floor, floor);
      assert.equal(h.run('enemies.find(e=>e.boss).type'), core.FLOOR_BOSSES[floor-1]);
      h.run('hitEnemy(enemies.find(e=>e.boss),99999,0,true);hero.x=12;hero.z=-12;interact()');
    }
    assert.equal(h.snapshot().state.completed, true); assert.equal(h.snapshot().state.floor, 21); assert.equal(h.nodes.get('modalTitle').textContent, 'フェニックスの尾');
    const reload = await createHarness({storage:h.storage}); reload.click('continueGame'); assert.equal(reload.snapshot().state.completed, true); assert.equal(reload.nodes.get('modalTitle').textContent, 'フェニックスの尾');
  });
  await test('death / reload charges original 20% gold once and preserves equipment / keys', async () => {
    const h = await start(); h.run('state.gold=100;state.weapon=2;state.key=true;hero.hp=0;die()');
    assert(h.nodes.get('closeModal').classList.contains('hidden')); h.press('Escape'); assert.equal(h.snapshot().paused, true);
    const loaded = await createHarness({storage:h.storage}); loaded.click('continueGame');
    assert.equal(loaded.snapshot().state.gold, 80); assert.equal(loaded.snapshot().hero.hp, loaded.snapshot().hero.maxHp); assert.equal(loaded.snapshot().state.weapon, 2); assert.equal(loaded.snapshot().state.key, true);
    const again = await createHarness({storage:h.storage}); again.click('continueGame'); assert.equal(again.snapshot().state.gold, 80);
  });
  await test('catalog normal / boss tabs, region filters, inventory and help menus', async () => {
    const h = await createHarness(); h.click('designButton'); assert.match(h.nodes.get('catalogCount').textContent, /^100 /);
    h.click('catalogBoss'); assert.match(h.nodes.get('catalogCount').textContent, /^21 /);
    h.nodes.get('catalogRegion').value = '0'; h.nodes.get('catalogRegion').onchange(); assert.match(h.nodes.get('catalogCount').textContent, /^3 /);
    h.click('closeModal'); h.click('helpButton'); assert.match(h.nodes.get('modalBody').innerHTML, /WASD/); h.click('closeModal');
    h.click('newGame'); h.click('chooseMasuda'); h.click('storyNext'); h.click('bagButton'); h.click('tabBestiary'); assert.match(h.nodes.get('modalBody').innerHTML, /100/); h.click('tabQuest'); assert.match(h.nodes.get('modalBody').innerHTML, /地下1階/);
  });
  await test('normal settings, sound OFF and standard quality survive reload (no forced Android light mode)', async () => {
    const storage = new MemoryStorage({[SETTINGS]:JSON.stringify({volume:0,difficulty:'normal',quality:'standard',shake:false})});
    const h = await createHarness({storage}); assert.equal(h.nodes.get('soundTitle').textContent, '♪̸');
    assert.equal(h.run('settings.quality'), 'standard'); assert.equal(h.run('settings.difficulty'), 'normal');
    h.click('settingsButton'); h.nodes.get('volumeSetting').value = '.75'; h.nodes.get('shakeSetting').checked = true; h.nodes.get('volumeSetting').onchange();
    const loaded = await createHarness({storage}); assert.equal(loaded.run('settings.volume'), .75); assert.equal(loaded.run('settings.shake'), true); assert.equal(loaded.run('settings.quality'), 'standard');
  });
  await test('blocked storage getter and quota failures do not break title, settings or gameplay', async () => {
    const h = await start({deniedGetter:true}); assert.equal(h.window.questBootReady, true); assert.equal(h.snapshot().mode, 'game'); assert.match(h.nodes.get('browserSaveStatus').textContent, /保存/);
    h.click('pauseButton'); assert(!h.nodes.get('modalBody').innerHTML.includes('進行を保存しました。')); assert.match(h.nodes.get('modalBody').innerHTML, /保存できません/);
    h.click('pauseSettings'); assert.doesNotThrow(()=>h.nodes.get('volumeSetting').onchange());
    const normal = await start(); const raw = normal.storage.getItem(SAVE); normal.storage.failWrite = true; normal.run('state.gold=50'); normal.click('pauseButton');
    assert.equal(normal.storage.getItem(SAVE), raw); assert.match(normal.nodes.get('modalBody').innerHTML, /保存できません/);
  });
  await test('malformed saves remain untouched; Continue is disabled and overwrite requires confirmation', async () => {
    for (const raw of ['{broken', '[]', 'false', '{}', JSON.stringify({...valid,floor:22}), JSON.stringify({...valid,hero:null})]) {
      const storage = new MemoryStorage({[SAVE]:raw}); const h = await createHarness({storage});
      assert(h.nodes.get('continueGame').disabled); assert.equal(storage.getItem(SAVE), raw);
      h.click('newGame'); assert.equal(h.nodes.get('modalTitle').textContent, '新しい冒険'); h.click('cancelNew'); assert.equal(storage.getItem(SAVE), raw);
      h.window.emit('pagehide'); assert.equal(storage.getItem(SAVE), raw);
    }
  });
  await test('save schema rejects invalid core values and strips unsafe / nonnumeric optional data', () => {
    assert.equal(normalizeSave(null), null); assert.equal(normalizeSave([]), null);
    for (const data of [{...valid,kind:'<img>'},{...valid,seed:-1},{...valid,version:99},{...valid,hero:{...valid.hero,hp:Infinity}},{...valid,hero:{...valid.hero,x:'0'}}]) assert.equal(normalizeSave(data), null);
    const safe=normalizeSave({...valid,magic:'<script>',gold:-10,kills:{slime:3,__proto__:4,unknown:10},opened:[2,2,5,99],rooms:[0,6,'1'],dead:['4-0','1-0','<img>'],hero:{...valid.hero,status:{burn:3,poison:'bad',tick:Infinity}}});
    assert.equal(safe.magic,'fire'); assert.equal(safe.gold,0); assert.deepEqual(safe.kills,{slime:3}); assert.deepEqual(safe.opened,[2,5]); assert.deepEqual(safe.rooms,[0,6]); assert.deepEqual(safe.hero.status,{burn:3});
    assert.deepEqual(normalizeSettings({volume:NaN,quality:'<x>',difficulty:'hard',shake:'no'}),{volume:.3,quality:'light',difficulty:'easy',shake:true});
  });
  await test('legacy catalog migration retains boss progress where originally valid', () => {
    const old=normalizeSave({...valid,catalogRevision:0,dead:['1-0','4-0'],key:true}); assert.equal(old.catalogRevision,3); assert.equal(old.key,false); assert.deepEqual(old.dead,['1-0']);
    const third=normalizeSave({...valid,catalogRevision:0,floor:3,dead:['4-0'],key:true}); assert.equal(third.key,true); assert.deepEqual(third.dead,['4-0']);
  });
  await test('out-of-map saved position returns to the safe floor entry', async () => {
    const storage=new MemoryStorage({[SAVE]:JSON.stringify({...valid,hero:{...valid.hero,x:50,z:50}})});
    const h=await createHarness({storage});h.click('continueGame');assert.equal(h.snapshot().hero.x,0);assert.equal(h.snapshot().hero.z,12);
  });
  await test('hidden tab pauses, saves, releases keyboard / joystick / attack / block, and never auto-resumes', async () => {
    const h=await start();h.press('KeyW');h.pointer('joystick');h.pointer('action-block');h.pointer('action-attack');
    assert(h.snapshot().joy.x>0);assert(h.snapshot().actions.length>0);h.document.hidden=true;h.document.emit('visibilitychange');
    const s=h.snapshot();assert(s.paused);assert.deepEqual(s.keys,{});assert.deepEqual(s.joy,{x:0,y:0});assert.deepEqual(s.actions,[]);assert.equal(s.joystickPointer,null);assert.equal(h.nodes.get('stick').style.transform,'');
    const time=s.state.playtime;h.run('frame(3000)');assert.equal(h.snapshot().state.playtime,time);
    h.document.hidden=false;h.document.emit('visibilitychange');assert(h.snapshot().paused);h.click('resumeGame');assert(!h.snapshot().paused);
  });
  await test('blur and pagehide preserve existing modal and save without involuntary resume', async () => {
    const h=await start();h.click('bagButton');h.run('state.gold=123');h.window.emit('blur');assert.equal(h.nodes.get('modalTitle').textContent,'旅の手帳');assert(h.snapshot().paused);
    h.window.emit('pagehide');assert.equal(JSON.parse(h.storage.getItem(SAVE)).gold,123);assert(h.snapshot().paused);
  });
  await test('lost touch capture, modal opening and pointer cancellation stop held actions', async () => {
    const h=await start();h.pointer('joystick');h.nodes.get('joystick').onlostpointercapture({pointerId:1});assert.deepEqual(h.snapshot().joy,{x:0,y:0});
    h.pointer('action-block');h.nodes.get('action-block').onlostpointercapture({pointerId:1});assert.deepEqual(h.snapshot().actions,[]);
    h.pointer('action-attack');h.pointer('action-attack','cancel');assert.deepEqual(h.snapshot().actions,[]);
    h.pointer('joystick');h.click('bagButton');assert.equal(h.snapshot().joystickPointer,null);assert.deepEqual(h.snapshot().joy,{x:0,y:0});
  });
  await test('failed WebGL startup shows browser recovery advice and never overwrites existing save', async () => {
    const storage=new MemoryStorage({[SAVE]:JSON.stringify(valid)}), before=storage.getItem(SAVE);
    const h=await createHarness({storage,noWebGL:true});h.click('newGame');h.click('confirmNew');h.click('chooseClaire');
    assert.equal(h.snapshot().mode,'title');assert.match(h.nodes.get('modalBody').innerHTML,/WebGL 2/);assert(!h.nodes.get('modalBody').innerHTML.includes('Android System WebView'));
    h.window.emit('pagehide');assert.equal(storage.getItem(SAVE),before);h.click('graphicsClose');assert.equal(h.nodes.get('modal').classList.contains('hidden'),true);
  });
  await test('WebGL context loss saves and pauses; restored context requires deliberate resume', async () => {
    const h=await start();h.press('KeyW');let prevented=false;h.nodes.get('world').emit('webglcontextlost',{preventDefault(){prevented=true;}});
    assert(prevented);assert(h.snapshot().graphicsLost);assert(h.snapshot().paused);assert.deepEqual(h.snapshot().keys,{});
    const time=h.snapshot().state.playtime;h.click('resumeGame');h.run('frame(100)');assert.equal(h.snapshot().state.playtime,time);
    h.nodes.get('world').emit('webglcontextrestored');assert(!h.snapshot().graphicsLost);assert(h.snapshot().paused);h.click('resumeGame');assert(!h.snapshot().paused);
  });
  await test('storage helper catches getter/read/write/parse failures with no destructive clearing', () => {
    const notes=[];const storage=new MemoryStorage({[SAVE]:'bad'});const store=createSaveStore(()=>storage,s=>notes.push(s));
    assert.equal(store.readSave(),null);assert.equal(storage.getItem(SAVE),'bad');assert(store.hasAnySave());
    storage.failRead=true;assert.equal(store.readSave(),null);storage.failRead=false;storage.failWrite=true;assert.equal(store.write(SAVE,valid),false);assert(notes.length>=3);
  });
  await test('entry is base-relative, no Android startup, no network game APIs and all local dependencies exist', () => {
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes('../../browser/'));assert(html.includes('type="module" src="game.js"'));assert(!html.includes('android.css'));assert(!html.includes('game.bundle.js'));
    assert(html.includes('APK・他端末とは自動同期しません'));assert(html.includes('初回起動・再読込には通信が必要'));
    for(const [,ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(ref.startsWith('#')||ref.startsWith('data:')||ref.startsWith('../'))continue;assert(!/^(?:https?:)?\/\//.test(ref));assert(!ref.startsWith('/'));assert(fs.existsSync(path.join(root,ref)),ref);}
    for(const file of ['game.js','core.js','models.js','browser-storage.js','catalog.js']){const src=fs.readFileSync(path.join(root,file),'utf8');for(const [,ref] of src.matchAll(/from ['"]([^'"]+)['"]/g)){assert(ref.startsWith('./'));assert(fs.existsSync(path.join(root,ref)));}assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(src));}
    const startup=fs.readFileSync(path.join(root,'startup.js'),'utf8');assert(!startup.includes('localStorage'));assert(!startup.includes('Android'));assert(startup.includes('WebGL 2'));
    const css=fs.readFileSync(path.join(root,'style.css'),'utf8');for(const [,ref] of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))assert(fs.existsSync(path.join(root,ref)));
  });
  if(fs.existsSync(path.join(root,'SOURCE_ASSETS.json'))) await test('unchanged APK asset hashes and source / published game directories match exactly', () => {
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'SOURCE_ASSETS.json'),'utf8'));
    for(const [file,hash] of Object.entries(manifest.unchangedSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,file);
    const mirror=path.resolve(root,'../../../../zatuplay/games/quest-reborn');
    const list=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(dir,e.name)).map(x=>`${e.name}/${x}`):[e.name]).sort();
    assert.deepEqual(list(root),list(mirror));for(const file of list(root))assert(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(mirror,file))),file);
  });
  console.log(`\n${passed} QUEST REBORN test groups passed. Node scene/logic checks use a fake WebGL renderer, not real-browser UI validation.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
