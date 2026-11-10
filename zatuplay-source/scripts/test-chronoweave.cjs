const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = fs.existsSync(path.resolve(__dirname, '../chronoweave/index.html')) ? path.resolve(__dirname, '../chronoweave') : path.resolve(__dirname, '../public/games/chronoweave');
const crypto = require('node:crypto');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const originalHashes = {"1": "87148b4c07c24754ed05cf0f787b6ff7c9d3db0c14ca325e7d0155fde1579d9a", "2": "62011937a0926531644a224290a473c48a65c48eaa48007245e881f90eb508e2", "3": "1f7f28bcdbb55a2d07b38bc2214015f3b26831836e6109d286f01b89765c9bd1"};
scripts.forEach((s,i)=>new vm.Script(s,{filename:`chronoweave-inline-${i}.js`}));
assert.equal(scripts.length,6);
// Campaign, rules and canvas renderer remain byte-for-byte identical to APK assets.
for(const i of [1,2,3]) assert.equal(crypto.createHash('sha256').update(scripts[i]).digest('hex'),originalHashes[i]);
assert(!/AndroidGame|ChronoAndroid|Storage\.prototype/.test(html));
assert(html.includes("KEY='chronoweave-v3'"));
assert(html.includes('href="../../browser/"'));
assert(html.includes("document.body.appendChild(input)"));
assert(html.includes("const file=input.files[0];input.remove();"));
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const ref=m[1]; if(ref==='../../browser/'||ref==='./')continue;
  assert(!/^https?:/.test(ref),'No remote dependencies');
  assert(fs.existsSync(path.resolve(root, ref)),`Missing resource ${ref}`);
}
const context=vm.createContext({console, setInterval:()=>1,clearInterval:()=>{},document:{documentElement:{setAttribute(){}}},addEventListener(){}});
context.window=context;
vm.runInContext(scripts[0],context);
assert.equal(context.__chronoBootReady,false);
context.ChronoBrowser.ready();assert.equal(context.__chronoBootError,'The game did not initialize');
vm.runInContext(scripts[1],context);vm.runInContext(scripts[2],context);
const C=context.Chrono;
assert.equal(C.CHAPTERS.length,20);
assert.equal(C.validate(C.create()).version,3);
let s=C.create(123);
const nature=C.derive(s,'future').nature;
assert(C.edit(s,'past','seed','plant').ok);
assert(C.derive(s,'future').nature>nature);
assert(!C.edit(s,'past','seed','invalid').ok);
assert(!C.claimChapter(s).ok,'Cannot skip chapter');
assert(!C.solveChapterPuzzle(s).ok,'Introduction is required');
assert(C.startChapter(s));assert(!C.startChapter(s));
s.era='future';C.interact(s,'tree');C.observeClues(s,'tree');
s.story.orders[0]=['n0','n1','n2'];
assert(C.solveChapterPuzzle(s).ok);assert(C.chapterStatus(s).ready);
assert(C.claimChapter(s).ok);assert.equal(s.chapter,1);
assert(C.branch(s,'Backup').ok);C.edit(s,'past','seed','cut');assert(C.loadBranch(s,1));assert.equal(s.edits.past.seed,'plant');
assert(C.validate(JSON.parse(JSON.stringify(s))),'Export/import round trip');
// All campaign puzzle graphs are solvable; deduction answers name real options.
for(const chapter of C.CHAPTERS){
  assert(chapter.clues.length>0);
  const p=chapter.puzzle;
  if(p.type==='sequence'){
    const pending=p.nodes.map(n=>n.id), order=[];
    while(pending.length){const i=pending.findIndex(n=>p.edges.filter(e=>e[1]===n).every(e=>order.includes(e[0])));assert(i>=0,'Acyclic puzzle');order.push(...pending.splice(i,1));}
    assert(C.sequenceValid(p,order));assert(!C.sequenceValid(p,order.slice(1)));
  } else assert(p.options.some(o=>o.id===p.answer));
}
for(const mutate of [x=>x.version=99,x=>x.chapter=21,x=>x.era='invalid',x=>x.order=['seed','seed','rain'],x=>x.edits.past.seed='invalid',x=>x.npcs=[],x=>x.player.x=Infinity,x=>x.story.clues={0:[999]},x=>x.branches=[{id:1,name:'Bad',snapshot:{},metrics:{}}]]){
  const bad=C.create();mutate(bad);assert.equal(C.validate(bad),null);
}
s=C.create();s.energy=900;assert.equal(C.validate(s).energy,100);
context.chronoweave={};context.ChronoBrowser.ready();assert(context.__chronoBootReady);
console.log('PASS: 6 inline scripts; unchanged campaign/engine/renderer; resources; browser boot; chapter completion; branch restore; all 20 puzzles; save round trip and invalid saves.');
