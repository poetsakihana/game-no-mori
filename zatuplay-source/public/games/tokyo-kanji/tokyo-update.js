(() => {
  'use strict';
  const KEY='tokyo-yomimeguri-v1', LOCK=KEY+':writer', groups=['23区','多摩','島しょ'];
  function createStore(storage, locks, valid, onPhase=()=>{}){
    let baseline=null, loaded=false, queue=Promise.resolve(), hasBackup=false, blocked=false;
    const phase=(name)=>onPhase(name,hasBackup,!!locks&&loaded&&!blocked);
    function ids(x){
      if(!Array.isArray(x)||x.length>valid.size||x.some(id=>typeof id!=='string'||!valid.has(id)))throw Error('invalid');
      return [...new Set(x)].sort();
    }
    function decode(raw){
      if(raw===null)return {solved:[],backup:null};
      const data=JSON.parse(raw);
      if(!data||data.version!==1)throw Error('invalid');
      return {solved:ids(data.solved),backup:data.backup==null?null:ids(data.backup)};
    }
    function load(){
      try{
        baseline=storage.getItem(KEY);
        const x=decode(baseline);loaded=true;hasBackup=x.backup!==null;
        phase(locks?'ready':'unsupported');return x.solved;
      }catch{blocked=true;phase('invalid');return [];}
    }
    function write(kind, additions){
      const operation=async()=>{
        if(!loaded||blocked||!locks)return {ok:false};
        try{
          return await locks.request(LOCK,{mode:'exclusive'},()=>{
            if(blocked)return {ok:false};
            const current=storage.getItem(KEY);
            if(current!==baseline){blocked=true;phase('conflict');return {ok:false};}
            const old=decode(current);
            let x;
            if(kind==='reset')x={solved:[],backup:old.solved};
            else if(kind==='restore'){if(old.backup===null)return {ok:false};x={solved:old.backup,backup:old.solved};}
            else x={solved:ids(additions),backup:old.backup};
            if(JSON.stringify(x)!==JSON.stringify(old)){
              const next=JSON.stringify({version:1,solved:x.solved,...(x.backup===null?{}:{backup:x.backup})});
              storage.setItem(KEY,next);baseline=next;
            }
            hasBackup=x.backup!==null;phase('saved');return {ok:true,solved:x.solved};
          });
        }catch{phase('failure');return {ok:false};}
      };
      const job=queue.then(operation,operation);queue=job;return job;
    }
    return {load,save:solved=>write('save',Array.from(solved)),reset:()=>write('reset'),restore:()=>write('restore'),
      observe:(raw)=>{if(loaded&&raw!==baseline){blocked=true;phase('conflict');}}, get backup(){return hasBackup}};
  }
  function pickPractice(regions, solved, rng=Math.random){
    return groups.map(group=>{
      const pool=regions.filter(region=>region.group===group).flatMap(region=>region.questions.map(q=>({...q,group,region:region.name})));
      const untasted=pool.filter(q=>!solved.has(q.id));
      const choices=untasted.length?untasted:pool;
      return choices[Math.floor(rng()*choices.length)];
    });
  }
  const normalize=s=>s.normalize('NFKC').replace(/[\s・･]/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
  if(typeof module!=='undefined')module.exports={KEY,createStore,pickPractice,normalize};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id);
  let solution=new Set(),regions=[],manager=null,apply=null,mutating=false,ready=false,clear=false;
  let questions=[],index=0,score=0,revealed=false,pending=null,latestPhase=[],awaitingState=null;
  const status={
    ready:'記録はこのブラウザに保存します。',
    saved:'記録を保存しました。',
    unsupported:'安全な保存機能のないブラウザです。今ある記録は読み込めますが、新しい進行は保存しません。',
    invalid:'元の記録が読めませんでした。上書きせずに保護しています。',
    conflict:'別のタブで記録が変わりました。上書きを止めました。タブを閉じてから再読込してください。',
    failure:'保存できませんでした。元の記録は変更していません。'
  };
  function state(phase, backup, writable){
    latestPhase=[phase,backup,writable];
    $('tokyo-status').textContent=status[phase];
    $('tokyo-reset').disabled=!writable||mutating;
    $('tokyo-recover').hidden=!backup;
    $('tokyo-recover').disabled=!writable||mutating;
  }
  function open(id){const el=$(id);if(!el.open)el.showModal();}
  function beginPractice(){
    questions=pickPractice(regions,solution);index=0;score=0;$('tokyo-practice-form').hidden=false;$('tokyo-round-end').hidden=true;$('tokyo-replay').hidden=true;
    nextQuestion();open('tokyo-practice-dialog');$('tokyo-answer').focus();
  }
  function nextQuestion(){
    if(index===questions.length){
      $('tokyo-practice-form').hidden=true;$('tokyo-round-end').hidden=false;
      $('tokyo-round-end').textContent='三つの路をめぐりました。'+score+' / '+questions.length+' 問正解。気になった地名は、本編でまた訪ねてみましょう。';
      $('tokyo-replay').hidden=false;$('tokyo-replay').focus();return;
    }
    const q=questions[index];revealed=false;
    $('tokyo-prompt').textContent=(index+1)+' / 3 ・ '+q.group+' ／ '+q.region+'：'+q.word;
    $('tokyo-answer').value='';$('tokyo-answer').readOnly=false;$('tokyo-feedback').textContent='';
    $('tokyo-next').textContent='答える';$('tokyo-peek').disabled=false;
  }
  function answer(correct){
    const q=questions[index];revealed=true;score+=Number(correct);
    $('tokyo-answer').readOnly=true;$('tokyo-peek').disabled=true;
    $('tokyo-feedback').textContent=(correct?'正解！':'この地名は')+' 「'+q.answer+'」'+(correct?'。':' と読みます。');
    $('tokyo-next').textContent=index===2?'結果を見る':'次の地域へ';$('tokyo-next').focus();
  }
  $('tokyo-practice-form').addEventListener('submit',e=>{
    e.preventDefault();
    if(revealed){index++;nextQuestion();if(index<questions.length)$('tokyo-answer').focus();return;}
    const value=normalize($('tokyo-answer').value);
    if(!value){$('tokyo-feedback').textContent='地名の読みを入力してください。';$('tokyo-answer').focus();return;}
    answer(value===normalize(questions[index].answer));
  });
  $('tokyo-peek').addEventListener('click',()=>answer(false));
  $('tokyo-practice').addEventListener('click',beginPractice);
  $('tokyo-replay').addEventListener('click',beginPractice);
  $('tokyo-ending').addEventListener('click',()=>{if(clear)open('tokyo-ending-dialog');});
  for(const close of document.querySelectorAll('[data-tokyo-close]'))close.addEventListener('click',()=>close.closest('dialog').close());
  function ask(action){
    if(mutating||!ready)return;
    pending=action;
    const restore=action==='restore';
    $('tokyo-confirm-title').textContent=restore?'リセット前の記録を復元しますか？':'東京よみめぐりを最初から遊びますか？';
    $('tokyo-confirm-copy').textContent=restore?'今の記録は同じバックアップ枠に差し替えて保存します。':'現在の正解・お宝は初期状態に戻り、直前の記録をこの端末に一つ保存します。以前のバックアップは置き換わります。';
    $('tokyo-confirm').textContent=restore?'復元する':'リセットする';
    open('tokyo-confirm-dialog');
  }
  $('tokyo-reset').addEventListener('click',()=>ask('reset'));
  $('tokyo-recover').addEventListener('click',()=>ask('restore'));
  $('tokyo-confirm').addEventListener('click',async()=>{
    if(mutating||!pending)return;
    const op=pending;pending=null;mutating=true;
    state(...latestPhase);
    const res=await manager[op]();mutating=false;
    state(...latestPhase);
    if(res.ok){
      awaitingState=new Set(res.solved);apply(awaitingState);
      $('tokyo-status').textContent=op==='reset'?'はじめの状態に戻しました。直前の記録を復元できます。':'リセット前の記録を復元しました。';
    }
    $('tokyo-confirm-dialog').close();
  });
  window.TokyoExtra={
    connect(catalog,onApply){
      regions=catalog;apply=onApply;
      const known=new Set(catalog.flatMap(r=>r.questions.map(q=>q.id)));
      let backing;try{backing=window.localStorage;}catch{backing=null;}
      manager=createStore(backing,navigator.locks&&typeof navigator.locks.request==='function'?navigator.locks:null,known,state);
      const first=manager.load();ready=true;
      addEventListener('storage',e=>{if(e.key===KEY||e.key===null)manager.observe(e.newValue);});
      $('tokyo-practice').disabled=false;
      return new Set(first);
    },
    state(solved,done){solution=solved;clear=done;$('tokyo-ending').hidden=!done;},
    save(solved){if(mutating||(awaitingState&&solved!==awaitingState))return;awaitingState=null;return manager.save(solved);}
  };
})();
