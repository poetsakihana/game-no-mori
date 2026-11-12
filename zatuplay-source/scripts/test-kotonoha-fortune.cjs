'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createHarness,MemoryStorage,locks,KEY,root}=require('./kotonoha-fortune-harness.cjs');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
let passed=0,fixture;
async function test(name,fn){await fn();console.log(`PASS ${++passed}: ${name}`);}
function inputFile(h,text){const n=h.get('restore');Object.defineProperty(n,'files',{configurable:true,value:[{size:Buffer.byteLength(text),text:async()=>text}]});n.value='same-file.json';return n;}
async function restore(h,text){inputFile(h,text);await h.run("restoreFile(document.getElementById('restore'))");await h.settle();}
function createReading(h,m=0){h.run('newSession()');h.input('question','架空の相談：明日の散歩を楽しみたい');h.get('method').selectedIndex=m;h.click('draw');}
(async()=>{
await test('all original content: 10 methods, 20 themes, 5 angles, 4 guides, 500 oracles, 100 arts, 115 decks, 11,114 cards',()=>{
 const h=createHarness();assert.equal(h.run('methods.length'),10);assert.equal(h.run('themes.length'),20);assert.equal(h.run('angles.length'),5);assert.equal(h.run('fortuneGuides.length'),4);assert.equal(h.run('oracleTypes.length'),500);
 assert.equal(h.run('arts.length'),100);assert.equal(h.run("arts.filter(a=>a.status==='basic').length"),11);assert.equal(h.run("arts.filter(a=>a.status==='work').length"),29);assert.equal(h.run("arts.filter(a=>a.status==='journal').length"),60);
 assert.equal(h.run('commercialDecks.length'),115);assert.equal(h.run('galleryEntries().length'),11114);assert.equal(h.run('new Set(galleryEntries().map(c=>c.id)).size'),11114);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'content-manifest.json')));
 for(const [name,expected]of Object.entries(manifest.tableSha256))assert.equal(sha(h.run(`JSON.stringify(${name})`)),expected,name);
 h.run("view('catalog')");assert.equal(h.get('count').textContent,'1000件のメニュー');assert.equal(h.document.querySelectorAll('[data-pick]').length,60);
 h.run('limit=1100;catalog()');assert.equal(h.document.querySelectorAll('[data-pick]').length,1000);
});
await test('all 11,114 original SVG cards are generated, named and safe; real SVG decode samples',async()=>{
 const h=createHarness();const rows=JSON.parse(h.run('JSON.stringify(galleryEntries().map(c=>({id:c.id,url:cardImage(c)})))'));
 for(const r of rows){const svg=decodeURIComponent(r.url.split(',')[1]);assert(svg.startsWith('<svg'));assert(svg.includes('</svg>'));assert(!svg.includes('undefined'));assert(!/<script|onload=|<foreignObject/i.test(svg));}
 const {loadImage,createCanvas}=require('@napi-rs/canvas');
 for(const index of [0,21,22,77,78,113,114,4000,11113]){const im=await loadImage(Buffer.from(decodeURIComponent(rows[index].url.split(',')[1])));assert.equal(im.width,300);assert.equal(im.height,500);const c=createCanvas(300,500);c.getContext('2d').drawImage(im,0,0);assert(c.toBuffer('image/png').length>2000);}
});
await test('title → guide → topic DOM clicks, all ten readings, no duplicate rapid draw, deepening, profile and reload',async()=>{
 const h=createHarness();h.click(h.document.querySelector('.title-screen'));h.click(h.document.querySelector('[data-guide="sakura"]'));h.click(h.document.querySelector('[data-topic="0"]'));assert.equal(h.ui().screen,'home');
 h.run("view('profile')");h.input('birth','2000-02-29');h.input('name','架空のテスト利用者');h.run('saveProfile()');await h.settle();
 for(let m=0;m<10;m++){createReading(h,m);h.click('draw');assert.equal(h.state().sessions[0].entries.length,1);assert.equal(h.run('ritualBusy'),true);h.run('finishRitual()');assert(!h.get('result').classList.contains('hidden'));await h.settle();}
 assert.equal(h.state().sessions.length,10);h.input('additional','架空の追記：雨の日はどう過ごそう');h.click('draw');h.run('finishRitual()');await h.settle();assert.equal(h.state().sessions[0].entries.length,2);assert.equal(h.state().sessions[0].entries[1].accumulated.length,2);
 const load=createHarness({storage:h.storage});assert.deepEqual(load.state(),h.state());assert.equal(load.ui().screen,'home');assert.equal(load.ui().selectedGuide,'sakura');assert(!load.get('result').classList.contains('hidden'));fixture=h.state();
});
await test('all 100 art modes execute their declared scope with original card counts and durable results',async()=>{
 const h=createHarness();const all=JSON.parse(h.run('JSON.stringify(arts)'));
 const counts={tarot:3,oracle:1,lenormand:3,tableau:36,playing:3,angel:1,fairy:1,number:1,compatibility:2,dice:2,fortune:1,journal:0};
 for(const a of all){h.run(`selectArt('${a.id}')`);h.input('artQuestion','架空の相談 '+a.name);h.input('artObservation','架空の観察：穏やかな気分');h.input('artAction','架空の行動：散歩する');h.input('artBirth','2000-02-29');h.input('artPartner','1999-06-12');h.click('artSubmit');h.run('finishRitual()');await h.settle();
  const s=h.state().artSessions[0];assert.equal(s.artId,a.id);assert.equal(s.entries[0].cards.length,counts[a.mode]);assert(!h.get('artResult').classList.contains('hidden'));
  if(['tarot','lenormand','tableau','playing'].includes(a.mode))assert.equal(new Set(s.entries[0].cards.map(c=>c.name)).size,counts[a.mode]);
 }
 const loaded=createHarness({storage:h.storage});assert.equal(loaded.state().artSessions.length,100);assert.equal(loaded.ui().selectedArt,'art-100');assert(!loaded.get('artResult').classList.contains('hidden'));
 h.input('artQuestion','架空の追加相談');h.input('artObservation','架空の追加観察');h.click('artSubmit');await h.settle();assert.equal(h.state().artSessions[0].entries.length,2);
});
await test('all 115 commercial deck links open the correct manual journal without selling or external navigation',async()=>{
 const h=createHarness();h.run("view('decks')");const list=[...h.document.querySelectorAll('[data-commercial]')];assert.equal(list.length,115);
 for(const b of list){h.click(b);assert.equal(h.ui().screen,'manual');assert(h.get('deck').value);}
 h.input('manualQuestion','架空の相談：カードで気持ちを整理する');h.input('cardname','架空のカード');h.input('reflection','架空の解釈：一歩ずつ進む');h.run('manualSave()');await h.settle();assert.equal(h.state().journals.length,1);
 h.input('manualQuestion','架空の追加相談');h.input('cardname','架空の別カード');h.input('reflection','架空の解釈：休息する');h.run('manualSave()');await h.settle();assert.equal(h.state().journals[0].round,2);assert.equal(h.state().journals[0].questions.length,2);
 const load=createHarness({storage:h.storage});assert.equal(load.ui().manualActive,h.ui().manualActive);assert.equal(load.state().journals.length,2);
});
await test('every field draft, selected method/filter, profile edits and current art survives reload',async()=>{
 const h=createHarness();h.run("chooseGuide('aoba');selectArt('art-056')");
 for(const id of ['question','additional','name','place','zone','deck','cardname','manualQuestion','reflection','artQuestion','artObservation','artAction','artsSearch','search','deckSearch','gallerySearch'])h.input(id,'架空の入力途中 '+id);
 h.input('artBirth','2000-01-01');h.input('artPartner','1999-01-01');h.input('birth','2001-01-01');h.input('time','12:30');
 h.input('method','オリジナルオラクル','change');h.input('oracleSearch','桜');h.input('oracleType','oracle-020','change');h.input('galleryKind','oracle','change');h.input('galleryOracle','oracle-500','change');h.input('artsCategory','5','change');h.input('artsStatus','work','change');
 await h.settle();const prior=h.ui();const load=createHarness({storage:h.storage});assert.deepEqual(load.ui().fields,prior.fields);assert.equal(load.ui().selectedArt,'art-056');assert.equal(load.ui().selectedGuide,'aoba');
});
await test('ritual phases, disabled repeated clicks, skip/Escape, interrupted reload never rerolls; hidden/blur stop timers',async()=>{
 const h=createHarness({reduced:false});createReading(h,1);const cards=h.state().sessions[0].entries[0].cards;
 h.click('ritualNext');assert.equal(h.run('ritualPhase'),1);h.click('ritualNext');assert.equal(h.run('ritualPhase'),1);h.advance(1300);h.click('ritualNext');h.advance(950);h.click('ritualNext');h.advance(950);h.click('ritualNext');h.advance(2000);assert(!h.get('ritualDone').classList.contains('hidden'));h.click('ritualDone');assert(!h.run('ritualBusy'));
 createReading(h,1);await h.settle();const before=h.state().sessions[0].entries[0].cards;const load=createHarness({storage:h.storage});assert(!load.run('ritualBusy'));assert.deepEqual(load.state().sessions[0].entries[0].cards,before);assert(!load.get('result').classList.contains('hidden'));
 h.click('ritualNext');h.visibility(true);await h.settle();assert(!h.run('ritualBusy'));assert.equal(h.run('ritualTimers.length'),0);h.advance(10000);assert(!h.run('ritualBusy'));
 createReading(h);h.emit(h.document,'keydown',{key:'Escape'});assert(!h.run('ritualBusy'));
 createReading(h);h.windowEvent('blur');assert(!h.run('ritualBusy'));assert.equal(h.run('ritualTimers.length'),0);
});
await test('gallery pagination/filter/dialog/front-back/next/previous and original art/deck filters',()=>{
 const h=createHarness();h.run("view('gallery')");assert.equal(h.document.querySelectorAll('[data-preview]').length,60);h.click('galleryMore');assert.equal(h.document.querySelectorAll('[data-preview]').length,120);
 h.input('galleryKind','lenormand','change');assert.equal(h.document.querySelectorAll('[data-preview]').length,36);h.click(h.document.querySelector('[data-preview="0"]'));assert.equal(h.get('previewName').textContent,'騎士');h.run('flipPreview()');assert(h.get('previewFlip').classList.contains('is-back'));h.run('stepPreview(-1)');assert.equal(h.get('previewName').textContent,'十字架');h.get('cardPreview').close();
 h.input('gallerySearch','存在しない架空カード');assert.equal(h.document.querySelectorAll('[data-preview]').length,0);h.run("view('allarts')");h.input('artsStatus','basic','change');assert.equal(h.document.querySelectorAll('[data-art]').length,11);
 h.run("view('decks')");h.input('deckKind','lenormand','change');assert.equal(h.document.querySelectorAll('[data-commercial]').length,25);
});
await test('strict birthday validation rejects impossible dates, future dates and incomplete input without changing data',async()=>{
 const h=createHarness();assert.equal(h.run("validArtDate('2000-02-29')"),true);for(const d of ['2001-02-29','2024-02-31','2099-01-01','0000-01-01','bad'])assert.equal(h.run(`validArtDate('${d}')`),false);
 createReading(h,3);assert.equal(h.state().sessions.length,0);assert.match(h.get('error').textContent,/生年月日/);
 h.run("selectArt('art-090')");h.input('artQuestion','架空の相談');h.click('artSubmit');assert.equal(h.state().artSessions.length,0);
 h.input('birth','2001-02-29');h.run('saveProfile()');assert.equal(h.state().profile.birth,undefined);h.input('birth','2000-02-29');h.run('saveProfile()');await h.settle();assert.equal(h.state().profile.birth,'2000-02-29');assert.match(h.get('saved').textContent,/保存状況/);assert(!h.get('saved').textContent.includes('実在する'));
});
await test('valid export, browser + original APK backup import, cancellation and same-file reselection',async()=>{
 const h=createHarness();createReading(h);h.run('finishRitual()');await h.settle();h.run('backup()');assert.equal(h.downloads.length,1);const exported=await h.downloads[0].text();assert.equal(JSON.parse(exported).app,'kotonoha-fortune');h.advance(1000);assert.equal(h.revoked(),1);
 const prior=h.storage.getItem(KEY);h.setConfirm(false);await restore(h,exported);assert.equal(h.get('restore').value,'');assert.equal(h.storage.getItem(KEY),prior);
 h.setConfirm(true);await restore(h,JSON.stringify({version:1,...fixture}));assert.equal(h.state().sessions.length,10);assert.equal(h.get('restore').value,'');
 await restore(h,exported);assert.equal(h.state().sessions.length,1);assert.equal(h.get('restore').value,'');
});
await test('malformed/oversized/unsupported backup is rejected without replacing storage or user input',async()=>{
 const h=createHarness();createReading(h);h.run('finishRitual()');await h.settle();const original=h.storage.getItem(KEY);const state=h.state();
 for(const bad of ['{','[]',JSON.stringify({version:99,...fixture}),JSON.stringify({version:1,...fixture,journals:[{}]}),JSON.stringify({version:1,...fixture,artSessions:[{id:'x',artId:'missing',title:'x',entries:[]}]}),JSON.stringify({version:1,...fixture,sessions:[{...fixture.sessions[0],entries:[{...fixture.sessions[0].entries[0],cards:[{name:3}]}]}]})]){
  await restore(h,bad);assert.deepEqual(h.state(),state);assert.equal(h.storage.getItem(KEY),original);assert.equal(h.get('restore').value,'');
 }
 const n=inputFile(h,'{}');Object.defineProperty(n,'files',{configurable:true,value:[{size:9*1024*1024,text:async()=>{throw Error('should not read');}}]});await h.run("restoreFile(document.getElementById('restore'))");assert.equal(h.storage.getItem(KEY),original);
});
await test('broken save is preserved on play/pagehide/retry/cancel; original data export and confirmed import recovery',async()=>{
 for(const raw of ['{broken','false','[]','{}',JSON.stringify({app:'kotonoha-fortune',schema:99})]){
  const st=new MemoryStorage({[KEY]:raw}),h=createHarness({storage:st});assert.match(h.status(),/上書きせず/);createReading(h);h.run('finishRitual()');h.windowEvent('pagehide');await h.settle();assert.equal(st.getItem(KEY),raw);
  h.run('KotonohaBrowser.exportOriginal()');assert.equal(await h.downloads[0].text(),raw);h.setConfirm(false);await h.run('erase()');assert.equal(st.getItem(KEY),raw);h.setConfirm(true);await restore(h,JSON.stringify({version:1,...fixture}));assert.equal(h.state().sessions.length,10);assert.notEqual(st.getItem(KEY),raw);
 }
});
await test('quota/denied storage preserves original save, current data and cleared journal input; retry is truthful',async()=>{
 const h=createHarness();createReading(h);h.run('finishRitual()');await h.settle();const before=h.storage.getItem(KEY);h.storage.failWrite=true;
 h.run("view('manual')");h.input('deck','架空のデッキ');h.input('cardname','架空のカード');h.input('manualQuestion','架空の相談');h.input('reflection','架空のメモ');h.run('manualSave()');await h.settle();
 assert.equal(h.storage.getItem(KEY),before);assert.equal(h.state().journals.length,1);assert.equal(h.get('manualQuestion').value,'架空の相談');assert.equal(h.get('cardname').value,'架空のカード');assert.equal(h.get('reflection').value,'架空のメモ');assert.match(h.status(),/容量/);assert.equal(h.get('browserStatus').dataset.state,'error');h.run('manualSave()');await h.settle();assert.equal(h.state().journals.length,1,'same failed submit must retry, not append');
 const current=h.state();await restore(h,JSON.stringify({version:1,...fixture}));assert.deepEqual(h.state(),current);await h.run('erase()');assert.deepEqual(h.state(),current);assert.equal(h.storage.getItem(KEY),before);
 h.storage.failWrite=false;await h.run('KotonohaBrowser.retry()');assert.match(h.status(),/保存しました/);assert.equal(JSON.parse(h.storage.getItem(KEY)).data.journals.length,1);await h.settle();assert.equal(h.get('manualQuestion').value,'');
 const denied=createHarness({deniedGetter:true});createReading(denied);denied.run('finishRitual()');await denied.settle();assert.match(denied.status(),/利用できません/);assert.equal(denied.state().sessions.length,1);
});
await test('two tabs use one lock; first writer wins, stale draft stays in memory and never overwrites newer data',async()=>{
 const st=new MemoryStorage(),lm=locks(),a=createHarness({storage:st,lockManager:lm}),b=createHarness({storage:st,lockManager:lm});
 a.input('question','架空のタブA');b.input('question','架空のタブB');await Promise.all([a.settle(),b.settle()]);assert.equal(JSON.parse(st.getItem(KEY)).ui.fields.question,'架空のタブA');assert.match(b.status(),/別のタブ/);assert.equal(b.get('question').value,'架空のタブB');const before=st.getItem(KEY);await b.run('KotonohaBrowser.retry()');assert.equal(st.getItem(KEY),before);
 b.windowEvent('storage',{key:KEY,newValue:before});b.run('backup()');assert.equal(JSON.parse(await b.downloads[0].text()).ui.fields.question,'架空のタブB');
 const legacy='untouched legacy';st.setItem('kotonoha-v1',legacy);st.setItem('unrelated-game','other');a.setConfirm(true);await a.run('erase()');assert.equal(st.getItem('kotonoha-v1'),legacy);assert.equal(st.getItem('unrelated-game'),'other');assert.equal(a.state().sessions.length,0);
});
await test('editing while confirmed restore/delete waits for the lock cancels replacement, preserving new draft',async()=>{
 for(const op of ['restore','erase']){
  let gate=null,release;const base=locks();const lm={request(name,options,fn){return base.request(name,options,async()=>{if(gate)await gate;return fn();});}};
  const h=createHarness({lockManager:lm});createReading(h);h.run('finishRitual()');await h.settle();const before=h.state();
  gate=new Promise(r=>release=r);
  let job;if(op==='restore'){inputFile(h,JSON.stringify({version:1,...fixture}));job=h.run("restoreFile(document.getElementById('restore'))");}else job=h.run('erase()');
  for(let i=0;i<20;i++)await Promise.resolve();
  h.input('additional','架空の確認後の新しい入力');release();gate=null;await job;await h.settle();assert.deepEqual(h.state(),before);assert.equal(h.get('additional').value,'架空の確認後の新しい入力');
 }
});
await test('Web Locks unavailable does not perform unsafe CAS; original save survives and memory play/export works',async()=>{
 const st=new MemoryStorage(),h=createHarness({storage:st,lockManager:null,secure:false});createReading(h);h.run('finishRitual()');await h.settle();assert.equal(st.writes,0);assert.equal(h.state().sessions.length,1);assert.match(h.status(),/Web Locks/);h.run('backup()');assert.equal(JSON.parse(await h.downloads[0].text()).data.sessions.length,1);
});
await test('escaping of hostile imported text, data schema uniqueness/limits, no external scripts or communication',async()=>{
 const h=createHarness(),d=JSON.parse(JSON.stringify(fixture));d.sessions[0].question='<img src=x onerror=alert(1)>';await restore(h,JSON.stringify({version:1,...d}));h.click(h.document.querySelector('[data-session]'));assert(!h.get('result').querySelector('img'));assert(h.get('result').textContent.includes('<img src=x onerror=alert(1)>'));
 for(const v of [{...fixture,sessions:[fixture.sessions[0],fixture.sessions[0]]},{...fixture,profile:{birth:'2001-02-29'}},{...fixture,journals:[{deck:'a',card:'b',note:'c',date:'invalid'}]}])assert.throws(()=>h.run(`KotonohaStore.normalizeData(${JSON.stringify(v)})`));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes("connect-src 'none'"));assert(!html.includes('android.js'));for(const f of ['app.js','arts.js','gallery.js','storage.js','browser.js'])assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|https?:\/\/(?!www\.w3\.org)/.test(fs.readFileSync(path.join(root,f),'utf8')),f);
});
await test('source hashes, generated file checksums, exact published/source mirror and no APK signature/private paths',()=>{
 const prov=JSON.parse(fs.readFileSync(path.join(root,'provenance.json')));assert.equal(prov.apk.sha256,'581ca398ca990ea48d3425144ebb713ccf8320e3b28774ef6ffcf400fa67a1cb');
 for(const line of fs.readFileSync(path.join(root,'CHECKSUMS.sha256'),'utf8').trim().split('\n')){const [hash,file]=line.split('  ');assert.equal(sha(fs.readFileSync(path.join(root,file))),hash,file);}
 for(const name of fs.readdirSync(root)){assert.equal(sha(fs.readFileSync(path.join(root,name))),sha(fs.readFileSync(path.resolve(root,'../../../../zatuplay/games/kotonoha-fortune',name))));assert(!/META-INF|\.apk$/.test(name));if(/\.(js|html|json|md)$/.test(name))assert(!/\/workspace\/|drive\.google\.com|privateDriveId/.test(fs.readFileSync(path.join(root,name),'utf8')),name);}
});
console.log(`\n${passed} groups passed. VM/linkedom DOM events, modeled storage/locks/timers/downloads and real native SVG decoding. Not Chrome layout, physical touch, browser download or cross-process Web Locks QA.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
