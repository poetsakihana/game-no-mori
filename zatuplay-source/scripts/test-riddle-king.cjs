'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {createHarness:H,MemoryStorage,locks,KEY,root,questions:Q}=require('./riddle-king-harness.cjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const defaults=()=>({version:1,unlocked:0,stage:0,answer:'',hint:false,solved:false,screen:'home',page:0,sound:false});
const seed=s=>({[KEY]:JSON.stringify({revision:1,state:{...defaults(),...s}})});
const tick=async h=>h.settle();
test('original question script, JSON and complete structure: all 16,000 records',()=>{
 const script=fs.readFileSync(path.join(root,'questions.js'));const sandbox={window:{}};vm.runInNewContext(script.toString(),sandbox);
 assert.equal(JSON.stringify(sandbox.window.QUESTIONS),JSON.stringify(Q));assert.equal(Q.length,16000);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'provenance.json')));
 for(const [name,hash] of Object.entries(manifest.unchangedAssets))assert.equal(sha(fs.readFileSync(path.join(root,name))),hash,name);
 for(let i=0;i<Q.length;i++){const q=Q[i];assert.equal(q.id,i+1);assert.ok(Number.isInteger(q.d)&&q.d>=1&&q.d<=10);for(const k of ['q','a','h','e'])assert.ok(typeof q[k]==='string'&&q[k].trim(),`${q.id} ${k}`);}
});
test('independent arithmetic and cipher answers for every generated problem',()=>{
 let numeric=0,cipher=0;
 for(const q of Q.slice(20,15000)){
  const n=q.q.match(/\d+/g).map(Number);let answer;
  if(q.q.startsWith('小屋'))answer=(n[1]-n[0]*2)/2;
  else if(q.q.startsWith('魔法'))answer=n[0]+n[1]*n[2];
  else if(q.q.startsWith('兄'))answer=(n[1]-n[0])/2;
  else if(q.q.startsWith('長方形')){answer=(-n[0]+Math.sqrt(n[0]**2+4*n[1]))/2;assert.equal(answer*(answer+n[0]),n[1]);}
  else if(q.q.startsWith('暗号列')){assert.equal(n[1]-n[0],n[2]-n[1]);assert.equal(n[2]-n[1],n[3]-n[2]);answer=n[3]+n[1]-n[0];}
  else assert.fail('unknown template');
  assert.ok(Number.isInteger(answer)&&answer>=0);
  const extra=q.q.match(/その答えを(\d+)倍して(\d+)を足した/);if(extra)answer=answer*+extra[1]+ +extra[2];
  if(q.q.includes('各桁'))answer=String(answer).split('').reduce((sum,c)=>sum+ +c,0);
  assert.equal(String(answer),q.a,'question '+q.id);numeric++;
 }
 for(const q of Q.slice(15000)){
  let chars=[...q.q.match(/「([^」]+)」/)[1]],answer;
  switch(Math.floor((q.id-15001)/100)){
   case 0:answer=chars.reverse().join('');break;
   case 1:answer=chars.filter(c=>c!=='★').join('');break;
   case 2:answer=chars.filter((_,i)=>i%2===0).join('');break;
   case 3:answer=chars.filter((_,i)=>i%2===1).join('');break;
   case 4:answer=[chars.pop(),...chars].join('');break;
   case 5:answer=[...chars.slice(1),chars[0]].join('');break;
   case 6:assert.equal(chars.length%2,0);for(let i=0;i<chars.length;i+=2)assert.equal(chars[i],chars[i+1]);answer=chars.filter((_,i)=>i%2===0).join('');break;
   case 7:answer=chars.filter(c=>c!=='★').reverse().join('');break;
   case 8:answer=chars.filter((_,i)=>i%2===0).reverse().join('');break;
   case 9:chars=chars.filter(c=>c!=='★'&&c!=='☆');answer=[chars.pop(),...chars].reverse().join('');break;
  }
  assert.equal(answer,q.a,'question '+q.id);cipher++;
 }
 assert.equal(numeric,14980);assert.equal(cipher,1000);
});
test('wrong answer, hint, IME Enter, normalization, single award and draft/solved reload',async()=>{
 const h=H();assert.match(h.get('#app').textContent,/0 \/ 16,000/);h.click('#continue');h.input('ねこ');h.click('#check');assert.match(h.get('#msg').textContent,/もうひと考え/);h.click('#hint');assert.match(h.get('#msg').textContent,/火にかけて/);
 await tick(h);let r=H({storage:h.storage});assert.equal(r.get('#answer').value,'ねこ');assert.match(r.get('#msg').textContent,/火にかけて/);
 r.input(' ふらいぱん！ ');r.emit('#answer','keydown',{key:'Enter',isComposing:true});assert.equal(r.get('#check').disabled,false);
 r.emit('#answer','keydown',{key:'Enter',keyCode:229});assert.equal(r.get('#check').disabled,false);
 r.emit('#answer','keydown',{key:'Enter',isComposing:false});r.emit('#answer','keydown',{key:'Enter'});await tick(r);
 assert.equal(r.value().state.unlocked,1);assert.equal(r.get('#msg').querySelectorAll('#next').length,1);
 r=H({storage:h.storage});assert.ok(r.get('#answer').disabled);assert.match(r.get('#msg').textContent,/正解/);r.click('#next');r.input('く');await tick(r);
 r=H({storage:h.storage});assert.equal(r.get('#answer').value,'く');assert.match(r.get('#app').textContent,/STAGE 2/);
});
test('all 16,000 stages accept original answers, award once, save, restore and end',async()=>{
 const h=H();h.click('#continue');
 for(let i=0;i<Q.length;i++){
  h.input(Q[i].a);h.click('#check');await tick(h);
  assert.equal(h.value().state.unlocked,i+1);assert.ok(h.get('#answer').disabled);
  if((i+1)%1600===0)assert.match(h.get('#msg').textContent,/新しい称号/);
  h.click('#next');
 }
 await tick(h);assert.ok(h.get('#end'));assert.equal(h.value().state.screen,'ending');const r=H({storage:h.storage});assert.ok(r.get('#end'));r.click('#home');assert.match(r.get('#app').textContent,/16,000 \/ 16,000/);r.click('#ending');assert.ok(r.get('#end'));
});
test('selection respects locks, page boundaries and replay does not award progress',async()=>{
 const h=H({storage:new MemoryStorage(seed({unlocked:50,stage:50}))});h.click('#select');assert.match(h.get('#app').textContent,/2 \/ 320/);assert.ok(h.get('[data-stage="51"]').disabled);h.click('#previous-page');assert.equal(h.get('[data-stage="0"]').disabled,false);h.click('[data-stage="0"]');h.input(Q[0].a);h.click('#check');await tick(h);assert.equal(h.value().state.unlocked,50);h.click('#home');h.click('#continue');assert.match(h.get('#app').textContent,/STAGE 51/);
});
test('corrupt saves, malformed schema and blocked getters never overwrite original',async()=>{
 for(const raw of ['{','null',JSON.stringify({revision:1,state:{...defaults(),unlocked:16001}}),JSON.stringify({revision:1,state:{...defaults(),solved:true}}),JSON.stringify({revision:1,state:{...defaults(),screen:'ending'}})]){
  const storage=new MemoryStorage({[KEY]:raw});const h=H({storage});h.click('#continue');h.input(Q[0].a);h.click('#check');await tick(h);assert.equal(storage.data.get(KEY),raw);assert.equal(storage.writes,0);assert.match(h.status(),/上書きせず/);
 }
 for(const opts of [{deniedGetter:true},{storage:Object.assign(new MemoryStorage(),{failRead:true})},{lockManager:null}]){const h=H(opts);h.click('#continue');h.input(Q[0].a);h.click('#check');await tick(h);assert.equal(h.storage.writes,0);assert.match(h.status(),/保存なし/);}
});
test('legacy progress is migrated without mutating original key; invalid legacy remains intact',async()=>{
 const storage=new MemoryStorage({'king-progress':'15999'}),h=H({storage});h.click('#continue');h.input(Q[15999].a);h.click('#check');await tick(h);assert.equal(h.value().state.unlocked,16000);assert.equal(storage.data.get('king-progress'),'15999');
 const bad=new MemoryStorage({'king-progress':'NaN'}),r=H({storage:bad});r.click('#continue');await tick(r);assert.equal(bad.writes,0);assert.equal(bad.data.get('king-progress'),'NaN');
});
test('write failures retain current attempt, announce failure and retry safely',async()=>{
 const storage=new MemoryStorage(),h=H({storage});storage.failWrite=true;h.click('#continue');h.input(Q[0].a);h.click('#check');await tick(h);assert.match(h.status(),/保存に失敗/);assert.equal(storage.data.get(KEY),undefined);assert.equal(h.get('#retry-save').hidden,false);
 storage.failWrite=false;h.click('#retry-save');await tick(h);assert.equal(h.value().state.unlocked,1);assert.match(h.status(),/保存しました/);
});
test('shared Web Lock serializes concurrent tabs and stale tab cannot clobber',async()=>{
 const storage=new MemoryStorage(),lock=locks(),a=H({storage,lockManager:lock}),b=H({storage,lockManager:lock});a.click('#continue');b.click('#continue');a.input(Q[0].a);a.click('#check');b.input('other');await tick(a);await tick(b);
 assert.equal(JSON.parse(storage.data.get(KEY)).state.unlocked,1);assert.match(b.status(),/別のタブ/);const original=storage.data.get(KEY);b.click('#check');await tick(b);assert.equal(storage.data.get(KEY),original);
 const c=H({storage});c.windowEvent('storage',{key:KEY,newValue:'changed',storageArea:storage});c.click('#next');await tick(c);assert.equal(storage.data.get(KEY),original);assert.match(c.status(),/上書きを停止/);
});
test('hidden/blur/pagehide stop audio, clear delayed tones, release pointer and require explicit resume',async()=>{
 const h=H();h.click('#continue');h.click('#music');h.input(Q[0].a);h.click('#check');assert.ok(h.timers.size>0);
 let released=0;const button=h.get('#next');button.hasPointerCapture=()=>true;button.releasePointerCapture=()=>released++;h.emit(button,'pointerdown',{pointerId:7});
 h.windowEvent('blur');assert.equal(released,1);assert.equal(h.get('#pause-panel').hidden,false);assert.equal(h.get('main').inert,true);assert.equal(h.timers.size,0);const sounds=h.audioLog.filter(s=>s==='start').length;h.advance(5000);assert.equal(h.audioLog.filter(s=>s==='start').length,sounds);
 h.click('#next');assert.ok(h.get('#answer').disabled);h.visibility(true);h.click('#resume');assert.equal(h.get('#pause-panel').hidden,false);h.visibility(false);assert.equal(h.get('#pause-panel').hidden,false);h.click('#resume');assert.equal(h.get('#pause-panel').hidden,true);h.click('#next');assert.match(h.get('#app').textContent,/STAGE 2/);h.windowEvent('pagehide');assert.equal(h.timers.size,0);await tick(h);
 const r=H({storage:h.storage});assert.equal(r.get('#music').textContent,'♫ 音：ON');assert.equal(r.audioLog.filter(s=>s==='start').length,0);assert.equal(r.get('#pause-panel').hidden,false);r.click('#resume');assert.ok(r.audioLog.includes('start'));
});
test('audio unsupported is visible and gameplay still works',async()=>{const h=H({audio:false});h.click('#music');assert.match(h.get('#audio-status').textContent,/音を再生できません/);h.click('#continue');h.input(Q[0].a);h.click('#check');await tick(h);assert.equal(h.value().state.unlocked,1);});
test('export, import validation, cancel, repeated file choice and conflicts',async()=>{
 const h=H();h.click('#continue');h.input(Q[0].a);h.click('#check');await tick(h);h.click('#export-save');assert.equal(h.downloads.length,1);const raw=await h.downloads[0].text();assert.equal(JSON.parse(raw).state.unlocked,1);h.advance(1000);assert.equal(h.revoked(),1);
 const r=H();const file={size:raw.length,text:async()=>raw};const input=r.get('#import-save');Object.defineProperty(input,'files',{value:[file],configurable:true});r.emit(input,'change');await tick(r);assert.equal(r.value().state.unlocked,1);assert.match(r.get('#import-status').textContent,/復元しました/);
 r.emit(input,'change');await tick(r);assert.equal(r.value().state.unlocked,1);assert.equal(input.value,'');
 const previous=r.storage.data.get(KEY);Object.defineProperty(input,'files',{value:[{size:2,text:async()=>'{}'}],configurable:true});r.emit(input,'change');await tick(r);assert.equal(r.storage.data.get(KEY),previous);assert.match(r.get('#import-status').textContent,/読み込めません/);
 Object.defineProperty(input,'files',{value:[{size:20001,text:async()=>raw}],configurable:true});r.emit(input,'change');await tick(r);assert.equal(r.storage.data.get(KEY),previous);
 Object.defineProperty(input,'files',{value:[file],configurable:true});r.setConfirm(false);r.emit(input,'change');await tick(r);assert.equal(r.storage.data.get(KEY),previous);
 r.setConfirm(true);r.windowEvent('storage',{key:KEY,newValue:'different'});r.emit(input,'change');await tick(r);assert.equal(r.storage.data.get(KEY),previous);assert.match(r.get('#import-status').textContent,/保存保護中/);
});
test('missing or incomplete question data gives clear error without save',()=>{for(const data of [undefined,[],Q.slice(1)]){const h=H({data:data===undefined?null:data});assert.match(h.get('#app').textContent,/問題データを読み込めません/);assert.equal(h.storage.writes,0);}});
test('source/deployed mirrors are identical',()=>{const mirror=path.resolve(root,'../../../../zatuplay/games/riddle-king');const names=fs.readdirSync(root).sort();assert.deepEqual(fs.readdirSync(mirror).sort(),names);for(const name of names)assert.equal(sha(fs.readFileSync(path.join(root,name))),sha(fs.readFileSync(path.join(mirror,name))),name);});
test('unknown versions and every state-field type/boundary are protected without writes',async()=>{
 const badStates=[
  {version:2},{unlocked:-1},{unlocked:1.5},{unlocked:'1'},
  {stage:-1},{stage:1},{stage:16000},{stage:0.5},
  {answer:3},{answer:'a'.repeat(201)},{hint:'false'},{solved:1},{sound:null},
  {screen:'unknown'},{page:-1},{page:1},{page:0.5},{extra:true}
 ];
 const invalid=badStates.map(s=>({revision:1,state:{...defaults(),...s}}));
 const missing={...defaults()};delete missing.answer;invalid.push({revision:1,state:missing});
 for(const revision of [0,-1,1.5,'1',Number.MAX_SAFE_INTEGER+1])invalid.push({revision,state:defaults()});
 for(const value of invalid){
  const raw=JSON.stringify(value),storage=new MemoryStorage({[KEY]:raw}),h=H({storage});
  h.click('#continue');h.input(Q[0].a);h.click('#check');await tick(h);
  assert.equal(storage.data.get(KEY),raw);assert.equal(storage.writes,0);assert.match(h.status(),/上書きせず/);
 }
});
test('failed reads/writes after valid load and denied locks retain saved bytes until retry',async()=>{
 for(const kind of ['read','write','lock']){
  const storage=new MemoryStorage(seed({unlocked:1,stage:1}));let deny=false;
  const lockManager={request(name,fn){return deny?Promise.reject(Error('lock denied')):Promise.resolve().then(fn);}};
  const h=H({storage,lockManager}),original=storage.data.get(KEY);
  if(kind==='read')storage.failRead=true;if(kind==='write')storage.failWrite=true;if(kind==='lock')deny=true;
  h.click('#continue');h.input(Q[1].a);h.click('#check');await tick(h);
  assert.equal(storage.data.get(KEY),original);assert.match(h.status(),/保存に失敗/);assert.equal(h.get('#answer').disabled,true);
  storage.failRead=false;storage.failWrite=false;deny=false;h.click('#retry-save');await tick(h);
  assert.equal(h.value().state.unlocked,2);assert.match(h.status(),/保存しました/);
 }
});
test('unrelated storage events do not block; removal and clear cannot be overwritten',async()=>{
 const storage=new MemoryStorage(seed({})),h=H({storage});
 h.windowEvent('storage',{key:'another-game',newValue:'x',storageArea:storage});
 h.windowEvent('storage',{key:KEY,newValue:'x',storageArea:new MemoryStorage()});
 h.click('#continue');h.input(Q[0].a);h.click('#check');await tick(h);assert.equal(h.value().state.unlocked,1);
 for(const key of [KEY,null]){
  const s=new MemoryStorage(seed({})),r=H({storage:s});s.data.delete(KEY);r.windowEvent('storage',{key,newValue:null,storageArea:s});
  r.click('#continue');r.input(Q[0].a);r.click('#check');await tick(r);assert.equal(s.data.has(KEY),false);assert.equal(s.writes,0);assert.match(r.status(),/上書きを停止/);
 }
});
test('import cancellation, file-read failure and conflict during async read preserve current record',async()=>{
 const h=H({storage:new MemoryStorage(seed({unlocked:1,stage:1}))}),original=h.storage.data.get(KEY),input=h.get('#import-save');
 const candidate=JSON.stringify({revision:7,state:{...defaults(),unlocked:2,stage:2}});
 const choose=file=>{Object.defineProperty(input,'files',{value:file?[file]:[],configurable:true});h.emit(input,'change');};
 choose(null);await tick(h);assert.equal(h.storage.data.get(KEY),original);
 h.setConfirm(false);choose({size:candidate.length,text:async()=>candidate});await tick(h);assert.equal(h.storage.data.get(KEY),original);
 h.click('#export-save');assert.equal(JSON.parse(await h.downloads.at(-1).text()).state.unlocked,1);
 h.setConfirm(true);choose({size:1,text:async()=>{throw Error('file unavailable');}});await tick(h);assert.equal(h.storage.data.get(KEY),original);assert.match(h.get('#import-status').textContent,/読み込めません/);
 let finish;choose({size:candidate.length,text:()=>new Promise(resolve=>{finish=resolve;})});
 const newer=JSON.stringify({revision:8,state:{...defaults(),unlocked:3,stage:3}});h.storage.data.set(KEY,newer);h.windowEvent('storage',{key:KEY,newValue:newer,storageArea:h.storage});finish(candidate);await tick(h);
 assert.equal(h.storage.data.get(KEY),newer);assert.match(h.get('#import-status').textContent,/復元を中止/);
 h.click('#export-save');assert.equal(JSON.parse(await h.downloads.at(-1).text()).state.unlocked,1);
});
test('final selection page, manual pause, reload cancel and confirmed reload',async()=>{
 const h=H({storage:new MemoryStorage(seed({unlocked:16000,stage:15999}))});h.click('#select');
 assert.match(h.get('#app').textContent,/320 \/ 320/);assert.equal(h.get('#next-page').disabled,true);assert.equal(h.get('[data-stage="15999"]').disabled,false);
 h.click('[data-stage="15999"]');h.input('途中');h.click('#pause');assert.equal(h.get('#pause-panel').hidden,false);assert.equal(h.get('main').inert,true);
 h.click('#resume');assert.equal(h.get('#answer').value,'途中');await tick(h);
 h.setConfirm(false);h.click('#reload');assert.equal(h.reloads(),0);assert.equal(h.get('#answer').value,'途中');
 h.setConfirm(true);h.click('#reload');assert.equal(h.reloads(),1);
 const r=H({storage:h.storage});assert.equal(r.get('#answer').value,'途中');assert.match(r.get('#app').textContent,/STAGE 16,000/);
});
test('script cache tags match content; all same-directory script references exist',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"?]+)\?v=([a-f0-9]+)"><\/script>/g)];assert.equal(scripts.length,2);
 for(const [,name,tag] of scripts){assert.ok(!name.includes('/'));assert.ok(sha(fs.readFileSync(path.join(root,name))).startsWith(tag),name);}
 assert.match(html,/href="\.\.\/\.\.\/browser\/"/);
});
