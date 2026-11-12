'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {createHarness, MemoryStorage, lockManager, root, KEY} = require('./picross-harness.cjs');
let groups = 0;
async function test(name, fn) { await fn(); groups++; console.log('ok ' + groups + ' - ' + name); }
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk = p => fs.readdirSync(p, {withFileTypes: true}).flatMap(d => d.isDirectory() ? walk(path.join(p, d.name)) : [path.join(p, d.name)]);
function solved(q, seconds = 0) { return {cells: q.grid.flat(), seconds, finished: true}; }
function verifyHints(line, values) { const expanded = []; values.forEach((v, i) => { if (i) expanded.push(0); for (let n = 0; n < v; n++) expanded.push(1); }); assert.ok(expanded.length <= line.length); assert.equal(values.reduce((a,b) => a+b,0), line.reduce((a,b) => a+b,0)); }
(async () => {
 await test('source hashes, complete original file retention and exact delivery mirror', () => {
   const m = JSON.parse(fs.readFileSync(path.join(root, 'SOURCE_ASSETS.json')));
   assert.equal(m.apk.sha256, '87aa87bd90ea12d6b27bbc11792d6bc9abec8d569c75db25c95339fbac4224e1');
   for (const f of m.sourceFiles) assert.equal(hash(path.join(root, f.preservedAt || f.path)), f.sha256, f.path);
   const mirror = path.resolve(root, '../../../../zatuplay/games/picross-mv');
   const files = walk(root).map(p => path.relative(root, p)).sort();
   assert.deepEqual(walk(mirror).map(p => path.relative(mirror, p)).sort(), files);
   for (const f of files) assert.equal(hash(path.join(root, f)), hash(path.join(mirror, f)), f);
   assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('src="https:'), false);
 });
 await test('all 55 grids, 113 original-map archive, every MV map/event/coordinate and original scoring commands', () => {
   const h = createHarness(), archive = JSON.parse(fs.readFileSync(path.join(root, 'migration/original-events.json')));
   assert.equal(h.data.length, 55); assert.equal(archive.length, 113); assert.equal(new Set(h.data.map(q => q.id)).size, 55);
   assert.equal(h.get('.levels').children.length, 55);
   assert.equal(h.data.some(q => q.id === 30), false);
   const infos = JSON.parse(fs.readFileSync(path.join(root, 'data/MapInfos.json'))); assert.equal(infos.length, 56);
   let cells = 0;
   h.data.forEach((q, index) => {
     assert.ok([5,8,10,12,15,20,25,30,35].includes(q.width)); assert.equal(q.width, q.height); assert.equal(q.grid.length, q.height);
     const original = archive.find(m => m.id === q.id), map = JSON.parse(fs.readFileSync(path.join(root, 'data/Map' + String(index+1).padStart(3,'0') + '.json')));
     assert.equal(infos[index+1].name, q.name); assert.equal(map.events.length, q.width*q.height+1); assert.ok(map.note.includes(String(q.id)));
     q.grid.forEach((row,y) => { assert.equal(row.length,q.width); row.forEach((v,x) => {
       cells++; assert.ok(v===0 || v===1);
       const e = original.events.find(e => e.x===q.origin[0]+x && e.y===q.origin[1]+y);
       assert.ok(e); const good = e.pages[0].commands.some(c=>c[0]===10220 && c[3].slice(0,6).join(',')==='0,1,1,1,0,1');
       const bad = e.pages[0].commands.some(c=>c[0]===10220 && c[3].slice(0,6).join(',')==='0,2,2,2,0,1');
       assert.ok(good||bad); assert.equal(+good,v);
       const mv = map.events[y*q.width+x+1]; assert.equal(mv.x,x+1); assert.equal(mv.y,y+1); assert.equal(mv.note,'<answer:'+v+'>');
     }); });
     h.open(q.id); assert.equal(h.document.querySelectorAll('#board td').length,q.width*q.height);
     [...h.document.querySelectorAll('th.row')].forEach((e,y)=>verifyHints(q.grid[y],e.textContent.split(' ').map(Number)));
     [...h.document.querySelectorAll('th.col')].forEach((e,x)=>verifyHints(q.grid.map(r=>r[x]),e.textContent.split('\n').map(Number)));
     h.click('#menu');
   });
   console.log('   verified cells:',cells);
 });
 await test('original fill/cross/toggle, right click, keyboard focus/arrows, repeat guard and undo', () => {
   const h=createHarness(); h.open(3); h.tap(0); assert.ok(h.cell(0).classList.contains('filled')); h.tap(0); assert.ok(!h.cell(0).classList.contains('filled'));
   h.click('#cross');h.tap(2);assert.equal(h.cell(2).textContent,'×'); h.emit(h.cell(1),'contextmenu');assert.equal(h.cell(1).textContent,'×');
   h.click('#undo');assert.equal(h.cell(1).textContent,'');h.click('#fill');h.cell(0).focus();h.emit(h.cell(0),'keydown',{key:'Enter'});assert.ok(h.cell(0).classList.contains('filled'));assert.equal(h.document.activeElement.dataset.index,'0');
   h.emit(h.cell(0),'keydown',{key:' ',repeat:true});assert.ok(h.cell(0).classList.contains('filled'));
   h.emit(h.cell(0),'keydown',{key:'ArrowRight'});assert.equal(h.document.activeElement.dataset.index,'1');h.emit(h.cell(1),'keydown',{key:'ArrowDown'});assert.equal(h.document.activeElement.dataset.index,'6');
   assert.equal(h.document.querySelectorAll('td[tabindex="0"]').length,1);
 });
 await test('real cell-input completion for all 55 boards and reload of every clear', () => {
   const h=createHarness();
   for(const q of h.data){h.open(q.id); q.grid.flat().forEach((v,i)=>{if(v)h.tap(i);}); assert.match(h.get('#notice').textContent,/クリア/); assert.equal(h.value().boards[q.id].finished,true);h.click('#menu');}
   assert.equal(Object.keys(h.value().cleared).length,55);const r=createHarness({storage:h.storage});assert.equal(r.document.querySelectorAll('.level.done').length,55);
   for(const q of r.data){r.open(q.id);assert.match(r.get('#notice').textContent,/クリア/);r.click('#menu');}
 });
 await test('non-answer does not clear; completed board cannot change; undo/restart retain lifetime clear', () => {
   const h=createHarness();h.open(3); h.tap(2);for(let i=0;i<25;i++)if(h.data[0].grid.flat()[i])h.tap(i);assert.equal(h.get('#notice').textContent,''); h.tap(2);assert.match(h.get('#notice').textContent,/クリア/);
   const raw=h.storage.getItem(KEY);h.tap(0);assert.equal(h.storage.getItem(KEY),raw);
   h.click('#undo');assert.equal(h.value().boards[3].finished,false);assert.equal(h.value().cleared[3],true);
   h.setConfirm(false); const before=h.storage.getItem(KEY);h.click('#restart');assert.equal(h.storage.getItem(KEY),before);
   h.setConfirm(true);h.click('#restart');assert.equal(h.value().boards[3].cells.reduce((a,b)=>a+b),0);assert.equal(h.value().cleared[3],true);
 });
 await test('partial cells/time resume and menu filters, zoom limits, information dialog and list link', () => {
   const h=createHarness();h.open(3);h.tap(0);h.click('#cross');h.tap(2);h.advance(7000);h.click('#menu');assert.equal(h.value().boards[3].seconds,7);
   const r=createHarness({storage:h.storage});r.open(3);assert.ok(r.cell(0).classList.contains('filled'));assert.equal(r.cell(2).textContent,'×');assert.match(r.get('#stats').textContent,/00:07/);assert.equal(r.get('#undo').disabled,true);
   for(let i=0;i<20;i++)r.click('#zoomin');assert.equal(r.document.documentElement.style.getPropertyValue('--cell'),'52px');for(let i=0;i<20;i++)r.click('#zoomout');assert.equal(r.document.documentElement.style.getPropertyValue('--cell'),'20px');
   r.click('#menu');r.get('#filter').value='large';r.emit(r.get('#filter'),'change');assert.equal(r.get('#levels').children.length,r.data.filter(q=>q.width>10).length);
   r.get('#filter').value='small';r.emit(r.get('#filter'),'change');assert.equal(r.get('#levels').children.length,r.data.filter(q=>q.width<=10).length);
   r.click('#about');assert.ok(r.get('dialog').open);r.emit(r.get('dialog'),'cancel');assert.equal(r.get('dialog'),null);assert.equal(r.get('a').getAttribute('href'),'../../browser/');
 });
 await test('blur/hidden/pagehide pause, explicit resume, timer freeze, pointer cancellation and Esc focus trap', () => {
   const h=createHarness();h.open(3);h.advance(2000);h.emit(h.cell(0),'pointerdown');h.windowEvent('blur');h.tap(0,{detail:1});h.advance(10000);assert.equal(h.value().boards[3].seconds,2);assert.equal(h.value().boards[3].cells[0],0);
   h.windowEvent('focus');h.advance(1000);assert.match(h.get('#stats').textContent,/00:02/);h.click('#resume');h.advance(1000);assert.match(h.get('#stats').textContent,/00:03/);
   h.emit(h.cell(0),'pointerdown');h.windowEvent('pointercancel');h.tap(0,{detail:1});assert.ok(!h.cell(0).classList.contains('filled'));
   h.emit(h.cell(0),'pointerdown');h.windowEvent('lostpointercapture');h.tap(0,{detail:1});assert.ok(!h.cell(0).classList.contains('filled'));
   h.emit(h.cell(0),'pointerdown');h.emit(h.cell(0),'pointerup');h.windowEvent('lostpointercapture');h.tap(0,{detail:1});assert.ok(h.cell(0).classList.contains('filled'));
   h.visibility(true);h.advance(9000);h.click('#resume');h.tap(1);assert.equal(h.value().boards[3].cells[1],0);h.visibility(false);h.advance(1000);assert.match(h.get('#stats').textContent,/00:03/);h.click('#resume');h.advance(1000);assert.match(h.get('#stats').textContent,/00:04/);
   h.emit(h.document,'keydown',{key:'Escape'});assert.equal(h.get('#pause-overlay').hidden,false);h.emit(h.document,'keydown',{key:'Tab'});assert.equal(h.document.activeElement.id,'pause-menu');h.click('#resume');h.windowEvent('pagehide');assert.equal(h.get('#pause-overlay').hidden,false);h.click('#pause-menu');assert.equal(h.get('#board'),null);
 });
 await test('corrupt and incompatible saves never overwritten, even after input/menu/pause/clear', () => {
   const q=createHarness().data[0];
   const invalid=['{bad','null','[]','{}',JSON.stringify({boards:{},cleared:{},future:1}),JSON.stringify({boards:{3:{cells:[1],seconds:0,finished:false}},cleared:{}}),JSON.stringify({boards:{3:{cells:Array(25).fill(3),seconds:0,finished:false}},cleared:{}}),JSON.stringify({boards:{3:{cells:Array(25).fill(0),seconds:-1,finished:false}},cleared:{}}),JSON.stringify({boards:{3:{cells:Array(25).fill(0),seconds:0,finished:true}},cleared:{3:true}}),JSON.stringify({boards:{3:{...solved(q),finished:false}},cleared:{3:true}}),JSON.stringify({boards:{3:solved(q)},cleared:{}}),JSON.stringify({boards:{},cleared:{999:true}}),JSON.stringify({boards:{},cleared:{3:false}}),JSON.stringify({boards:{3:{cells:Array(25).fill(0),seconds:0.1,finished:false}},cleared:{}})];
   for(const raw of invalid){const storage=new MemoryStorage({[KEY]:raw}),h=createHarness({storage});assert.match(h.status(),/停止/);h.open(3);h.tap(0);h.advance(5000);h.windowEvent('blur');h.click('#pause-menu');assert.equal(storage.getItem(KEY),raw);assert.equal(storage.writes,0);}
 });
 await test('storage getter/read/write denial remain visible and never report successful saving', () => {
   for(const kind of ['getter','read','write']){const storage=new MemoryStorage();if(kind==='read')storage.failRead=true;if(kind==='write')storage.failWrite=true;const h=createHarness({storage,deniedGetter:kind==='getter'});h.open(3);h.tap(0);h.advance(5000);assert.equal(h.get('#storage-status').dataset.kind,'error');assert.equal(storage.writes,0);h.click('#menu');assert.match(h.status(),/保存されません/);}
   const h=createHarness();h.open(3);h.tap(0);const before=h.storage.getItem(KEY);h.storage.failWrite=true;h.tap(1);assert.equal(h.storage.getItem(KEY),before);assert.equal(h.get('#storage-status').dataset.kind,'error');
 });
 await test('cross-tab changed/deleted saves and storage events block stale overwrites', () => {
   const storage=new MemoryStorage(),a=createHarness({storage}),b=createHarness({storage});a.open(3);b.open(3);a.tap(0);const current=storage.getItem(KEY);b.tap(1);assert.equal(storage.getItem(KEY),current);assert.match(b.status(),/競合/);
   const c=createHarness({storage});c.open(3);storage.data.delete(KEY);c.windowEvent('storage',{key:null,storageArea:storage});c.tap(1);assert.equal(storage.getItem(KEY),null);assert.match(c.status(),/競合/);
   const d=createHarness();d.open(3);d.storage.failRead=true;d.windowEvent('storage',{key:KEY,storageArea:d.storage});assert.equal(d.get('#storage-status').dataset.kind,'error');
 });
 await test('Web Locks serialization, latest pending snapshot, reload and lock rejection protection', async () => {
   const storage=new MemoryStorage(),locks=lockManager(),a=createHarness({storage,locks}),b=createHarness({storage,locks});a.open(3);b.open(3);a.tap(0);a.tap(1);assert.equal(a.get('#storage-status').dataset.kind,'pending');b.tap(3);await a.settle();await b.settle();assert.equal(a.get('#storage-status').dataset.kind,'saved');assert.equal(b.get('#storage-status').dataset.kind,'error');assert.deepEqual(a.value().boards[3].cells.slice(0,4),[1,1,0,0]);
   const c=createHarness({locks:{request(){return Promise.reject(Error('denied'));}}});c.open(3);c.tap(0);await c.settle();assert.equal(c.get('#storage-status').dataset.kind,'error');assert.equal(c.storage.writes,0);
   const d=createHarness({locks:{request(){throw Error('denied');}}});d.open(3);d.tap(0);assert.equal(d.get('#storage-status').dataset.kind,'error');assert.equal(d.storage.writes,0);
 });
 await test('list navigation waits for delayed locked saves and warns before discarding failed saves', async () => {
   let release; const h=createHarness({locks:{request(name,fn){return new Promise(resolve=>{release=()=>resolve(fn());});}}}); h.open(3);h.tap(0);h.click('header a');assert.equal(h.navigations.length,0);assert.equal(h.get('#pause-overlay').hidden,false);release();await h.settle();assert.equal(h.navigations.length,1);assert.equal(h.value().boards[3].cells[0],1);
   const storage=new MemoryStorage();storage.failWrite=true;const r=createHarness({storage});r.open(3);r.tap(0);r.setConfirm(false);r.click('header a');await r.settle();assert.equal(r.navigations.length,0);r.setConfirm(true);r.click('header a');await r.settle();assert.equal(r.navigations.length,1);
 });
 console.log('PASS '+groups+' PicrossMV test groups. DOM/timers/locks are models; real browser QA is separate.');
})().catch(e=>{console.error(e);process.exitCode=1;});
