'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {harness,MemoryStorage,lockManager,C,root,data}=require('./can-to-crown-harness.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');let passed=0;
const eq=(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
const seed=()=>{let n=137;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
async function test(name,fn){await fn();console.log(`PASS ${++passed}: ${name}`);}
async function start(options){const h=harness(options);await h.settle();h.click('#resume');await h.settle();return h;}
const nav=(h,n)=>h.click(`[data-id="nav-${n}"]`);
function fixture(state){const storage=new MemoryStorage();storage.setItem(C.KEY,JSON.stringify({format:C.FORMAT,version:1,revision:1,writer:'test',state}));return storage;}
(async()=>{
await test('original DEX and 240 expansion values; all base arrays/order and mirror hashes',()=>{
 assert.equal(sha(fs.readFileSync(path.join(root,'reference/classes.dex'))),'e84a0887e007fd1346ac15911a3b937b0184d8e4beae3c737e8602915cd9e028');
 assert.equal(sha(fs.readFileSync(path.join(root,'reference/original-data.json'))),'a6e105ac5843edf89fc17fdb63f35354234696f0e19b81484ec0773f1d791d10');
 assert.equal(Object.keys(data.expansion).length,12);for(const a of Object.values(data.expansion))assert.equal(a.length,20);
 assert.equal(Object.keys(data.base).length,8);eq(data.base.prices,[12,28,65,150,350]);eq(data.base.unlock,[0,1000,12000,120000,1000000]);eq(data.base.costs,[500,4000,35000,300000,2500000,20000000]);eq(data.base.income,[8,75,700,6500,60000,550000]);
 const mirror=path.resolve(root,'../../../../zatuplay/games/can-to-crown');
 for(const file of fs.readdirSync(root,{recursive:true}).filter(x=>fs.statSync(path.join(root,x)).isFile()))assert.equal(sha(fs.readFileSync(path.join(root,file))),sha(fs.readFileSync(path.join(mirror,file))),file);
});
await test('20 cans, exact RNG branches, capacity limits, price multiplier, sale and empty rejection',()=>{
 const g=new C.Game(data,null,()=>.99);assert.equal(g.maxBag(),20);eq(g.s.cans,Array(20).fill(1));
 for(let i=0;i<20;i++)assert(g.pick(i));assert.equal(g.s.bag,20);const taps=g.s.taps;assert(!g.pick(0));assert.equal(g.s.taps,taps);assert(g.sell());assert.equal(g.s.cash,240);assert.equal(g.s.sold,20);assert(!g.sell());
 assert(g.buy('tool'));assert.equal(g.s.cash,160);assert(g.buy('capacity'));assert.equal(g.maxBag(),50);assert.equal(g.s.cash,60);g.pick(0);assert.equal(g.s.bag,2);
 const gold=new C.Game(data,null,()=>0);assert(gold.s.cans.every(v=>v===3));gold.pick(0);assert.equal(gold.s.bag,3);assert.equal(gold.s.itemBits,1);
});
await test('all upgrades preserve original prices/caps; insufficient funds do not change progress',()=>{
 const g=new C.Game(data);for(const t of ['tool','capacity','cart','homes','business'])assert(!g.buy(t));
 for(const [type,max,base,mult] of [['tool',15,80,2.3],['capacity',20,100,2],['cart',15,200,2.5],['homes',4,300,12],['business',6]]){
  for(let level=0;level<max;level++){const expected=type==='business'?data.base.costs[level]:base*mult**level;assert(Math.abs(g.cost(type)-expected)<1e-5);g.earn(expected);const before=g.s.cash;assert(g.buy(type));assert.equal(g.s[type],level+1);assert(Math.abs(g.s.cash-(before-expected))<1e-5);}
  const old=g.s.cash;assert(!g.buy(type));assert.equal(g.s.cash,old);
 }
});
await test('area unlock uses cumulative earnings, bag blocks movement, sale price uses selected area',()=>{
 const g=new C.Game(data,null,()=>.99);for(let i=1;i<5;i++)assert(!g.move(i));
 for(let i=1;i<5;i++){g.earn(data.base.unlock[i]-g.s.total);g.s.cash=0;g.pick(0);assert(!g.move(i));g.sell();assert(g.move(i));assert.equal(g.s.zone,i);g.pick(0);assert.equal(g.value(),data.base.prices[i]);g.sell();}
});
await test('all 20 NPCs, one-time gifts, quest requirements/deltas/reports/cancellation and no duplicate rewards',()=>{
 const g=new C.Game(data,null,()=>.99);g.earn(1e6);
 for(let i=0;i<20;i++){
  g.s.bag=0;assert(g.move(Math.floor(i/4)));const before=g.s.cash;assert(g.meet(i));assert.equal(g.s.cash-before,data.base.prices[g.s.zone]*10);assert(!g.meet(i));assert(g.accept(i));assert(!g.accept(i));
  const t=data.expansion.QTYPE[i],need=data.expansion.NEED[i];
  if(t<3){assert.equal(g.progress(i),0);const key=['picked','sold','total'][t];g.s[key]+=need-1;assert(!g.report());g.s[key]++;}else{const key=['','','','tool','business','homes'][t];g.s[key]=need-1;assert(!g.report());g.s[key]=need;}
  assert.equal(g.progress(i),need);const cash=g.s.cash;assert(g.report());assert(Math.abs(g.s.cash-cash-g.questReward(i))<1e-7);assert(!g.report());assert(!g.accept(i));
 }
 assert.equal(g.s.peopleBits,1048575);assert.equal(g.s.questBits,1048575);assert.equal(g.s.reputation,60);
 const c=new C.Game(data);c.meet(0);c.accept(0);assert(c.cancelQuest());assert(c.accept(0));assert.equal(c.progress(0),0);
});
await test('20 event order, all effects, quarter rest reward, tap/activity triggers and wall-clock expiry',()=>{
 let now=100000;const g=new C.Game(data,null,()=>.99,()=>now);
 for(let i=0;i<20;i++){assert(g.triggerEvent());assert.equal(g.s.pendingEvent.id,i);assert(!g.triggerEvent());const reward=g.s.pendingEvent.reward,cash=g.s.cash;g.chooseEvent(true);assert.equal(g.s.cash-cash,reward);const effect=data.expansion.EFFECT[i];if(effect===1)assert.equal(g.s.saleUntil,now+60000);if(effect===2)assert.equal(g.s.pickUntil,now+60000);if(effect===3)assert.equal(g.s.bizUntil,now+60000);now+=60001;}
 assert.equal(g.s.eventBits,1048575);g.triggerEvent();assert.equal(g.s.pendingEvent.id,0);const reward=g.s.pendingEvent.reward,cash=g.s.cash;g.chooseEvent(false);assert.equal(g.s.cash-cash,reward/4);
 const h=new C.Game(data,null,()=>.99,()=>now);for(let i=0;i<25;i++){h.pick(0);if(h.s.bag===20)h.sell();}assert.equal(h.s.pendingEvent.id,0);h.chooseEvent(true);assert.equal(h.s.pickUntil,now+60000);const bag=h.s.bag;h.pick(0);assert.equal(h.s.bag-bag,2);now+=60001;const bag2=h.s.bag;h.pick(0);assert.equal(h.s.bag-bag2,1);
 const menu=new C.Game(data);menu.s.business=1;menu.s.total=500;for(let i=0;i<60;i++)menu.tick(1,false);assert.equal(menu.s.pendingEvent,null);assert.equal(menu.s.eventClock,0);assert.equal(menu.s.cash,480);
 const timed=new C.Game(data);for(let i=0;i<59;i++)timed.tick(1);assert.equal(timed.s.pendingEvent,null);timed.tick(1);assert.equal(timed.s.pendingEvent.id,0);
});
await test('all 20 achievements conditions, rewards and duplicate rejection; total vs cash ending',()=>{
 const g=new C.Game(data);for(let i=0;i<20;i++)assert(!g.claim(i));g.s.picked=5000;g.s.sold=10000;g.s.total=1e7;g.s.reputation=30;g.s.itemBits=1048575;
 for(let i=0;i<20;i++){const before=g.s.cash;assert(g.claim(i));assert(Math.abs(g.s.cash-before-200*1.6**i)<1e-6);assert(!g.claim(i));}assert.equal(g.s.achievementBits,1048575);
 const h=new C.Game(data);h.s.total=1e9;h.s.cash=99999999;h.tick(0);assert(!h.s.ended);h.earn(1);assert(h.checkEnd());assert.equal(h.s.page,4);h.s.page=0;assert(!h.checkEnd());
});
await test('ordinary rule-driven economy reaches ending without injected currency; save resumes full progress',()=>{
 let now=100000;const g=new C.Game(data,null,seed(),()=>now);g.meet(0);g.accept(0);let seconds=0;
 while(!g.s.ended&&seconds<20000){
  if(g.s.pendingEvent)g.chooseEvent(true);
  for(let n=0;n<12;n++){if(g.s.pendingEvent)g.chooseEvent(true);if(g.s.bag===g.maxBag())g.sell();g.pick(n%20);}
  if(g.s.pendingEvent)g.chooseEvent(true);g.sell();
  if(g.s.activeQuest>=0&&g.progress(g.s.activeQuest)>=g.e.NEED[g.s.activeQuest])g.report();
  for(let i=0;i<20;i++)if(g.achMetric(g.e.ATYPE[i])>=g.e.ANEED[i]&&!g.discovered(4,i))g.claim(i);
  for(let i=4;i>g.s.zone;i--)if(g.s.total>=g.b.unlock[i]){g.move(i);for(let j=0;j<4;j++)g.meet(i*4+j);break;}
  if(g.s.business<6&&g.s.cash>=g.cost('business'))g.buy('business');
  for(const t of ['tool','capacity','cart'])if(g.s[t]<({tool:10,capacity:10,cart:7}[t])&&g.s.cash>g.cost(t)*3)g.buy(t);
  g.tick(1);now+=1000;seconds++;
 }
 assert(g.s.ended);assert.equal(g.s.business,6);assert.equal(g.s.zone,4);assert(g.s.cash>=1e8);const storage=new MemoryStorage(),store=new C.SaveStore(storage,'one');store.load();store.save(g.s);const loaded=new C.Game(data,new C.SaveStore(storage,'two').load());eq(loaded.s,g.s);console.log('  Rule-driven ending at',seconds,'active seconds; not manual browser play.');
});
await test('save corruption/read-write failures and stale saves never replace original; validation strict',()=>{
 const g=new C.Game(data),storage=new MemoryStorage(),one=new C.SaveStore(storage,'one'),two=new C.SaveStore(storage,'two');one.load();two.load();one.save(g.s);const raw=storage.getItem(C.KEY);assert.throws(()=>two.save(g.s));assert.equal(storage.getItem(C.KEY),raw);
 const good=new C.SaveStore(storage,'good');good.load();storage.failWrite=true;assert.throws(()=>good.save(g.s));storage.failWrite=false;assert.equal(storage.getItem(C.KEY),raw);
 storage.setItem(C.KEY,'bad');const bad=new C.SaveStore(storage,'bad');assert.throws(()=>bad.load());assert.throws(()=>bad.save(g.s));assert.equal(storage.getItem(C.KEY),'bad');
 for(const changes of [{cash:NaN},{cash:-1},{zone:5},{bag:21},{tool:16},{activeQuest:20},{cans:[1]},{cash:100,total:0}])assert.throws(()=>C.validateState({...g.s,...changes}));
});
await test('actual Canvas2D and DOM new game, first quest, sell, claim, unlock, save/reload',async()=>{
 const h=await start();h.png('/tmp/can-crown-field.png');assert.equal(h.get('#curtain').hidden,true);assert.equal(h.get('[data-id="can-0"]').getAttribute('aria-label').includes('を拾う'),true);
 nav(h,3);h.click('[data-id="npc"]');h.dialogButton('清掃員・まこと');h.dialogButton('依頼を受ける');nav(h,0);
 for(let i=0;i<40&&h.state().picked<25;i++){if(h.state().pendingEvent)h.dialogButton('参加する');if(h.state().bag===20)h.click('[data-id="sell"]');h.click('[data-id="can-0"]');}
 if(h.state().pendingEvent)h.dialogButton('参加する');nav(h,3);h.click('[data-id="quest"]');h.dialogButton('報告する');assert.equal(h.state().questBits,1);assert.equal(h.state().activeQuest,-1);
 h.click('[data-id="achievements"]');h.dialogButton('受取可 はじめの一缶');assert(h.state().achievementBits&1);h.png('/tmp/can-crown-town.png');
 const before=h.raw();const reload=harness({storage:h.storage});await reload.settle();assert.equal(reload.raw(),before);assert.equal(reload.get('#resume').textContent,'つづきから');reload.click('#resume');await reload.settle();assert.equal(reload.state().questBits,1);
});
await test('UI keyboard/touch click mapping, pause/blur/hidden/stall require explicit resume',async()=>{
 const s=C.fresh(()=>.99);s.cash=0;s.total=500;s.business=1;const h=await start({storage:fixture(s)});h.advance(500);assert(h.state().cash<9);h.emit(h.document,'keydown',{key:'ArrowRight'});assert.equal(h.document.activeElement.dataset.id,'can-1');h.click(h.document.activeElement);assert.equal(h.state().bag,1);h.emit(h.document,'keydown',{key:'s'});assert.equal(h.state().bag,0);
 for(const mode of ['pause','hidden','blur','stall']){if(mode==='pause')h.click('#pause');if(mode==='hidden')h.visibility(true);if(mode==='blur')h.windowEvent('blur');if(mode==='stall')h.gap(2500);const raw=h.raw();h.advance(6000);assert.equal(h.raw(),raw);assert(!h.get('#curtain').hidden);h.visibility(false);h.windowEvent('focus');assert(!h.get('#curtain').hidden);h.click('#resume');await h.settle();assert(h.get('#curtain').hidden);h.advance(100);}
});
await test('pending event retains identity/reward across pause and reload; no replay or automatic choice',async()=>{
 const s=C.fresh();s.pendingEvent={id:3,reward:360};s.eventCursor=4;const storage=fixture(s),h=await start({storage});assert.equal(h.get('#dialog-title').textContent,'街イベント：港の朝市');h.visibility(true);assert.equal(h.get('#dialog').open,false);assert(h.state().pendingEvent);const loaded=await start({storage});assert.equal(loaded.get('#dialog-title').textContent,'街イベント：港の朝市');loaded.dialogButton('休憩する');assert.equal(loaded.state().cash,90);assert.equal(loaded.state().pendingEvent,null);
});
await test('all 100 journal details are accessible; all six original pages render',async()=>{
 const s=C.fresh();s.total=1e8;s.cash=1e8;s.ended=true;const h=await start({storage:fixture(s)});
 for(let n=0;n<5;n++){nav(h,n);h.png('/tmp/can-crown-page-'+n+'.png');}nav(h,3);h.click('[data-id="journal"]');
 const labels=['イベント','街人','依頼','収集品','実績'],keys=['EVENTS','PEOPLE','QUESTS','ITEMS','ACHIEVEMENTS'];
 for(let cat=0;cat<5;cat++){h.dialogButton(labels[cat]+' 20種類');for(let i=0;i<20;i++){const choices=[...h.document.querySelectorAll('#dialog-actions button')];h.click(choices[i]);assert.equal(h.get('#dialog-title').textContent,data.expansion[keys[cat]][i]);assert(h.get('#dialog-body').textContent.length>8);h.dialogButton('図鑑へ');}h.dialogButton('分類へ');}h.dialogButton('戻る');nav(h,4);h.click('[data-id="ending"]');h.png('/tmp/can-crown-ending.png');h.click('[data-id="after-ending"]');assert.equal(h.state().page,0);
});
await test('reset cancellation leaves progress; confirmed reset preserves original backup and audio setting',async()=>{
 const h=await start();h.click('[data-id="can-0"]');nav(h,4);h.click('[data-id="sound"]');const old=h.raw();h.click('[data-id="reset"]');h.dialogButton('戻る');assert.equal(h.raw(),old);h.click('[data-id="reset"]');h.dialogButton('やり直す');assert.equal(h.state().picked,0);assert.equal(h.state().sound,false);assert.equal(h.storage.getItem(C.KEY+'.before-reset'),old);
});
await test('exclusive Web Lock protects against two-tab writers; pagehide releases lock',async()=>{
 const storage=new MemoryStorage(),locks=lockManager();const first=await start({storage,locks});const second=harness({storage,locks});await second.settle();second.click('#resume');await second.settle();assert(second.get('#curtain-text').textContent.includes('ほかのタブ'));const old=second.raw();first.click('[data-id="can-0"]');second.click('#resume');await second.settle();assert.equal(second.raw(),first.raw());assert.notEqual(first.raw(),old);first.windowEvent('pagehide');await first.settle();second.click('#resume');await second.settle();assert(second.get('#curtain-title').textContent.includes('保護'));

});
await test('without Web Locks no storage writes occur, including reset/import, and progress can be exported',async()=>{
 const source=C.fresh(()=>.99);source.picked=10;source.bag=10;const storage=fixture(source),old=storage.getItem(C.KEY),writes=storage.writes;
 const a=await start({storage,locks:null}),b=await start({storage,locks:null});assert(!a.get('#storage-warning').hidden);a.click('[data-id="can-0"]');a.click('[data-id="sell"]');a.advance(1000);assert.equal(a.raw(),old);assert.equal(storage.writes,writes);
 a.click('#backup');a.dialogButton('現在の進行を書き出す');const exported=await a.downloads[0].text();assert(C.decode(exported).state.picked>source.picked);
 a.click('#resume');await a.settle();nav(a,4);a.click('[data-id="reset"]');a.dialogButton('やり直す');assert.equal(storage.writes,writes);
 await a.importText(exported);a.dialogButton('復元する');await a.settle();assert.equal(a.get('#dialog-title').textContent,'保存の復元はできません');assert.equal(a.raw(),old);assert.equal(storage.writes,writes);assert.equal(b.raw(),old);
});
await test('UI resource/data/storage failures stop without overwriting; storage event pauses stale tab',async()=>{
 for(const options of [{dataFailure:true},{malformed:true},{deniedGetter:true}]){const h=harness(options);await h.settle();assert(!h.get('#retry').hidden);assert.equal(h.storage.writes,0);}
 const storage=new MemoryStorage();storage.setItem(C.KEY,'bad');const raw=storage.getItem(C.KEY),h=harness({storage});await h.settle();assert(!h.get('#retry').hidden);assert.equal(storage.getItem(C.KEY),raw);
 const live=await start();live.storage.failWrite=true;const old=live.raw();live.click('[data-id="can-0"]');assert(!live.get('#curtain').hidden);assert.equal(live.raw(),old);assert(!live.get('#export').hidden);live.click('#export');assert.equal(live.downloads.length,1);
 const ext=await start();ext.storage.setItem(C.KEY,'other');ext.windowEvent('storage',{key:C.KEY});assert(!ext.get('#curtain').hidden);assert.equal(ext.raw(),'other');
});
await test('JSON export/import exact state, cancel, same-file selection, invalid file and backup protection',async()=>{
 const h=await start();h.click('[data-id="can-0"]');h.click('#backup');const old=h.raw();h.dialogButton('現在の進行を書き出す');assert.equal(h.downloads.length,1);const exported=await h.downloads[0].text();eq(C.decode(exported).state,h.state());
 await h.importText(exported);h.dialogButton('キャンセル');assert.equal(h.raw(),old);
 await h.importText(exported);h.dialogButton('復元する');await h.settle();eq(h.state(),C.decode(exported).state);assert.equal(h.storage.getItem(C.KEY+'.before-import'),old);assert(!h.get('#curtain').hidden);
 await h.importText(exported);h.dialogButton('復元する');await h.settle();eq(h.state(),C.decode(exported).state);
 const good=h.raw();await h.importText('{"bad":true}');assert(h.get('#dialog-title').textContent.includes('読み込めません'));assert.equal(h.raw(),good);
 const badStore=new MemoryStorage();badStore.setItem(C.KEY,'corrupt-original');const recovered=harness({storage:badStore});await recovered.settle();await recovered.importText(exported);recovered.dialogButton('復元する');await recovered.settle();eq(recovered.state(),C.decode(exported).state);assert.equal(badStore.getItem(C.KEY+'.before-import'),'corrupt-original');
});
await test('ending is cash-based even on event boundary; runtime failure freezes the current save',async()=>{
 const g=new C.Game(data,null,()=>.99,()=>100000);g.s.cash=99999999;g.s.total=1e8;g.s.business=1;g.s.eventClock=59;g.tick(1);assert(g.s.ended);assert.equal(g.s.page,4);assert.equal(g.s.pendingEvent,null);assert.equal(g.s.eventCursor,0);
 const h=await start();const old=h.raw();h.windowEvent('error');assert(!h.get('#curtain').hidden);assert.equal(h.raw(),old);h.advance(10000);assert.equal(h.raw(),old);
});
await test('audio start/stop/mute persistence and unavailable audio are safe; no external runtime or debug hook',async()=>{
 const h=await start();h.click('[data-id="can-0"]');assert(h.audioLog.includes('start'));h.click('#pause');assert(h.audioLog.includes('suspend'));h.click('#resume');await h.settle();nav(h,4);h.click('[data-id="sound"]');const starts=h.audioLog.filter(x=>x==='start').length;nav(h,0);h.click('[data-id="can-0"]');assert.equal(h.audioLog.filter(x=>x==='start').length,starts);
 const no=await start({audio:false});no.click('[data-id="can-0"]');assert(no.state().picked>0);assert(no.get('#status').textContent.includes('音'));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert(!/https?:\/\//.test(html+app));assert(!/__test|debugger|eval\(/.test(app));assert(html.includes('href="../../browser/"'));
});
console.log(`All ${passed} groups passed. DOM/audio clocks are test models; Canvas2D is real. Browser/manual gameplay, mobile and audible QA are separate.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
