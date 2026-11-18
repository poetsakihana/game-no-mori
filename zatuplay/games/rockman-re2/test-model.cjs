const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const nodes=new Map(),events={};function node(){return {style:{},dataset:{},hidden:false,textContent:'',children:[],setAttribute(){},append(x){this.children.push(x)},getContext(){return new Proxy({},{get:()=>()=>{}})},setPointerCapture(){}}}const get=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)};
let saved={version:1,bosses:[],castle:0,ended:false,sound:false},writes=0;
const ctx={console,document:{createElement:node,querySelector:get,querySelectorAll:()=>[],body:node(),addEventListener:(n,f)=>events[n]=f,hidden:false},window:{addEventListener:(n,f)=>events[n]=f},BrowserSave:{data:saved,stopped:false,write:v=>{saved=JSON.parse(JSON.stringify(v));writes++}},requestAnimationFrame(){},confirm:()=>false};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'game.js'),'utf8'),ctx);
function run(code){return vm.runInContext(code,ctx)}
assert.equal(run('mute'),true);assert.equal(run('mode'),'title');
for(let i=0;i<14;i++){const level=run(`makeLevel(${i})`);assert.ok(level.width>1000);assert.ok(level.platforms.length>0);assert.ok(level.enemies.length>0)}
for(let i=0;i<8;i++){run(`start(${i});complete()`);assert.equal(saved.bosses.length,i+1)}
for(let i=8;i<14;i++){run(`start(${i});complete()`);assert.equal(saved.castle,i-7)}
assert.equal(saved.ended,true);assert.equal(writes,14);assert.equal(run('available().length'),9);run('advance()');assert.equal(run('mode'),'ending');
run('start(0);spawnBoss();paused=true');const intro=run('bossIntro');run('update()');assert.equal(run('bossIntro'),intro);run('paused=false;update()');assert.equal(run('bossIntro'),intro-1);
ctx.document.hidden=true;events.visibilitychange();assert.equal(run('paused'),true);assert.equal(run('Object.values(keys).some(Boolean)'),false);
const prior=JSON.stringify(saved);get('#port-reset').onclick();assert.equal(JSON.stringify(saved),prior);ctx.confirm=()=>true;get('#port-reset').onclick();assert.equal(saved.bosses.length,0);assert.equal(saved.castle,0);assert.equal(saved.ended,false);
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');assert.ok(!html.includes('rockman2.png')&&!html.includes('6boss.png'));assert.match(html,/非公式/);assert.match(html,/未確認/);
console.log('PASS: 14 level structures, eight bosses/six castle direct completion model, ending, weapons, boss-intro pause, hidden-tab pause, reset confirmation, absent screenshot references. NOT normal gameplay completion.');

run('start(12);spawnBoss();mode="boss";boss.phase=3;boss.kind=3;boss.hp=8;weapon=6;shotTimer=0;shoot()');assert.equal(run('boss.phase'),4);assert.equal(run('boss.kind'),4);assert.equal(run('mode'),'boss');assert.equal(run('save.castle'),0);console.log('PASS rematch: TIME STOPPER Quick defeat advances to boss five, does not skip to castle clear');
run('save={bosses:[0,1,2,3,4,5,6,7],castle:4,ended:false};start(12);spawnBoss();mode="boss"');for(let i=0;i<7;i++){run('boss.hp=0;bossDefeated()');assert.equal(run('mode'),'boss');assert.equal(run('save.castle'),4);assert.equal(run('boss.phase'),i+1)}run('boss.hp=0;bossDefeated()');assert.equal(run('mode'),'clear');assert.equal(run('save.castle'),5);console.log('PASS all eight rematch bosses required; only eighth defeat clears castle stage five');

run('start(0);p.hp=0;mode="dead";complete();spawnBoss()');assert.equal(run('mode'),'dead');assert.equal(run('boss'),null);run('start(0);p.hp=1;p.inv=0;p.x=level.arena.x+30;p.y=level.height+200;update()');assert.equal(run('mode'),'dead');assert.equal(run('boss'),null);console.log('PASS: lethal fall/explicit death cannot become boss intro or stage clear');
