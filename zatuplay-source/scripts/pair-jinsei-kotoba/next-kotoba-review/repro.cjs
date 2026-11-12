const {env}=require('./harness.cjs');
(async()=>{let e=env();await e.run('KotobaStore.ready');e.run('S.xp=1e9;save();openStage(1);startUnit(PREF.get(1).units[0]);choose(Q.get(battle.qid).choices.indexOf(Q.get(battle.qid).answer))');console.log('cap',e.run('JSON.stringify({xp:S.xp,saved:KotobaStore.data.xp,status:KotobaStore.phase,exportable:(()=>{try{KotobaStore.encode(S);return true}catch{return false}})()})'));
e=env();await e.run('KotobaStore.ready');console.log('locked answers accepted',e.run('(()=>{const v=fresh();v.answered=[DATA.questions.find(q=>q.pref===47).id];try{KotobaStore.check(v);return true}catch{return false}})()'));
})();
