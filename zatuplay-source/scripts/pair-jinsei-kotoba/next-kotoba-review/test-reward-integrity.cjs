const {env}=require('./harness.cjs');const assert=require('assert/strict');let n=0;const ok=(v,m)=>{assert.ok(v,m);n++};
(async()=>{const e=env();await e.run('KotobaStore.ready');
for(const expr of [
'v.answered=[...DATA.units[0].qids]',
'v.answered=[...DATA.units[0].qids];v.unitRewards=[DATA.units[0].id];v.answered.pop()',
'v.answered=[...DATA.units[0].qids];v.unitRewards=[DATA.units[0].id,DATA.units[0].id]'
])ok(e.run(`(()=>{const v=fresh();${expr};try{KotobaStore.check(v);return false}catch{return true}})()`),expr);
ok(e.run('(()=>{const v=fresh();v.answered=[...DATA.units[0].qids];v.unitRewards=[DATA.units[0].id];return !!KotobaStore.check(v)})()'),'complete reward accepted');
// Resolve a unit by real choose/continueQuiz operations, then review it again.
e.run('openStage(1);startUnit(PREF.get(1).units[0])');let guard=0;while(e.run('!!battle')&&guard++<100){e.run('choose(Q.get(battle.qid).choices.indexOf(Q.get(battle.qid).answer));continueQuiz()')}
ok(guard<100,'unit loop terminates');ok(e.run('S.unitRewards.length===1'),'one unit reward');const orbs=e.run('S.orbs');ok(e.run('!!KotobaStore.check(S)'),'live state valid');
const raw=e.run('KotobaStore.encode(S)');ok(e.run(`KotobaStore.decode(${JSON.stringify(raw)}).data.unitRewards.length===1`),'json roundtrip reward');
e.run('startUnit(PREF.get(1).units[0])');guard=0;while(e.run('!!battle')&&guard++<100)e.run('choose(Q.get(battle.qid).choices.indexOf(Q.get(battle.qid).answer));continueQuiz()');ok(e.run('S.orbs')===orbs,'review no repeated orb');ok(e.run('S.unitRewards.length===1'),'review no duplicate mark');
console.log('PASS',n,'reward integrity');})().catch(e=>{console.error(e);process.exitCode=1});
