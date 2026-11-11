const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const games = path.resolve(__dirname, '../public/games');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }

// These are isolated logic fixtures, not browser or full-campaign playthroughs.
function battle(saved, unavailable = false) {
  const nodes = new Map();
  const node = () => ({innerHTML:'',className:'',textContent:'',style:{},querySelector:()=>node(),remove(){}});
  const get = id => { if (!nodes.has(id)) nodes.set(id,node()); return nodes.get(id); };
  const stored = new Map(saved ? [['battlitia-v1',JSON.stringify(saved)]] : []);
  const context = vm.createContext({
    console, innerWidth:1200, setInterval:()=>1, setTimeout:()=>1, confirm:()=>true,
    document:{getElementById:get,body:{className:'',append(){}},createElement:node},
    localStorage:{getItem(k){if(unavailable)throw Error('blocked');return stored.get(k)||null;},
      setItem(k,v){if(unavailable)throw Error('blocked');stored.set(k,v);}}
  });
  vm.runInContext(fs.readFileSync(path.join(games,'battlitia/game.js'),'utf8'),context);
  return {run:s=>vm.runInContext(s,context),stored,get};
}

test('52 unique cards, 28 tableau cards, 24 stock cards and seven face-up cards',()=>{
  const b=battle();b.run("start('classic')");
  assert.equal(b.run('g.cols.flat().length'),28);
  assert.equal(b.run('g.stock.length'),24);
  assert.equal(b.run('g.cols.flat().filter(c=>c.up).length'),7);
  assert.equal(b.run("new Set([...g.cols.flat(),...g.stock].map(c=>c.s+':'+c.r)).size"),52);
});
test('draw and undo restore cards and move count',()=>{
  const b=battle();b.run("start('classic');draw()");
  assert.equal(b.run('g.stock.length'),23);assert.equal(b.run('g.waste.length'),1);
  b.run('undo()');assert.equal(b.run('g.stock.length'),24);assert.equal(b.run('g.waste.length'),0);
  assert.equal(b.run('g.moves'),0);
});
test('tableau accepts alternating descending cards and rejects equal colors',()=>{
  const b=battle();b.run("start('classic');g.cols=Array.from({length:7},()=>[]);g.cols[0]=[{s:0,r:5,up:true}];g.cols[1]=[{s:2,r:6,up:true}];g.sel={from:'c0',idx:0}");
  assert.equal(b.run('moveCol(1)'),true);assert.equal(b.run('g.cols[1].length'),2);
  b.run("g.cols[0]=[{s:0,r:5,up:true}];g.cols[1]=[{s:1,r:6,up:true}];g.sel={from:'c0',idx:0}");
  assert.equal(b.run('moveCol(1)'),false);
});
test('foundation rejects a two before its ace',()=>{
  const b=battle();b.run("start('classic');g.cols[0]=[{s:0,r:2,up:true}];g.sel={from:'c0',idx:0}");
  assert.equal(b.run('toFound(0)'),false);assert.equal(b.run('g.found[0].length'),0);
});
test('quest damage persists across deals and a final hit unlocks the next stage',()=>{
  const b=battle();
  function king(){b.run("g.found[0]=Array.from({length:12},(_,i)=>({s:0,r:i+1,up:true}));g.cols[0]=[{s:0,r:13,up:true}];g.sel={from:'c0',idx:0}");}
  b.run("start('quest',1)");king();b.run('toFound(0)');
  assert.equal(b.run('g.hp'),50);assert.equal(JSON.parse(b.stored.get('battlitia-v1')).hp['1'],50);
  b.run("start('quest',1)");assert.equal(b.run('g.hp'),50);
  b.run('g.hp=10');king();b.run('toFound(0)');
  assert.equal(b.run('data.unlocked'),2);assert.equal(b.run('data.hp[1]'),undefined);
  assert.equal(b.run('g.end'),true);
});
test('legacy damage migration and the 100-stage HP range remain intact',()=>{
  const b=battle({unlocked:1,hp:{1:5},records:[],options:{},hpRuleVersion:1});
  assert.equal(b.run('data.hp[1]'),55);
  assert.equal(b.run('maxHP(1)'),60);assert.equal(b.run('maxHP(100)'),6000);
});
test('malformed saved containers and unavailable storage do not block startup',()=>{
  const b=battle({unlocked:'bad',hp:null,records:3,options:[]});
  assert.equal(b.run('data.unlocked'),1);assert.equal(b.run('data.records.length'),0);
  const blocked=battle(null,true);assert.match(blocked.get('app').innerHTML,/冒険をはじめる/);
  assert.equal(blocked.run('save()'),false);
});

