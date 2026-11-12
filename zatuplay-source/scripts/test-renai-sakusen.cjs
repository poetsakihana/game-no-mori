'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {root,KEY,harness,MemoryStorage,locks}=require('./renai-sakusen-harness.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),json=v=>JSON.parse(JSON.stringify(v));
const eq=(a,b,label)=>assert.deepEqual(json(a),json(b),label);let passed=0;
async function test(name,fn){if(process.env.RENAI_TEST_FILTER&&!name.includes(process.env.RENAI_TEST_FILTER))return;await fn();console.log('PASS '+name);passed++;}
async function choice(h,option=0){h.click(h.document.querySelectorAll('.choice')[option]);await h.settle();}
async function next(h){h.click(h.button(h.state().episode===150?'ふたりの結末へ':'次の場面へ'));await h.settle();}
async function saveSlot(h,i){h.run(`slots();saveSlot(${i})`);await h.confirm();}
async function loadSlot(h,i){h.run(`slots();loadSlot(${i})`);await h.confirm();}
function deferredImport(h){h.run('settings()');let resolve;const input=h.q('[data-import]');Object.defineProperty(input,'files',{configurable:true,value:[{size:1000,text:()=>new Promise(r=>resolve=r)}]});h.run('window.__deferredInput=document.querySelector("[data-import]")');const pending=h.run('importSave(__deferredInput)');return {resolve,pending,input};}
function delayedLocks(){const queue=[];return {queue,request(n,o,fn){return new Promise((resolve,reject)=>queue.push(()=>Promise.resolve().then(fn).then(resolve,reject)));}};}
(async()=>{
await test('Original 11-file provenance, eight untouched assets, six decoded sheets and all 24 portrait positions',async()=>{
 const p=JSON.parse(fs.readFileSync(path.join(root,'provenance.json')));assert.equal(p.originalFiles.length,11);assert.equal(p.originalFiles.reduce((n,f)=>n+f.bytes,0),16669754);assert.equal(p.apkSha256,'b82d0687c95776c196ceeda78ca1544e5f040b1001f215a27a176dad7f280154');assert.equal(p.unchangedFiles.length,8);assert.equal(sha(p.originalFiles.map(f=>'assets/'+f.path+'\t'+f.bytes+'\t'+f.sha256+'\n').join('')),p.originalAssetManifestSha256);
 for(const f of p.unchangedFiles){const bytes=fs.readFileSync(path.join(root,f.path));assert.equal(bytes.length,f.bytes);assert.equal(sha(bytes),f.sha256,f.path);}
 const decoded=require('node:child_process').spawnSync('python3',['-c',"from PIL import Image; from pathlib import Path; import sys; files=list(Path(sys.argv[1]).glob('*.png')); assert len(files)==6; [(lambda im: (im.load(), im.verify() if False else None))(Image.open(f)) for f in files]; print('decoded 6 original PNGs')",path.join(root,'assets')],{encoding:'utf8'});assert.equal(decoded.status,0,decoded.stderr);assert(decoded.stdout.includes('decoded 6'));
 const h=harness();h.run('roster()');assert.equal(h.document.querySelectorAll('.card').length,24);for(let i=0;i<24;i++){h.run(`profile(${i})`);const im=h.q('.profile [role=img]');assert.equal(im.getAttribute('aria-label'),h.run(`CAST[${i}].name`)+'のイラスト');assert(im.getAttribute('style').includes(i<4?'cast.png':`cast-${Math.floor(i/4)}.png`));assert(im.getAttribute('style').includes(`${i%4*100/3}%`));}
 for(const filter of ['m','f']){h.run(`closeModal();roster('${filter}')`);assert.equal(h.document.querySelectorAll('.card').length,12);}h.run("roster('new')");assert.equal(h.document.querySelectorAll('.card').length,20);
});
await test('21,600 scene variants and original engine function hashes match an independent APK oracle',()=>{
 const h=harness(),manifest=JSON.parse(fs.readFileSync(path.join(root,'content-manifest.json'))),hash=crypto.createHash('sha256');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');for(const f of manifest.originalEngineFunctions)assert.equal(sha(app.match(new RegExp('^function '+f.name+'\\([^\\n]+','m'))[0]),f.sha256);
 let branches=0;for(let target=0;target<24;target++)for(let track=0;track<6;track++)for(let ep=0;ep<150;ep++){
 const raw=h.run(`JSON.stringify(sceneFor({...fresh(CAST[${target}].gender==='m'?1:0,'テスト',${target},false,123),episode:${ep},currentTrack:${track}}))`),e=JSON.parse(raw);hash.update(raw+'\n');assert.equal(e.choices.length,2);assert.equal(e.traits.length,2);assert(e.choices.every(Boolean));assert(e.routes.every(n=>n>=0&&n<6));if(e.kind==='branch'){branches++;assert.notEqual(e.support,target);}}
 assert.equal(branches,51*24*6);assert.equal(hash.digest('hex'),manifest.sceneVariantsSha256);
});
await test('192 full 150-choice traces / 28,800 choices, replies, stats and endings equal the original APK oracle',()=>{
 const h=harness(),manifest=JSON.parse(fs.readFileSync(path.join(root,'content-manifest.json'))),hash=crypto.createHash('sha256');let count=0;
 for(let target=0;target<24;target++)for(const twin of [false,true])for(let policy=0;policy<4;policy++){
 h.run(`state=fresh(CAST[${target}].gender==='m'?1:0,'テスト',${target},${twin},123)`);
 for(let ep=0;ep<150;ep++){const option=policy===0?0:policy===1?1:policy===2?ep%2:h.run('effects(state,0).love>=effects(state,1).love?0:1');h.run(`advanceChoice(state,${option})`);hash.update(h.run('JSON.stringify(state)')+'\n');count++;assert(h.run('validateState(state)!==null'));assert(h.run('utf8Size(JSON.stringify(state.log.at(-1)))<=MAX_LOG_BYTES'));}
 hash.update(h.run('getEnding(state).id')+'\n');}
 assert.equal(count,28800);assert.equal(hash.digest('hex'),manifest.originalTraceSha256);
});
await test('Independent relationship boundaries, all 100 ending classifications, six special setbacks and graduation',()=>{
 const h=harness(),seen=new Set();
 for(let target=0;target<24;target++)for(let kind=0;kind<4;kind++){
 const s={love:kind<2?65:kind===2?35:34,trust:kind<2?65:45,gap:kind<2?42:71,graduation:kind===1?1:0};h.run(`state={...fresh(CAST[${target}].gender==='m'?1:0,'境界',${target},false,1),...${JSON.stringify(s)}}`);const id=h.run('getEnding(state).id');assert.equal(id,`c${target}-${kind}`);seen.add(id);}
 for(let track=0;track<6;track++){h.run(`state={...fresh(0,'境界',1,true,1),love:80,trust:82,courage:80,gap:22,currentTrack:${track}}`);const id=h.run('getEnding(state).id');assert.equal(id,['twin-arts','twin-sports','twin-study','twin-life','twin-life','twin-life'][track]);seen.add(id);h.run('state.courage=79');assert.equal(h.run('getEnding(state).id'),'c1-0');}
 assert.equal(seen.size,100);
 for(const twin of [false,true])for(const love of [34,35,64,65,79,80])for(const trust of [44,45,64,65,81,82])for(const gap of [21,22,23,41,42,43,71,72]){
 const expected=love>=(twin?80:65)&&trust>=(twin?82:65)&&gap<=(twin?22:42)?'両思い':love>=35&&trust>=45&&gap<72?'恋の途中':'片思い';assert.equal(h.run(`relation({twin:${twin},love:${love},trust:${trust},gap:${gap}})`),expected);}
 let setbacks=0;for(let ep=0;ep<150;ep++){const e=h.run(`sceneFor({...fresh(0,'境界',1,true,1),episode:${ep}})`);for(let o=0;o<2;o++){const d=h.run(`effects({...fresh(0,'境界',1,true,1),episode:${ep}},${o})`),n=h.run(`effects({...fresh(0,'境界',1,false,1),episode:${ep}},${o})`),setback=e.kind==='base'&&[20,29,47,56,75,84].includes(e.baseIndex);assert.equal(d.gap-n.gap,setback?8:1);if(setback&&o===0)setbacks++;} }
 assert.equal(setbacks,6);for(const o of [0,1])assert.equal(h.run(`(()=>{let s={...fresh(0,'境界',1,false,1),episode:149};advanceChoice(s,${o});return s.graduation})()`),o);
});
await test('Both protagonists, all 12 random targets each, exact 8% special flag, fresh confirmation and cancel',async()=>{
 for(const hero of [0,1])for(let n=0;n<12;n++){const h=harness();h.run(`Math.random=(()=>{let a=[${(n+.1)/12},${n%2?.08:.079},.5];return()=>a.shift()})();`);await h.start(hero);assert.equal(h.state().hero,hero);assert.equal(h.state().target,h.run(`CAST.filter(c=>c.gender!==CAST[${hero}].gender)[${n}].id`));assert.equal(h.state().twin,n%2===0);assert.equal(h.state().seed,49999);}
 const h=harness();await h.start();const old=h.book(),raw=h.storage.getItem(KEY);h.run('setup();start();closeModal()');eq(h.book(),old);assert.equal(h.storage.getItem(KEY),raw);await h.start(0,'次の恋');eq(h.book().recovery.active,old.active);assert.equal(h.state().name,'次の恋');
});
await test('Ordinary DOM controls complete all 150 decisions, show a real ending once, and survive reply/ending reload',async()=>{
 const h=harness();h.run('Math.random=()=>.5');await h.start(0,'旅の記録');let common=0,branch=0;
 for(let ep=0;ep<150;ep++){
  if(h.run('sceneFor(state).kind')==='branch')branch++;else common++;
  await choice(h,ep%2);assert.equal(h.book().active.phase,'reply');assert.equal(h.state().episode,ep+1);assert.equal(h.document.querySelectorAll('.choice').length,0);
  if([0,1,75,149].includes(ep)){const re=harness({storage:h.storage});re.run('resume()');assert.equal(re.book().active.phase,'reply');assert.equal(re.q('.dialogue').textContent,h.q('.dialogue').textContent);}
  await next(h);
 }
 assert.equal(common,99);assert.equal(branch,51);assert.equal(h.state().episode,150);assert.equal(h.state().log.length,150);assert.equal(h.book().active.phase,'ending');assert.equal(h.book().endings.length,1);assert(h.q('.result').textContent.includes(h.run('getEnding(state).text')));
 const old=h.book();h.run('home();resume();showEndings("clear")');assert.equal(h.document.querySelectorAll('.end-card').length,1);h.run('backToGame()');eq(h.book(),old);const re=harness({storage:h.storage});re.run('resume()');eq(re.book(),old);assert(re.q('.result'));
});
await test('All three slots preserve response/scene/ending phase; loads retain ending collection and recover previous progress',async()=>{
 const h=harness();await h.start();await choice(h);await saveSlot(h,0);const first=h.book().active;await next(h);await choice(h,1);await saveSlot(h,1);const second=h.book().active;await next(h);await saveSlot(h,2);const third=h.book().active;
 for(const [i,expected]of [[0,first],[1,second],[2,third]]){const previous=h.book().active;await loadSlot(h,i);eq(h.book().active,expected);eq(h.book().recovery.active,previous);}
 h.run('slots();saveSlot(0)');const before=h.book();h.run('closeModal()');eq(h.book(),before);
 const re=harness({storage:h.storage});eq(re.book().slots,h.book().slots);
});
await test('Full JSON includes all slots/settings/collections/recovery; actual Blob contents, cancel, restore and same-file repeat',async()=>{
 const h=harness();await h.start();await choice(h);await saveSlot(h,0);await next(h);await choice(h,1);await saveSlot(h,1);await next(h);await saveSlot(h,2);h.run('settings();toggleSound()');await h.settle();h.run('closeModal();exportSave()');const exported=await h.downloads.at(-1).text(),saved=h.book();assert.equal(JSON.parse(exported).format,'zatuplay-renai-sakusen-backup-v1');eq(JSON.parse(exported).data,saved);
 await choice(h);const newer=h.book();const input=await h.importRaw(exported);assert.equal(input.value,'');h.run('closeModal()');eq(h.book(),newer);
 await h.importRaw(exported);await h.confirm();eq(h.book().active,saved.active);eq(h.book().slots,saved.slots);eq(h.book().settings,saved.settings);eq(h.book().recovery,h.run(`snapshot(${JSON.stringify(newer)})`));
 const repeated=await h.importRaw(exported);await h.confirm();assert.equal(repeated.value,'');eq(h.book().active,saved.active);
 h.run('settings();exportRecovery()');assert.equal(JSON.parse(await h.downloads.at(-1).text()).data.active.state.episode,saved.active.state.episode);
 h.run('resetPrompt()');await h.confirm();assert.equal(h.book().active,null);assert(h.book().slots.every(x=>x===null));assert.equal(h.book().settings.sound,false);h.run('settings();restoreRecovery()');await h.confirm();eq(h.book().active,saved.active);eq(h.book().slots,saved.slots);
});
await test('Original v1/v2 explicit-only migration, v1 timeline boundaries, old endings preserved and newer endings unioned',async()=>{
 const h=harness();const v2=h.run("fresh(0,'旧版',1,false,77)");const untouched=new MemoryStorage({'renai-v1':JSON.stringify(v2),'renai-slot1':JSON.stringify(v2),'renai-ends-v2':'["c1-0"]'});const old=harness({storage:untouched});assert.equal(old.book().active,null);assert.deepEqual(untouched.reads,[KEY]);
 for(const episode of [0,1,8,9,20,63,98,99]){
  const v1={v:1,hero:0,name:'旧版',target:1,twin:false,seed:77,episode,love:22,trust:25,courage:20,gap:12,relation:'片思い',log:[],ended:episode===99};const n=h.run(`migrateState(${JSON.stringify(v1)})`);assert(n);const expected=episode===99?150:h.run(`TIMELINE.findIndex(e=>e.kind==='base'&&e.baseIndex===${episode})`);assert.equal(n.episode,expected);
 }
 const legacy={v:1,hero:0,name:'旧版',target:1,twin:true,seed:3,episode:1,love:22,trust:25,courage:20,gap:12,relation:'片思い',log:[{episode:1,title:'思い出',choice:'返事',reply:'言葉'}],ended:false};
 await old.importRaw(JSON.stringify({format:'renai-backup-v1',state:legacy,endings:[0,1,'old-twin']}));await old.confirm();assert.equal(old.state().episode,2);eq(old.book().legacyEndings,[0,1,'old-twin']);
 await old.importRaw(JSON.stringify({format:'renai-backup-v2',state:v2,endings:['c1-0'],legacyEndings:[2,3]}));await old.confirm();eq(old.book().endings,['c1-0']);eq(old.book().legacyEndings,[0,1,'old-twin',2,3]);assert.equal(untouched.getItem('renai-v1'),JSON.stringify(v2));
 await old.importRaw(JSON.stringify({format:'renai-backup-v2',state:v2,endings:['c1-1']}));await old.confirm();eq(old.book().endings,['c1-0','c1-1']);
});
await test('All 100 ending records, six route descriptions and old final-state imports remain recoverable',async()=>{
 const h=harness();h.run('showEndings()');assert.equal(h.document.querySelectorAll('.end-card').length,100);h.run('routeMap()');assert.equal(h.document.querySelectorAll('#dialogBody .log').length,6);h.run('closeModal()');await h.start();
 const b=h.run('exported(book)');b.data.endings=json(h.run('ENDINGS.map(e=>e.id)'));await h.importRaw(JSON.stringify(b));await h.confirm();assert.equal(h.book().endings.length,100);h.run('showEndings("clear")');assert.equal(h.document.querySelectorAll('.end-card.unlocked').length,100);h.run('showEndings("special")');assert.equal(h.document.querySelectorAll('.end-card').length,4);await h.start(1,'新しい恋');assert.equal(h.book().endings.length,100);h.run('settings();resetPrompt()');await h.confirm();assert.equal(h.book().endings.length,0);assert.equal(h.book().recovery.endings.length,100);h.run('settings();restoreRecovery()');await h.confirm();assert.equal(h.book().endings.length,100);
 const x=harness(),old=x.run("({...fresh(0,'完了',1,false,1),episode:150,ended:false})");await x.importRaw(JSON.stringify(old));await x.confirm();assert.equal(x.book().active.phase,'ending');eq(x.book().endings,['c1-3']);assert.equal(x.state().relation,'片思い');
 const bad=x.run('exported(book)');bad.data.endings=[];const before=x.book();await x.importRaw(JSON.stringify(bad));eq(x.book(),before);assert(!x.q('#confirm-action'));
});
await test('Invalid nested states/slots/collections/prototype payloads fail atomically; HTML name and log render only as text',async()=>{
 const h=harness();await h.start();await choice(h);const before=h.book(),raw=h.storage.getItem(KEY),base=h.run('exported(book)');
 const mutations=[x=>x.data.active.state.target=24,x=>x.data.active.state.hero=2,x=>x.data.active.state.name='',x=>x.data.active.state.twin=1,x=>x.data.active.state.seed=-1,x=>x.data.active.state.episode=151,x=>x.data.active.state.love=101,x=>x.data.active.state.trust=.5,x=>x.data.active.state.paths=[1],x=>x.data.active.state.paths=[151,0,0,0,0,0],x=>x.data.active.state.met=[0,0],x=>x.data.active.state.log[0].episode=2,x=>x.data.active.state.log[0].reply={},x=>x.data.active.state.log[0].track=6,x=>x.data.active.state.relation='<img>',x=>x.data.active.state.ended=true,x=>x.data.active.sceneTrack=6,x=>x.data.active.phase='invalid',x=>x.data.slots=[null,null],x=>x.data.slots[0]={state:before.active.state,phase:'reply',sceneTrack:null},x=>x.data.endings={},x=>x.data.endings=['fake'],x=>x.data.endings=['c1-0','c1-0'],x=>x.data.settings.sound='yes',x=>x.data.legacyEndings=[{}],x=>x.data.recovery={active:null},x=>x.data.revision=-1];
 for(const mutate of mutations){const x=json(base);mutate(x);await h.importRaw(JSON.stringify(x));eq(h.book(),before);assert.equal(h.storage.getItem(KEY),raw);assert(!h.q('#confirm-action'));}
 for(const bad of ['{','[]','{"__proto__":{"x":1}}',JSON.stringify(base).replace('"reply":','"constructor":{} ,"reply":')]){await h.importRaw(bad);eq(h.book(),before);assert.equal(h.storage.getItem(KEY),raw);}
 const x=json(base);x.data.active.state.name='<img src=x>';x.data.active.state.log[0].reply='<img src=x onerror="alert(1)"><script>alert(1)</script>';await h.importRaw(JSON.stringify(x));await h.confirm();assert.equal(h.q('.dialogue img'),null);assert.equal(h.q('.dialogue script'),null);assert(h.q('.dialogue').textContent.includes('<img src=x onerror='));h.run('showAlbum()');assert.equal(h.q('#dialogBody img'),null);assert.equal(h.q('#dialogBody script'),null);
});
await test('Duplicate and detached choice/next/confirm controls, modal inputs, Escape, blur, hidden and page lifecycle',async()=>{
 const h=harness();await h.start();const oldChoice=h.q('.choice');h.click(oldChoice);h.click(oldChoice);await h.settle();assert.equal(h.state().episode,1);const oldNext=h.button('次の場面');h.click(oldNext);h.click(oldNext);await h.settle();assert.equal(h.book().active.phase,'scene');h.click(oldChoice);h.click(oldNext);await h.settle();assert.equal(h.state().episode,1);
 const before=h.book();h.run('settings()');h.run('choose(0,viewEpoch)');await h.settle();eq(h.book(),before);h.emit('#modal','cancel');await choice(h);assert.equal(h.state().episode,2);await next(h);
 for(const event of ['blur','pagehide']){h.windowEvent(event);h.run('choose(0,viewEpoch)');await h.settle();assert.equal(h.state().episode,2);h.windowEvent('focus');assert.equal(h.state().episode,2);}
 h.visibility(true);h.run('choose(0,viewEpoch)');await h.settle();assert.equal(h.state().episode,2);h.visibility(false);await choice(h);assert.equal(h.state().episode,3);
 h.run('settings();resetPrompt()');const confirm=h.q('#confirm-action');h.click(confirm);h.click(confirm);await h.settle();assert.equal(h.book().active,null);h.click(confirm);await h.settle();assert.equal(h.book().active,null);
 const repeat=h.emit(h.document,'keydown',{key:'Enter',repeat:true});assert(repeat.defaultPrevented);
});
await test('Late reads canceled by new read, picker cancel/empty selection, close, other modal, navigation and lifecycle',async()=>{
 for(const action of ['newer','cancel','empty','close','other','home','blur','hidden','pagehide']){
 const h=harness();await h.start();const old=deferredImport(h),imported=h.run('exported(book)');imported.data.active.state.name='届かない';
 if(action==='newer'){const current=h.run('exported(book)');current.data.active.state.name='新しい';await h.importRaw(JSON.stringify(current));await h.confirm();}
 else if(action==='cancel')h.emit(old.input,'cancel');
 else if(action==='empty'){Object.defineProperty(old.input,'files',{configurable:true,value:[]});await h.run('importSave(__deferredInput)');}
 else if(action==='close')h.run('closeModal()');else if(action==='other')h.run('routeMap()');else if(action==='home')h.run('home()');else if(action==='hidden')h.visibility(true);else h.windowEvent(action);
 const before=h.book(),raw=h.storage.getItem(KEY);old.resolve(JSON.stringify(imported));await old.pending;await h.settle();eq(h.book(),before,action);assert.equal(h.storage.getItem(KEY),raw,action);assert(!h.q('#modal').open||!h.q('#confirm-action'),action);
 }
});
await test('Queued Web Lock choices and destructive confirmations cannot write after cancel/navigation/blur/hidden/another action',async()=>{
 for(const interruption of ['close','home','other','blur','hidden','pagehide']){
 const h=harness();await h.start();const b=h.book(),raw=h.storage.getItem(KEY),delayed=delayedLocks();h.run('window.__locks=null'); // assign through VM below
 h.run('settings();resetPrompt()');const manager=h.run('navigator');manager.locks=delayed;h.click('#confirm-action');await h.settle();assert.equal(delayed.queue.length,1);assert(h.run('operation'));
 if(interruption==='close')h.run('closeModal()');else if(interruption==='home')h.run('home()');else if(interruption==='other')h.run('settings()');else if(interruption==='hidden')h.visibility(true);else h.windowEvent(interruption);
 await delayed.queue.shift()();await h.settle();eq(h.book(),b,interruption);assert.equal(h.storage.getItem(KEY),raw,interruption);if(interruption==='other')assert(h.q('#dialogBody').textContent.includes('設定・遊び方'));
 }
 const h=harness();await h.start();const delayed=delayedLocks();h.run('navigator').locks=delayed;h.click('.choice');await h.settle();h.run('home();resume()');h.click('.choice');await h.settle();assert.equal(delayed.queue.length,2);await delayed.queue.shift()();await delayed.queue.shift()();await h.settle();assert.equal(h.state().episode,1);
});
await test('Corrupt/denied/no-lock modes never write; quota on choice/import/reset leaves prior state and recoverable bytes',async()=>{
 for(const value of ['{broken','{"format":"future"}',JSON.stringify({format:'zatuplay-renai-sakusen-v1',revision:0,endings:{}})]){const storage=new MemoryStorage({[KEY]:value}),h=harness({storage});await h.start();await choice(h);assert.equal(storage.writes,0);assert.equal(storage.getItem(KEY),value);h.run('exportOriginal()');assert.equal(await h.downloads.at(-1).text(),value);assert(h.status().includes('このタブ内だけ'));}
 const deny=new MemoryStorage();deny.failRead=true;const d=harness({storage:deny});await d.start();await choice(d);assert.equal(deny.writes,0);assert.equal(d.state().episode,1);
 const storage=new MemoryStorage(),no=harness({storage,lockManager:null});await no.start();await choice(no);await saveSlot(no,0);assert.equal(storage.writes,0);assert.equal(no.book().slots[0].state.episode,1);
 for(const action of ['choice','import','reset','slot']){
 const h=harness();await h.start();const b=h.book(),raw=h.storage.getItem(KEY);if(action==='import'){const data=h.run('exported(book)');data.data.active.state.name='変更';await h.importRaw(JSON.stringify(data));}else if(action==='reset')h.run('settings();resetPrompt()');else if(action==='slot')h.run('slots();saveSlot(0)');h.storage.failWrite=true;
 if(action==='choice')await choice(h);else await h.confirm();eq(h.book(),b,action);assert.equal(h.storage.getItem(KEY),raw,action);assert(h.status().includes('端末には保存されません'));
 h.storage.failWrite=false;h.run('closeModal();viewActive()');await choice(h);assert.equal(h.state().episode,1);assert.equal(h.storage.getItem(KEY),raw,'memory fallback never silently resumes persistent writes');
 }
});
await test('Two tabs compare under Web Locks; storage events and cleared storage protect collection, slots and active state',async()=>{
 const storage=new MemoryStorage(),manager=locks(),a=harness({storage,lockManager:manager}),b=harness({storage,lockManager:manager});await a.start();const durable=storage.getItem(KEY);await b.start();assert.equal(b.book().active,null);assert.equal(storage.getItem(KEY),durable);assert(b.status().includes('別のタブ'));await b.start();await choice(b);assert.equal(storage.getItem(KEY),durable);assert.equal(b.state().episode,1);
 const c=harness({storage,lockManager:manager});c.run('resume()');c.windowEvent('storage',{key:KEY});await choice(c);assert.equal(storage.getItem(KEY),durable);assert.equal(c.state().episode,1);assert(c.status().includes('別のタブ'));
 const d=harness({storage,lockManager:manager});d.run('resume()');d.windowEvent('storage',{key:null});await choice(d);assert.equal(storage.getItem(KEY),durable);
});
await test('Sound settings persist; timers/voices suspend behind modal, blur and hidden; unsupported/rejected audio remains playable',async()=>{
 const h=harness();await h.start();h.run('settings();toggleSound()');await h.settle();assert.equal(h.book().settings.sound,true);assert.equal(h.run('timer'),null);h.run('closeModal()');await h.settle();assert.notEqual(h.run('timer'),null);h.advance(2000);assert(h.audioLog.includes('tone'));h.run('showAlbum()');assert.equal(h.run('timer'),null);h.run('closeModal()');await h.settle();h.windowEvent('blur');assert.equal(h.run('timer'),null);h.windowEvent('focus');await h.settle();h.visibility(true);assert.equal(h.run('timer'),null);h.visibility(false);await h.settle();const re=harness({storage:h.storage});assert.equal(re.book().settings.sound,true);assert.equal(re.run('timer'),null);
 for(const mode of ['absent','constructor','resume','tone','suspend']){const x=harness({audioMode:mode});await x.start();x.run('settings();toggleSound()');await x.settle();x.run('closeModal()');await x.settle();x.advance(2000);await choice(x);assert.equal(x.state().episode,1);await next(x);assert.equal(x.book().active.phase,'scene');}
});
await test('Persisted sound ON restores with keyboard Enter/Space, never repeat/modal/hidden, and survives navigation during resume',async()=>{
 const saved=harness();await saved.start();saved.run('settings();toggleSound()');await saved.settle();assert(saved.book().settings.sound);
 for(const key of ['Enter',' ']){
  const h=harness({storage:saved.storage});assert.equal(h.run('audio'),null);h.emit(h.document,'keydown',{key,repeat:true});assert.equal(h.run('audio'),null);
  h.visibility(true);h.emit(h.document,'keydown',{key,repeat:false});await h.settle();assert.equal(h.run('audio'),null);h.visibility(false);
  h.run('settings()');h.emit(h.document,'keydown',{key,repeat:false});await h.settle();assert.equal(h.run('audio'),null);h.run('closeModal()');
  h.emit(h.document,'keydown',{key,repeat:false});h.click(h.button('つづきから'));await h.settle();assert(h.run('audio!==null'));assert(h.run('timer!==null'));assert(!h.run('soundFault'));h.advance(1000);assert(h.audioLog.includes('tone'));
  h.run('showAlbum()');assert.equal(h.run('timer'),null);
 }
});
await test('Oversized imported histories reject upfront; maximal accepted UTF-8/escaped logs roundtrip with all slots and recovery',async()=>{
 const h=harness({lockManager:null});await h.start();const before=h.book(),oversized=h.book();oversized.active.state.episode=60;oversized.active.state.log=Array.from({length:60},(_,i)=>({episode:i+1,title:'a'.repeat(4000),choice:'b'.repeat(4000),reply:'c'.repeat(4000)}));
 const input=JSON.stringify(oversized);assert(Buffer.byteLength(input)>720000&&Buffer.byteLength(input)<2000000);await h.importRaw(input);assert(!h.q('#confirm-action'));eq(h.book(),before);assert.equal(h.storage.writes,0);
 await h.importRaw(JSON.stringify({format:'renai-backup-v2',state:oversized.active.state,endings:[]}));assert(!h.q('#confirm-action'));eq(h.book(),before);
 const good=h.book();good.active.state.episode=150;good.active.state.ended=true;good.active.state.relation='片思い';good.active.phase='ending';good.active.sceneTrack=null;
 good.active.state.log=Array.from({length:150},(_,i)=>{const l={episode:i+1,title:('あ'+String.fromCharCode(0)).repeat(30),choice:'「\\\"\n」'.repeat(10),reply:'',option:1,node:'base-'+(i%99),track:5};l.reply='x'.repeat(1024-Buffer.byteLength(JSON.stringify(l)));assert.equal(Buffer.byteLength(JSON.stringify(l)),1024);return l;});
 good.slots=[json(good.active),json(good.active),json(good.active)];good.endings=json(h.run('ENDINGS.map(e=>e.id)'));good.legacyEndings=Array.from({length:100},(_,i)=>String.fromCharCode(0).repeat(157)+String(i).padStart(3,'0'));good.recovery={active:json(good.active),slots:json(good.slots),endings:json(good.endings),legacyEndings:json(good.legacyEndings),settings:json(good.settings)};
 await h.importRaw(JSON.stringify(good));assert(h.q('#confirm-action'));await h.confirm();assert.equal(h.state().log.length,150);
 await saveSlot(h,0);await saveSlot(h,1);await saveSlot(h,2);const full=h.book();assert(full.slots.every(a=>a.state.log.length===150));assert(full.recovery.slots.every(a=>a.state.log.length===150));h.run('exportSave()');const raw=await h.downloads.at(-1).text();assert(Buffer.byteLength(raw)>1200000);assert(Buffer.byteLength(raw)<=2000000);assert(h.run(`utf8Size(JSON.stringify(exported(book),null,2))<=MAX_FILE_BYTES`));
 const restored=harness({lockManager:null});await restored.importRaw(raw);assert(restored.q('#confirm-action'));await restored.confirm();eq(restored.book().active,full.active);eq(restored.book().slots,full.slots);eq(restored.book().endings,full.endings);eq(restored.book().legacyEndings,full.legacyEndings);eq(restored.book().settings,full.settings);
 const continuing=json(full);continuing.active.state.episode=149;continuing.active.state.ended=false;continuing.active.state.log.pop();continuing.active.phase='scene';await restored.importRaw(JSON.stringify(continuing));await restored.confirm();await choice(restored);await next(restored);assert.equal(restored.book().active.phase,'ending');restored.run('exportSave()');const completed=await restored.downloads.at(-1).text();assert(Buffer.byteLength(completed)<=2000000);await restored.importRaw(completed);assert(restored.q('#confirm-action'));await restored.confirm();assert.equal(restored.state().episode,150);
});
await test('Versioned local resources, return link, honest original limitations and no native bridge/debug/network dependencies',()=>{
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8'),adapter=fs.readFileSync(path.join(root,'browser.js'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');assert(index.includes('href="../../browser/"'));
 for(const m of index.matchAll(/(?:src|href)="([^"#]+)"/g)){if(m[1].startsWith('../'))continue;assert(m[1].includes('?v=0.2.0-web.1'));assert(fs.existsSync(path.join(root,m[1].split('?')[0])));}
 for(const m of css.matchAll(/url\('([^']+)'\)/g))assert(m[1].includes('?v=0.2.0-web.1'));
 assert(app.includes('全人物独立の長編、表情差分、ボイス、オンライン同期は未実装'));assert(app.includes('現実の関係を診断'));assert(!/AndroidBackup|fetch\(|eval\(|__test|debugger/.test(adapter+app));assert(!/localStorage\.(setItem|removeItem)/.test(app));assert.equal((adapter.match(/localStorage\.setItem/g)||[]).length,1);
});
await test('All distributed hashes and both source/public mirrors match exactly',()=>{
 const mirror=path.resolve(root,'../../../../zatuplay/games/renai-sakusen');const files=(dir,p='')=>fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),p+e.name+'/'):[p+e.name]);eq(files(root),files(mirror));for(const f of files(root))assert(fs.readFileSync(path.join(root,f)).equals(fs.readFileSync(path.join(mirror,f))),f);
 const lines=fs.readFileSync(path.join(root,'checksums.sha256'),'utf8').trim().split('\n');assert.equal(lines.length,files(root).length-1);for(const line of lines){const [hash,file]=line.split('  ');assert.equal(sha(fs.readFileSync(path.join(root,file))),hash,file);}
});
console.log(`All ${passed} groups passed. DOM/storage/audio/lifecycle and original APK oracle model checks only. Public Chrome/mobile/actual downloads and listening remain separate CUA QA.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
