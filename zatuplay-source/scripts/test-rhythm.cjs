'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createHarness,MemoryStorage,root}=require('./rhythm-harness.cjs');
let tests=0;const test=async(name,fn)=>{await fn();console.log('PASS '+name);tests++;};
const json=(h,s)=>JSON.parse(h.run(`JSON.stringify(${s})`));
async function begin(h,i=0){h.run(`select(catalog[${i}]);if($("#trial-mode").value==="auto")$("#trial-mode").value="normal"`);await h.run('start()');assert(h.run('!!run'));}
function finishPerfect(h){
 const events=json(h,'run.events');const base=h.run('run.base');
 // Deterministic simulated input, not real keyboard timing or browser playback.
 for(const [i,e]of events.entries()){
  h.setAudioTime(base+e.at);
  h.run(`down(${JSON.stringify(e.key)})`);
  if(e.duration)h.setAudioTime(base+e.at+e.duration);
  h.run(`up(${JSON.stringify(e.key)})`);
 }
 assert(h.run('run.events.every(e=>e.result===100)'),h.run('selected.name')+' '+h.run('JSON.stringify(run.events.filter(e=>e.result!==100).slice(0,4))'));
 h.run('stop()');
}
(async()=>{
 await test('original embedded images, data scripts and mirror integrity',async()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'SOURCE_ASSETS.json')));
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
  const images=[...html.matchAll(/data:image\/([^;]+);base64,([A-Za-z0-9+/=]+)/g)].map(m=>digest(Buffer.from(m[2],'base64')));
  assert.deepEqual(images,manifest.embeddedImages.map(x=>x.sha256));
  const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
  for(const item of manifest.unchangedScripts)assert.equal(digest(scripts[item.index]),item.sha256);
  for(const item of manifest.copiedAssets)assert.equal(digest(fs.readFileSync(path.join(root,item.path))),item.sha256);
  function walk(dir,base=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),base+e.name+'/'):[base+e.name]);}
  const mirror=path.resolve(root,'../../../../zatuplay/games/rhythm');
  assert.deepEqual(walk(root).sort(),walk(mirror).sort());for(const f of walk(root))assert.equal(digest(fs.readFileSync(path.join(root,f))),digest(fs.readFileSync(path.join(mirror,f))));
  assert(html.includes('href="../../browser/"'));assert(!/https?:\/\/|fetch\(|serviceWorker/.test(html));
 });
 await test('82 charts, every section renders on native Canvas2D, 82 perfect scores and progression',async()=>{
  const h=await createHarness();h.run('RhythmBrowser.checkGap=()=>false;Math.random=()=>.5');
  assert.equal(h.run('catalog.length'),82);
  let sections=0;
  for(let i=0;i<82;i++){
   await begin(h,i);const r=json(h,'({events:run.events,end:run.end,pool:run.pool,tempoMap:run.tempoMap,sections:run.sections})');
   assert(r.events.length>0);assert(r.events.every(e=>Number.isFinite(e.at)&&e.at>=0&&e.at<r.end));
   for(let b=0;b<r.sections;b++){
    h.run(`scene(profiles[run.pool[${b}%run.pool.length]],audio.currentTime,timeAtBeat(run,${b}*8)+.3,${b})`);sections++;
   }
   finishPerfect(h);assert.equal(h.run('campaign'),i+1);assert.equal(h.run(`saves[catalog[${i}].id].score`),100);
  }
  assert.equal(h.run('medalCount()'),80);assert(h.run('summary();$("#resume-label").textContent.includes("全82")'));
  const reload=await createHarness({storage:h.storage});assert.equal(reload.run('campaign'),82);assert.equal(reload.run('Object.keys(saves).length'),82);
  console.log('  Rendered '+sections+' original sections.');h.dispose();reload.dispose();
 });
 await test('score thresholds, misses, practice and auto do not unlock or save progress',async()=>{
  const h=await createHarness();assert.deepEqual(json(h,'[timingPoints(.068),timingPoints(.125),timingPoints(.185),timingPoints(.186)]'),[100,80,45,0]);
  await begin(h);h.run('stop()');assert.equal(h.run('campaign'),0);assert.equal(h.run('saves["1-1"].score'),0);
  h.run('select(catalog[0]);$("#practice").checked=true');await h.run('start()');finishPerfect(h);assert.equal(h.run('campaign'),0);assert.equal(h.run('saves["1-1"].score'),0);
  h.run('select(catalog[0]);$("#trial-mode").value="auto"');await h.run('start()');h.run('run.events.forEach(e=>e.result=100);stop()');assert.equal(h.run('campaign'),0);assert.equal(h.run('saves["1-1"].score'),0);h.dispose();
 });
 await test('perfect challenge unlocks, streak, night, intentional cancellation',async()=>{
  const h=await createHarness();h.run('perfectCampaign={target:"1-1",failures:0,otherPlays:0,lastAttempt:null}');
  await begin(h);assert.equal(h.run('run.trial'),'campaign');h.run('stop(true)');assert.equal(h.run('perfectCampaign.failures'),1);
  h.run('applyPerfectResult("1-1","campaign",true)');assert(h.run('perfectRecord("1-1").unlocked'));
  h.run('applyPerfectResult("1-1","perfect",true);applyPerfectResult("1-1","perfect",true)');assert(h.run('perfectRecord("1-1").night'));
  h.run('applyPerfectResult("1-1","night",true)');assert(h.run('perfectRecord("1-1").star'));
  h.run('applyPerfectResult("1-1","perfect",false)');assert.equal(h.run('perfectRecord("1-1").streak'),0);h.dispose();
 });
 await test('blur/hidden/pagehide pause freezes scoring, timers, input and challenge count; explicit resume',async()=>{
  for(const ev of ['blur','hidden','pagehide']){
   const h=await createHarness();h.run('perfectCampaign={target:"1-1",failures:0,otherPlays:0,lastAttempt:null}');await begin(h);await h.advance(2100);
   const t=h.run('audio.currentTime-run.base');const events=json(h,'run.events');
   h.run('inputSources.set("keySpace",{key:"A",logical:"A"});held.add("A")');
   if(ev==='hidden'){h.document.hidden=true;h.emit('visibilitychange');}else h.windowEvent(ev);
   assert(h.run('RhythmBrowser.paused'));assert.equal(h.run('held.size+inputSources.size'),0);assert.equal(h.run('perfectCampaign.failures'),0);
   await h.advance(20000);assert.deepEqual(json(h,'run.events'),events);
   h.document.hidden=false;h.emit('visibilitychange');assert(h.run('RhythmBrowser.paused'));
   await h.run('RhythmBrowser.resume()');await h.advance(3000);assert(!h.run('RhythmBrowser.paused'));assert(Math.abs(h.run('audio.currentTime-run.base')-t)<.001);assert.equal(h.run('perfectCampaign.failures'),0);h.dispose();
  }
 });
 await test('repeated countdown interruption, suspension failure and tab sleep clock guard',async()=>{
  const h=await createHarness();await begin(h);await h.advance(1800);h.setSuspendReject(true);h.windowEvent('blur');await h.run('RhythmBrowser.resume()');await h.advance(1000);h.windowEvent('blur');await h.advance(5000);assert(h.run('RhythmBrowser.paused'));assert(!h.document.getElementById('browser-resume').disabled);
  await h.run('RhythmBrowser.resume()');await h.advance(3000);assert(!h.run('RhythmBrowser.paused'));
  await h.tick(10000);assert(h.run('RhythmBrowser.paused'));assert(h.run('run.events.every(e=>e.result===null)'));await h.click('browser-pause-back');assert.equal(h.run('screen'),'select');h.dispose();
 });
 await test('active hold interruption rewinds only unfinished hold and releases pointer state',async()=>{
  const h=await createHarness();h.run('unlockAllMode=true');await begin(h,8);const e=json(h,'run.events.find(e=>e.duration>0)');assert(e);
  h.setAudioTime(h.run('run.base')+e.at);h.run(`pressInput('pointer7',${JSON.stringify(e.key)})`);assert(h.run('run.events.some(e=>e.held)'));
  h.windowEvent('blur');assert(h.run('RhythmBrowser.paused'));assert(h.run('run.events.every(e=>!e.held)'));assert.equal(h.run('inputSources.size'),0);
  await h.run('RhythmBrowser.resume()');await h.advance(3000);assert(h.run('audio.currentTime-run.base')<=e.at-.7);assert.equal(h.run('run.extra'),0);h.dispose();
 });
 await test('side modes, all 10 party games, finish & snack timeout, ring persistence',async()=>{
  const h=await createHarness();h.run('unlockAllMode=true;openModeHub();RhythmBrowser.checkGap=()=>false;Math.random=()=>.1');
  for(let i=0;i<10;i++){
   await h.run(`partyStart({game:${i},practice:false,kind:${i}<6?'coop':'versus',style:partyGames[${i}][2],cpu:'hard',level:1})`);
   assert(h.run('!!sideRun'));h.run('sideFrame()');
   if(i===7){const base=h.run('sideRun.base');h.setAudioTime(base+10);h.run('partyFrame(sideRun)');await h.tick(610,{frame:false});assert.equal(h.run('sideRun'),null);}
   else if(i===9){h.run('sideRun.players[0].score=900;partyFinish()');}
   else{for(const e of json(h,'sideRun.events')){if(!h.run('sideRun'))break;h.setAudioTime(h.run('sideRun.base')+e.at);h.run(`partyPress(${JSON.stringify(e.key)})`);if(e.duration){h.setAudioTime(h.run('sideRun.base')+e.at+e.duration);h.run('partyRelease("A")');}h.run('partyFrame(sideRun)');}if(h.run('!!sideRun')){h.setAudioTime(h.run('sideRun.base+sideRun.end+.3'));h.run('partyFrame(sideRun)');}}
   assert.equal(h.run('sideRun'),null);
  }
  assert(h.storage.data.has('rhythm-party-rings-v1'));const reload=await createHarness({storage:h.storage});assert(!reload.run('rhythmStorage.blocked'));h.dispose();reload.dispose();
 });
 await test('side pause & frozen memory/snack callbacks cannot finish another game',async()=>{
  const h=await createHarness();h.run('openModeHub()');await h.run('partyStart({game:7,practice:false,kind:"versus",style:"snack",cpu:"normal",level:1})');await h.advance(7200);h.run('partyPress("A")');h.windowEvent('blur');const r=h.run('sideRun');await h.advance(4000);assert.equal(h.run('sideRun'),r);
  await h.run('RhythmBrowser.resume()');await h.advance(3000);assert.equal(h.run('sideRun'),r);await h.advance(700);assert.equal(h.run('sideRun'),null);
  await h.run('partyStart({game:7,practice:false,kind:"versus",style:"snack",cpu:"normal",level:1})');h.setAudioTime(h.run('sideRun.base+6'));h.run('partyPress("A");partyMenu()');await h.run('partyStart({game:0,practice:false,kind:"coop",style:"pluck",cpu:"normal",level:1})');await h.tick(700,{frame:false});assert(h.run('sideRun?.gameIdx===0'));h.dispose();
 });
 await test('all toys, score attacks, drums, composer and beat-spell chapters build and finish',async()=>{
  const h=await createHarness();h.run('unlockAllMode=true;openModeHub();RhythmBrowser.checkGap=()=>false');
  for(const mode of ['toys','score'])for(let i=0;i<(mode==='toys'?7:8);i++){
   await h.run(`miniStart(${JSON.stringify(mode)},${i})`);assert(h.run('!!sideRun'));
   if(h.run('sideRun.composer')){h.run('sideRun.cells[0]=true;sideRun.playing=true;composerFrame(sideRun)');const b=[...h.document.querySelectorAll('#mode-body button')].find(n=>n.textContent==='💾 保存');b.onclick();h.run('sideStop()');}
   else{h.run('miniFrame(sideRun);miniFinish()');}
  }
  for(let i=0;i<14;i++){await h.run(`drumStart(${i})`);h.run('drumFrame(sideRun)');if(i!==13)for(const e of json(h,'sideRun.notes')){h.setAudioTime(h.run('sideRun.base')+e.at);h.run(`drumPress(${JSON.stringify(e.key)})`);}else h.run('drumPress("K")');h.run('drumFinish()');}
  for(let c=1;c<=8;c++){await h.run(`spellStart(${c})`);h.run('spellChoose(spellMagic[0]);spellFrame(sideRun)');for(const e of json(h,'sideRun.cast.notes')){h.setAudioTime(h.run('sideRun.base')+e.at);h.run(`spellPress(${JSON.stringify(e.key)})`);}h.run('spellEnd(true)');}
  assert.equal(h.run('spellProgress.cleared'),8);const reload=await createHarness({storage:h.storage});assert(!reload.run('rhythmStorage.blocked'));assert.equal(reload.run('spellProgress.cleared'),8);assert(h.storage.data.has('rhythm-composition-1'));h.dispose();reload.dispose();
 });
 await test('memory pairs complete normally; paused mismatch preserves absolute lock and pending callback',async()=>{
  const h=await createHarness();h.run('openModeHub()');await h.run('partyStart({game:9,practice:false,kind:"versus",style:"memory",cpu:"normal",level:1})');
  const deck=json(h,'sideRun.deck'),first=0,other=deck.findIndex(v=>v!==deck[0]);h.run(`memoryFlip(${first});memoryFlip(${other})`);const oldLock=h.run('sideRun.lockUntil-audio.currentTime');
  h.windowEvent('blur');h.setSuspendReject(true);await h.run('RhythmBrowser.resume()');await h.advance(3000);assert(Math.abs(h.run('sideRun.lockUntil-audio.currentTime')-oldLock)<.001);assert.notEqual(h.run('sideRun.firstPick'),null);await h.advance(710);assert.equal(h.run('sideRun.firstPick'),null);
  for(const val of new Set(deck)){const pair=deck.map((v,i)=>v===val?i:-1).filter(i=>i>=0);h.run(`memoryFlip(${pair[0]});memoryFlip(${pair[1]})`);}await h.advance(610);assert.equal(h.run('sideRun'),null);assert(h.storage.data.has('rhythm-party-rings-v1'));h.dispose();
 });
 await test('pending starts are invalidated by pagehide and cannot resume or replace a newer screen',async()=>{
  const h=await createHarness();h.run('select(catalog[0]);audio=new window.AudioContext();window.releaseAudio=null;audio.resume=()=>new Promise(resolve=>window.releaseAudio=resolve);window.pending=start()');h.windowEvent('pagehide');assert(h.run('RhythmBrowser.paused'));h.run('window.releaseAudio()');await h.run('window.pending');assert.equal(h.run('run'),null);await h.run('RhythmBrowser.resume()');assert(!h.run('RhythmBrowser.paused'));assert(!h.document.getElementById('start').disabled);
  h.run('openModeHub();window.pending=partyStart({game:0,practice:false,kind:"coop",style:"pluck",cpu:"normal",level:1})');h.windowEvent('pagehide');h.run('window.releaseAudio()');await h.run('window.pending');assert.equal(h.run('sideRun'),null);await h.run('RhythmBrowser.resume()');assert(!h.run('RhythmBrowser.paused'));h.dispose();
 });
 await test('corrupt saves are not overwritten; denied getter/read/write and cross-tab conflicts are visible',async()=>{
  for(const [key,value]of [['rhythm-lab-v2','null'],['rhythm-perfect-records','[]'],['rhythm-season-v1','{"missions":null}'],['rhythm-lab-campaign-v1','NaN'],['rhythm-side-records','{"__proto__":7}'],['rhythm-composition-1','{"cells":[],"tempo":0}']]){
   const storage=new MemoryStorage({[key]:value}),h=await createHarness({storage});assert(h.run('rhythmStorage.blocked'));assert.equal(storage.data.get(key),value);assert.equal(storage.writes,0);h.run('seasonSave()');assert.equal(storage.writes,0);h.dispose();
  }
  for(const mode of ['getter','read','write']){const storage=new MemoryStorage();storage.failRead=mode==='read';storage.failWrite=mode==='write';const h=await createHarness({storage,deniedGetter:mode==='getter'});assert(h.run('rhythmStorage.blocked'));assert(h.document.getElementById('browser-save-status').textContent);h.dispose();}
  const h=await createHarness();h.storage.setItem('rhythm-lab-v2','{"1-1":{"score":80}}');h.run('saves={"1-1":{score:100,perfect:true}};persist()');assert(h.run('rhythmStorage.blocked'));assert.equal(JSON.parse(h.storage.data.get('rhythm-lab-v2'))['1-1'].score,80);h.dispose();
 });
 await test('persistent settings, audio refusal/retry, keyboard focus and no double drum input',async()=>{
  const storage=new MemoryStorage({'rhythm-setting-volume':'12','rhythm-setting-voice':'false','rhythm-setting-offset':'-30','rhythm-narration-v1':'{"mode":"off","volume":25,"rate":1.2}'}),h=await createHarness({storage});
  assert.equal(h.document.getElementById('volume').value,'12');assert.equal(h.document.getElementById('voice').checked,false);assert.equal(h.run('narrationSettings.mode'),'off');
  h.setResumeReject(true);h.run('select(catalog[0])');await h.run('start()');assert.equal(h.run('run'),null);assert(!h.document.getElementById('start').disabled);h.setResumeReject(false);await h.run('start()');assert(h.run('!!run'));h.run('stop(true);openModeHub();unlockAllMode=true');await h.run('drumStart(13)');h.emit('keydown',{code:'Space',repeat:false,target:h.document.body});assert.equal(h.run('sideRun.hits'),1);h.run('sideStop()');h.setResumeReject(true);await h.run('partyStart({game:0,practice:false,kind:"coop",style:"pluck",cpu:"normal",level:1})');assert.equal(h.run('sideRun'),null);assert(h.document.getElementById('mode-body').textContent.includes('音声を開始できません'));h.dispose();
 });
 console.log(`PASS ${tests} test groups. Native Canvas/DOM/audio-clock model only; public browser/audio/device QA remains separate.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