const crossword = vm.createContext({console});
for(const file of ['lz-string.min.js','data.js','words.js','extra-words.js','engine.js','round-engine.js'])
  vm.runInContext(fs.readFileSync(path.join(games,'crossroad',file),'utf8'),crossword,{filename:file});
const run = s => vm.runInContext(s,crossword);
test('station IDs are unique and all 47 prefectures have stations',()=>{
  assert.equal(run('DATA.prefectures.length'),47);
  assert.equal(run('new Set(DATA.stations.map(s=>s.id)).size'),run('DATA.stations.length'));
  for(let p=1;p<=47;p++)assert.ok(run(`DATA.stations.some(s=>s.p===${p})`));
});
test('Japanese input normalization and compressed save round trips',()=>{
  assert.equal(run("normalize('サッポロ エキ')"),'さっぽろえき');
  assert.equal(run("LZString.decompressFromUTF16(LZString.compressToUTF16('駅の旅・保存123'))"),'駅の旅・保存123');
});
const sampleIds=JSON.parse(run("JSON.stringify([...new Set([...([1,7,13,23,27,40,47].map(p=>DATA.stations.find(s=>s.p===p).id)),DATA.stations.reduce((a,b)=>a.k.length>b.k.length?a:b).id])])"));
test('sampled ten-round crosswords have consistent intersections, bounds and connected clues',()=>{
  for(const id of sampleIds){
    const boards=JSON.parse(run(`JSON.stringify(Array.from({length:10},(_,r)=>makePuzzle(DATA.stations.find(s=>s.id===${id}),r)))`));
    assert.equal(new Set(boards.map(p=>JSON.stringify(p.words))).size,10);
    for(const p of boards){
      assert.ok(p.words.length>1);const grid=new Map(),neighbors=p.words.map(()=>new Set());
      for(const w of p.words){
        assert.ok(['H','V'].includes(w.d));
        for(let j=0;j<w.a.length;j++){
          const x=w.x+(w.d==='H'?j:0),y=w.y+(w.d==='V'?j:0),key=x+','+y;
          assert.ok(x>=0&&y>=0&&x<p.w&&y<p.h);
          if(grid.has(key)){
            const old=grid.get(key);assert.equal(old.ch,w.a[j]);
            neighbors[old.id].add(w.id);neighbors[w.id].add(old.id);
          }else grid.set(key,{ch:w.a[j],id:w.id});
        }
      }
      const reached=new Set([0]),queue=[0];
      while(queue.length){for(const n of neighbors[queue.shift()])if(!reached.has(n)){reached.add(n);queue.push(n);}}
      assert.equal(reached.size,p.words.length);
    }
  }
});
test('a sampled puzzle is deterministic after cache eviction',()=>{
  const id=sampleIds[0],a=run(`JSON.stringify(makePuzzle(DATA.stations.find(s=>s.id===${id}),9))`);
  run('puzzleCache.clear()');
  assert.equal(run(`JSON.stringify(makePuzzle(DATA.stations.find(s=>s.id===${id}),9))`),a);
});
console.log(JSON.stringify({passed,stationCount:run('DATA.stations.length'),sampleStations:sampleIds.length,sampleBoards:sampleIds.length*10}));
