const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const script = fs.readFileSync(__dirname + '/../public/games/candy/index.html', 'utf8').split('<script>')[1].split('</script>')[0];
const results = [];
function harness(seed, denyStorage = false) {
 const values = new Map(Object.entries(seed || {}));
 const nodes = new Map(), events = {};
 const context2d = new Proxy({}, {get: (t,k) => t[k] || (()=>{}), set:(t,k,v)=>(t[k]=v,true)});
 const make = () => ({textContent:'',innerHTML:'',hidden:false,value:0,disabled:false,dataset:{},classList:{toggle(){}},addEventListener(){},querySelectorAll(){return []},getContext(){return context2d},focus(){},scrollIntoView(){},click(){},setPointerCapture(){}});
 const document = {getElementById(id){if(!nodes.has(id))nodes.set(id,make());return nodes.get(id)},querySelectorAll(){return []},querySelector(){return make()},addEventListener(n,fn){events['document:'+n]=fn},createElement(){return make()},hidden:false};
 const window={addEventListener(n,fn){events['window:'+n]=fn},matchMedia(){return {matches:false}}};
 const sandbox={console,document,window,localStorage:{getItem(k){if(denyStorage)throw Error('blocked');return values.get(k)||null},setItem(k,v){if(denyStorage)throw Error('blocked');values.set(k,v)}},Image: class {constructor(){this.complete=true;this.naturalWidth=120}},requestAnimationFrame(){},setInterval(){},setTimeout(){},Blob,URL,Date,Math,CanvasRenderingContext2D:function(){}};
 sandbox.CanvasRenderingContext2D.prototype = {roundRect(){}};
 const ctx=vm.createContext(sandbox);vm.runInContext(script,ctx);
 return {run(s){return vm.runInContext(s,ctx)},values,events,nodes,document};
}
function test(name,fn){fn();results.push({name,status:'passed'});}
const h=harness({'other-game-save':'do not change'});
test('50 stages and 10 worlds load without Android bridge',()=>{assert.equal(h.run('stages.length'),50);assert.equal(h.run('worlds.length'),10);assert.equal(h.run('nativeApp'),false);assert.equal(h.run('state'),'ready');h.run('draw()');});
test('Unrelated game save is untouched',()=>assert.equal(h.values.get('other-game-save'),'do not change'));
test('Start, movement, wall collision and pause/resume',()=>{h.run('begin();keys.right=true;tick(.5);keys={}');assert.equal(h.run('game.x'),192.5);assert.equal(h.run('blocked(320,300)'),true);h.run('pause()');const t=h.run('game.time');h.run('tick(1)');assert.equal(h.run('game.time'),t);h.run('pause()');assert.equal(h.run('state'),'playing');});
test('Window blur clears movement and pauses gameplay',()=>{h.run('keys.right=true');h.events['window:blur']();assert.equal(h.run('state'),'paused');assert.equal(h.run('Object.keys(keys).length'),0);});
test('Wrong element cannot open a gate; correct skill opens it',()=>{h.run('begin();game.x=260;game.y=480;choose(1);act(true)');assert.equal(h.run('game.gates[0].open'),false);h.run('actionCooldown=0;choose(0);act(true)');assert.equal(h.run('game.gates[0].open'),true);assert.equal(h.run('blocked(320,480)'),false);});
test('Loss preserves progress; replay and next stage remain selectable',()=>{const before=h.run('JSON.stringify(save)');h.run('game.hp=0;tick(.01)');assert.equal(h.run('state'),'lost');assert.equal(h.run('JSON.stringify(save)'),before);h.nodes.get('start').onclick();assert.equal(h.run('state'),'playing');});
test('Normal-stage completion records rewards and unlocks next stage',()=>{h.run('game.stars.forEach(s=>s.got=true);game.x=850;game.y=600;tick(.01)');assert.equal(h.run('state'),'won');assert.equal(h.run('save.cleared'),1);assert.equal(h.run('save.sugar'),8);h.nodes.get('start').onclick();assert.equal(h.run('stage'),1);assert.equal(h.run('state'),'ready');});
test('Invalid imports do not modify current progress',()=>{const before=h.run('JSON.stringify(save)');for(const raw of ['{}','not json',JSON.stringify({format:'candy-reverie-save-v1',sugar:0,dream:0,base:1,wins:0,stamp:0,cleared:51,job:'sugar'})]){assert.equal(h.run('importProgress('+JSON.stringify(raw)+')'),false);assert.equal(h.run('JSON.stringify(save)'),before);}});
test('APK-compatible JSON restores progress and persists across reload',()=>{const s={format:'candy-reverie-save-v1',sugar:20,dream:5,base:2,wins:9,stamp:Date.now(),cleared:4,job:'dream'};assert.equal(h.run('importProgress('+JSON.stringify(JSON.stringify(s))+')'),true);const reload=harness(Object.fromEntries(h.values));assert.equal(reload.run('save.cleared'),4);assert.equal(reload.run('save.base'),2);assert.equal(reload.run('save.sugar'),20);});
test('All 50 stages initialize, render, unlock, and finish (logic simulation, not manual playthrough)',()=>{const all=harness();for(let i=0;i<50;i++){all.run(`save.cleared=${i};selectStage(${i});begin();draw()`);if(i%5!==4){all.run('game.stars.forEach(s=>s.got=true);game.x=850;game.y=600;tick(.01)');}else{all.run(`game.x=480;game.y=290;for(let phase=0;phase<5;phase++){selected=bossOrder()[phase];game.cooldowns[selected]=0;actionCooldown=0;act(true);for(let n=0;n<20&&game.boss.phase===phase;n++){actionCooldown=0;act(false)}}`);}assert.equal(all.run('state'),'won','stage '+i);assert.equal(all.run('save.cleared'),i+1);}});
test('Timed gate closes safely and moves player off gate',()=>{h.run('save.cleared=50;selectStage(1);begin();game.x=320;game.y=220;game.gates[0].open=true;game.gates[0].left=.01;tick(.02)');assert.equal(h.run('game.gates[0].open'),false);assert.equal(h.run('game.x'),280);});
test('Arrow keys still move after a control button receives focus',()=>{h.run('begin();keys={}');h.events['window:keydown']({key:'ArrowRight',code:'ArrowRight',target:{closest(s){return s==='button'?{}:null}},preventDefault(){}});assert.equal(h.run('keys.right'),true);h.events['window:keyup']({key:'ArrowRight'});assert.equal(h.run('keys.right'),false);});
test('Space on a focused button keeps its native keyboard activation',()=>{h.run('begin();actionCooldown=0');h.events['window:keydown']({key:' ',code:'Space',target:{closest(s){return s==='button'?{}:null}},preventDefault(){throw Error('button default prevented')}});assert.equal(h.run('actionCooldown'),0);});
test('Unavailable browser storage does not crash gameplay',()=>{const denied=harness({},true);assert.equal(denied.run('storageOk'),false);denied.run('begin();tick(.1);draw()');assert.equal(denied.run('state'),'playing');});
console.log(JSON.stringify(results,null,2));
