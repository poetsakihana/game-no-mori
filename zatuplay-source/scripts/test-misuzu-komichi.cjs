'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {root,KEY,createHarness,MemoryStorage,locks}=require('./misuzu-komichi-harness.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=x=>JSON.parse(JSON.stringify(x));
const tests=[];async function test(name,fn){await fn();tests.push(name);console.log('PASS',name)}
const q=(h,text)=>[...h.document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
(async()=>{
await test('Content: exact 516 poems / 530 variants / four SVGs and provenance',()=>{
 const poems=JSON.parse(fs.readFileSync(path.join(root,'poems.json')));const h=createHarness();assert.deepEqual(json(h.run('POEMS')),poems);assert.equal(poems.length,516);assert.equal(poems.reduce((s,p)=>s+p.variants.length,0),530);assert.equal(new Set(poems.map(p=>p.id)).size,516);
 const provenance=JSON.parse(fs.readFileSync(path.join(root,'provenance.json')));for(const p of provenance.unchangedAssets)assert.equal(sha(fs.readFileSync(path.join(root,p.path))),p.sha256,p.path);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'content-manifest.json')));assert.equal(sha(JSON.stringify(poems)),manifest.poemDataSha256);
 for(const section of manifest.originalCodeSections){const text=fs.readFileSync(path.join(root,section.file),'utf8');assert.equal(sha(text.slice(text.indexOf(section.start),text.indexOf(section.end,text.indexOf(section.start)))),section.sha256,section.start)}
 for(const p of poems){h.run(`readPoem(${p.id})`);assert.match(h.get('panel').textContent,/KanekoPoems.xlsx/);for(let i=0;i<p.variants.length;i++){h.run(`variant(${p.id},${i})`);assert.equal(h.get('poemText').textContent,p.variants[i].text.replace(/\//g,'\n'));}}
});
await test('Original all 36 events / 72 branch outcomes / original waypoint mappings',async()=>{
 const h=createHarness();for(let id=0;id<36;id++){const e=json(h.run(`eventDef(${id})`));assert.equal(e.ch,Math.floor(id/3));assert.equal(e.p.id,e.ch*43+[1,22,43][id%3]);for(let choice=0;choice<2;choice++){h.run(`showEvent(${id})`);h.click(q(h,'話を聞く'));const options=h.document.querySelectorAll('.event-options button');assert.equal(options.length,2);h.click(options[choice]);assert.match(h.get('panel').textContent,/旅のしおり/);h.click(q(h,'出会いを記録して'));await h.settle();assert.equal(h.state().eventChoices[id],choice);assert.equal(h.state().waypoint,e.p.id)}}assert.equal(h.state().events.length,36);assert.equal(Object.keys(h.state().eventChoices).length,36);
});
await test('All 12 chapter boundaries, no locks, 43 encounters each and 516 completion',async()=>{
 const h=createHarness();h.click('chapters');assert.equal(h.document.querySelectorAll('.chapterlist button').length,12);for(let ch=0;ch<12;ch++){h.run(`go(${ch})`);await h.settle();assert.equal(h.state().chapter,ch);assert.equal(h.state().x,600);assert.equal(h.state().y,170);h.frame(16);assert.match(h.get('progress').textContent,/0 \/ 43/);assert.equal(h.run(`POEMS[${ch}*43].id`),ch*43+1);assert.equal(h.run(`POEMS[(${ch}+1)*43-1].id`),(ch+1)*43)}
 for(let id=1;id<=516;id++)h.run(`collect(${id})`);await h.settle();h.advance(700);assert.equal(h.state().seen.length,516);assert.match(h.get('panel').textContent,/516の灯りが、ともりました/);assert.equal(h.get('count').textContent,'516');
});
await test('Normal UI start, branch, walk, poem read/favorite/reflection, reload',async()=>{
 const h=createHarness();h.click('start');h.frame(600);h.click(q(h,'話を聞く'));h.click(h.document.querySelectorAll('.event-options button')[1]);h.click(q(h,'出会いを記録して'));await h.settle();assert.equal(h.state().events[0],0);
 h.windowEvent('keydown',{key:'s'});for(let i=0;i<32;i++)h.frame();h.windowEvent('keyup',{key:'s'});assert.ok(Math.abs(h.state().y-260.666)<1);assert.equal(h.run('near.id'),2);h.click('interact');assert.equal(h.get('poemText').textContent,h.run('POEMS[1].variants[0].text').replace(/\//g,'\n'));
 h.click(q(h,'☆ お気に入り'));h.click(q(h,'風の目線'));h.click('collect');await h.settle();assert.deepEqual(h.state().seen,[2]);assert.deepEqual(h.state().favorites,[2]);assert.equal(h.state().notes[2],'風');
 const restored=createHarness({storage:h.storage});assert.deepEqual(restored.state(),h.state());
});
await test('Full-state export/import, cancel, confirmed restore, same-file repeat, backup and original format',async()=>{
 const h=createHarness();h.run('go(7);state.x=321;state.y=876;state.sound=true;showEvent(23);eventNext();eventPick(1);finishEvent();collect(344);favorite(344,{})');await h.settle();const expected=h.state();h.click('quickExport');const raw=await h.downloads.at(-1).text();h.run('go(2);collect(90)');await h.settle();const changed=h.state();h.setConfirm(false);await h.importRaw(raw);assert.deepEqual(h.state(),changed);assert.equal(h.get('importFile').value,'');h.setConfirm(true);await h.importRaw(raw);assert.deepEqual(h.state(),expected);await h.importRaw(raw);assert.deepEqual(h.state(),expected);assert.equal(h.get('importFile').value,'');assert.deepEqual(createHarness({storage:h.storage}).state(),expected);
 const backup=h.run('MisuzuStore.backup()');assert.ok(backup.includes('zatuplay-misuzu-komichi-backup'));const before=h.state();await h.importRaw(JSON.stringify({format:'misuzu-v1',state:before}));assert.deepEqual(h.state(),before);
 h.click('settings');h.click('reset');await h.settle();assert.equal(h.state().seen.length,0);assert.equal(h.state().chapter,7);assert.equal(h.state().x,321);assert.equal(h.state().sound,true);const savedBackup=h.run('MisuzuStore.backup()');await h.importRaw(savedBackup);assert.deepEqual(h.state(),before);
});
await test('Import generations ignore stale reads after newer import, cancellation and navigation',async()=>{
 const deferred=h=>{let resolve;const input=h.get('importFile');Object.defineProperty(input,'files',{configurable:true,value:[{size:100,text:()=>new Promise(r=>resolve=r)}]});const promise=input.onchange({target:input});return {promise,resolve:()=>resolve(h.run('MisuzuStore.encode({...state,chapter:2})'))}};
 // Exact independent-review repro: old A must not prompt after confirmed newer B.
 const h=createHarness(),old=deferred(h);await h.importRaw(h.run('MisuzuStore.encode({...state,chapter:7})'));assert.equal(h.state().chapter,7);const durable=h.storage.getItem(KEY);old.resolve();await old.promise;await h.settle();assert.equal(h.state().chapter,7);assert.equal(h.confirmations.length,1);assert.equal(h.storage.getItem(KEY),durable);
 const cancelled=createHarness(),a=deferred(cancelled);cancelled.setConfirm(false);await cancelled.importRaw(cancelled.run('MisuzuStore.encode({...state,chapter:7})'));a.resolve();await a.promise;assert.equal(cancelled.state().chapter,0);assert.equal(cancelled.confirmations.length,1);
 const actions=[['picker cancel',h=>h.emit('importFile','cancel')],['empty selection',h=>{const i=h.get('importFile');Object.defineProperty(i,'files',{configurable:true,value:[]});return i.onchange({target:i})}],['close modal',h=>h.run('closeModal()')],['other modal',h=>h.click('library')],['new picker',h=>h.click('import')],['home',h=>h.click('home')],['chapter navigation',h=>h.run('go(3)')],['pagehide',h=>h.windowEvent('pagehide')],['blur',h=>h.windowEvent('blur')],['hidden',h=>h.visibility(true)]];
 for(const [name,action] of actions){const t=createHarness();t.click('settings');const d=deferred(t);await action(t);const before=t.state();d.resolve();await d.promise;await t.settle();assert.deepEqual(t.state(),before,name);assert.equal(t.confirmations.length,0,name);assert.equal(t.get('importFile').value,'',name)}
});
await test('Confirmed restore waiting for Web Lock cancels on departure without closing newer modal',async()=>{
 for(const mode of ['pagehide','close','modal','escape','picker cancel']){
  const pending=[],lock={request(n,o,fn){return new Promise(resolve=>pending.push(()=>resolve(fn())))}};
  const h=createHarness({lockManager:lock});h.click('settings');const p=h.importRaw(h.run('MisuzuStore.encode({...state,chapter:7})'));for(let i=0;i<20;i++)await Promise.resolve();assert.equal(h.run('busy'),true,mode);
  if(mode==='pagehide')h.windowEvent('pagehide');else if(mode==='close')h.run('closeModal()');else if(mode==='modal')h.click('library');else if(mode==='escape')h.windowEvent('keydown',{key:'Escape',repeat:false});else h.emit('importFile','cancel');
  assert.equal(h.run('busy'),false,mode);for(let i=0;i<100;i++){await Promise.resolve();pending.shift()?.()}await p;await h.settle();assert.equal(h.state().chapter,0,mode);if(h.storage.getItem(KEY))assert.equal(JSON.parse(h.storage.getItem(KEY)).state.chapter,0,mode);if(mode==='modal'){assert.equal(h.run('modalOpen'),true);assert.match(h.get('panel').textContent,/詩の図鑑/)}
 }
});
await test('Held Escape pauses or dismisses once until a distinct new press',()=>{
 const h=createHarness();h.click('start');h.run('cancelDeferred()');h.windowEvent('keydown',{key:'Escape',repeat:false});assert.equal(h.run('paused'),true);for(let i=0;i<12;i++)h.windowEvent('keydown',{key:'Escape',repeat:true});assert.equal(h.run('paused'),true);h.windowEvent('keyup',{key:'Escape'});h.windowEvent('keydown',{key:'Escape',repeat:false});assert.equal(h.run('paused'),false);h.windowEvent('keydown',{key:'Escape',repeat:true});assert.equal(h.run('paused'),false);h.click('library');h.windowEvent('keydown',{key:'Escape',repeat:false});assert.equal(h.run('modalOpen'),false);h.windowEvent('keydown',{key:'Escape',repeat:true});assert.equal(h.run('paused'),false);
});
await test('Invalid whole imports leave memory + durable bytes untouched',async()=>{
 const h=createHarness();h.run('collect(1)');await h.settle();const before=h.state(),raw=h.storage.getItem(KEY);const make=s=>JSON.stringify({format:'misuzu-v1',state:s});
 const invalid=['{',JSON.stringify({format:'bad',state:before}),make({...before,seen:[1,1]}),make({...before,favorites:[517]}),make({...before,x:Infinity}),make({...before,chapter:12}),make({...before,notes:{1:'<script>'}}),make({...before,eventChoices:{0:2},events:[0]}),make({...before,waypoint:0}),make({...before,events:[0],eventChoices:{}}),make({...before,notes:JSON.parse('{"__proto__":"風"}')}),make({...before,seen:{}}),make({...before,sound:'true'})];
 for(const value of invalid){await h.importRaw(value);assert.deepEqual(h.state(),before);assert.equal(h.storage.getItem(KEY),raw)}
});
await test('Corruption preserved, confirmed recovery backs up raw; quota/reset failures retain state',async()=>{
 const storage=new MemoryStorage({[KEY]:'{broken original'}),h=createHarness({storage});assert.match(h.status(),/壊れて/);h.run('collect(2)');await h.settle();assert.equal(storage.getItem(KEY),'{broken original');const valid=h.run('MisuzuStore.encode(state)');await h.importRaw(valid);assert.equal(JSON.parse(storage.getItem(KEY+':backup')).raw,'{broken original');assert.deepEqual(createHarness({storage}).state(),h.state());
 storage.failWrite=true;h.run('collect(3)');await h.settle();const before=h.state();assert.match(h.status(),/容量/);h.click('settings');h.click('reset');await h.settle();assert.deepEqual(h.state(),before);storage.failWrite=false;h.click('retrySave');await h.settle();assert.match(h.status(),/保存済み/);assert.deepEqual(createHarness({storage}).state(),before);
});
await test('Failed corrupt restore never enables automatic overwrite after quota recovery',async()=>{
 const storage=new MemoryStorage({[KEY]:'{future or corrupt'}),h=createHarness({storage});h.run('collect(4)');await h.settle();const raw=h.run('MisuzuStore.encode(state)');storage.failWrite=true;await h.importRaw(raw);assert.equal(storage.getItem(KEY),'{future or corrupt');storage.failWrite=false;h.run('MisuzuStore.retry();save()');await h.settle();assert.equal(storage.getItem(KEY),'{future or corrupt');await h.importRaw(raw);assert.equal(JSON.parse(storage.getItem(KEY+':backup')).raw,'{future or corrupt');assert.deepEqual(createHarness({storage}).state().seen,[4]);
});
await test('Movement preserves 170 units/second at 30/60/120Hz; stale restore is cancelled',async()=>{
 for(const fps of [30,60,120]){const h=createHarness();h.click('start');h.run('cancelDeferred();autoCooldown=1e9');h.windowEvent('keydown',{key:'s'});for(let i=0;i<fps;i++)h.frame(1000/fps);assert.ok(Math.abs(h.state().y-340)<0.01)}
 let release;const lock={request(n,o,f){return new Promise(resolve=>{release=()=>resolve(f())})}};
 const h=createHarness({lockManager:lock});const original=h.state(),incoming={...original,chapter:3};const p=h.importRaw(JSON.stringify({format:'misuzu-v1',state:incoming}));for(let i=0;i<10;i++)await Promise.resolve();assert.equal(h.run('busy'),true);h.run('state.x=601');release();await p;assert.equal(h.state().chapter,0);assert.equal(h.state().x,601);assert.equal(h.storage.getItem(KEY),null);
});
await test('Storage refusal/no Web Locks use no-write memory; two tab compare under Web Locks',async()=>{
 const storage=new MemoryStorage();storage.failRead=true;const h=createHarness({storage});h.run('collect(3)');await h.settle();assert.equal(h.state().seen[0],3);assert.equal(storage.writes,0);assert.match(h.status(),/保存が利用できません/);
 const s=new MemoryStorage(),a=createHarness({storage:s,lockManager:null});a.run('collect(2)');await a.settle();assert.equal(s.writes,0);assert.match(a.status(),/非対応/);const raw=a.run('MisuzuStore.encode({...state,chapter:3,x:400})');await a.importRaw(raw);assert.equal(a.state().chapter,3);assert.equal(s.writes,0);
 const shared=new MemoryStorage(),lock=locks(),t1=createHarness({storage:shared,lockManager:lock}),t2=createHarness({storage:shared,lockManager:lock});t1.run('collect(1)');t2.run('collect(2)');await t1.settle();await t2.settle();assert.match(t2.status(),/別タブ/);assert.deepEqual(createHarness({storage:shared}).state().seen,[1]);assert.deepEqual(t2.state().seen,[2]);await t2.importRaw(raw);assert.deepEqual(t2.state().seen,[2]);
});
await test('Pause/blur/hidden/modal/repeated keys, field focus, pointer capture and deferred events',async()=>{
 const h=createHarness();h.click('start');h.run('cancelDeferred();autoCooldown=1e9');h.windowEvent('keydown',{key:'ArrowDown'});h.frame();assert.ok(h.state().y>170);h.windowEvent('blur');const stop=h.state();for(let i=0;i<20;i++)h.frame();assert.equal(h.state().y,stop.y);assert.equal(h.run('target'),null);h.click('resume');h.frame();assert.equal(h.state().y,stop.y);
 h.emit('world','pointerdown',{clientX:640,clientY:600});h.frame();h.visibility(true);const hidden=h.state();h.frame(2000);h.visibility(false);h.frame();assert.equal(h.state().y,hidden.y);assert.equal(h.run('paused'),true);h.click('resume');h.click('library');h.windowEvent('keydown',{key:'w',target:h.get('search')});h.frame();assert.equal(h.state().y,hidden.y);h.windowEvent('keydown',{key:'Escape'});assert.equal(h.run('modalOpen'),false);
 h.windowEvent('keydown',{key:'ArrowDown',target:h.get('chapterSelect')});h.frame();assert.equal(h.state().y,hidden.y);
 const pad=h.document.querySelector('[data-key="ArrowDown"]');h.emit(pad,'pointerdown',{pointerId:1});h.frame();h.emit(pad,'lostpointercapture');const stopped=h.state().y;h.frame();assert.equal(h.state().y,stopped);
 h.run('state.x=600;state.y=260');h.frame();h.windowEvent('keydown',{key:'Enter',repeat:true});assert.equal(h.run('modalOpen'),false);h.windowEvent('keydown',{key:'Enter',repeat:false});assert.equal(h.run('modalOpen'),true);h.windowEvent('keyup',{key:'Enter'});h.windowEvent('keydown',{key:'Escape'});assert.equal(h.run('modalOpen'),false);assert.equal(h.run('target'),null);
 const fresh=createHarness();fresh.click('start');fresh.windowEvent('blur');fresh.advance(1000);assert.equal(fresh.run('modalOpen'),false);await h.settle();
});
await test('Interrupted canvas/pad pointers cancel targets and require explicit resume',()=>{
 const h=createHarness();h.click('start');h.run('cancelDeferred();autoCooldown=1e9');h.frame(16);h.emit('world','pointerdown',{clientX:640,clientY:650});h.frame(16);const before=h.state().y;assert.notEqual(h.run('target'),null);h.windowEvent('pointercancel',{target:h.get('world')});h.frame(50);assert.equal(h.state().y,before);assert.equal(h.run('target'),null);assert.equal(h.run('paused'),true);h.click('resume');h.frame(50);assert.equal(h.state().y,before);
 const pad=h.document.querySelector('[data-key="ArrowDown"]');h.emit(pad,'pointerdown',{pointerId:1});h.frame(16);const moved=h.state().y;assert.ok(moved>before);h.emit(pad,'pointercancel',{pointerId:1});h.windowEvent('pointercancel',{target:pad});h.frame(50);assert.equal(h.state().y,moved);assert.equal(h.run('paused'),true);h.click('resume');h.frame(50);assert.equal(h.state().y,moved);
});
await test('Real Canvas rendering all chapters and all original SVGs (not Chrome)',async()=>{
 const h=createHarness();await new Promise(r=>setTimeout(r,60));for(const im of h.images)assert.ok(im.complete&&im.width>0);const out=process.env.MISUZU_QA_DIR;if(out)fs.mkdirSync(out,{recursive:true});
 const {createCanvas}=require('@napi-rs/canvas'),sheet=createCanvas(1280,1080),ctx=sheet.getContext('2d');for(let ch=0;ch<12;ch++){h.run(`go(${ch});cancelDeferred();autoCooldown=1e9`);h.frame(100);const native=h.realCanvases.get('world');ctx.drawImage(native,(ch%4)*320,Math.floor(ch/4)*360,320,180);h.run('state.y=1700');h.frame(16);ctx.drawImage(native,(ch%4)*320,Math.floor(ch/4)*360+180,320,180);assert.ok(h.canvasPNG().length>10000)}if(out){fs.writeFileSync(path.join(out,'misuzu-all-chapters-native-canvas.png'),sheet.toBuffer('image/png'));h.run('go(0);cancelDeferred()');h.frame();fs.writeFileSync(path.join(out,'misuzu-chapter1-native-canvas.png'),h.canvasPNG());const portraits=createCanvas(960,500),pc=portraits.getContext('2d');pc.fillStyle='#f5f1e5';pc.fillRect(0,0,960,500);for(let i=0;i<h.images.length;i++){const im=h.images[i],height=390,w=height*im.width/im.height;pc.drawImage(im,i*240+(240-w)/2,55,w,height)}fs.writeFileSync(path.join(out,'misuzu-original-characters-native.png'),portraits.toBuffer('image/png'))}
});
await test('Return link targets the browser collection in the same browsing context',()=>{
 const h=createHarness(),link=h.get('zatuplayReturn');assert.equal(link.getAttribute('href'),'../../browser/');assert.notEqual(link.getAttribute('target'),'_blank');
 assert.equal(new URL(link.getAttribute('href'),'https://poetsakihana.github.io/game-no-mori/zatuplay/games/misuzu-komichi/?v=0.2-web.2').href,'https://poetsakihana.github.io/game-no-mori/zatuplay/browser/');
});
await test('Versioned assets, safe external references and exact publication mirror checksums',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(!html.includes('NativeFiles'));for(const m of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))([^" ]*)"/g))assert.equal(m[2],'?v=0.2-web.2');
 const manifest=fs.readFileSync(path.join(root,'CHECKSUMS.sha256'),'utf8').trim().split('\n');for(const line of manifest){const [hash,file]=line.split('  ');const bytes=fs.readFileSync(path.join(root,file));assert.equal(sha(bytes),hash,file);assert.deepEqual(bytes,fs.readFileSync(path.resolve(root,'../../../../zatuplay/games/misuzu-komichi',file)))}
});
console.log(`PASS: ${tests.length} suites. DOM/storage/timer models + native Canvas; no public Chrome claim.`);
})().catch(e=>{console.error(e);process.exitCode=1});
