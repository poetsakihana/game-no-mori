/* UI/lifecycle adapter. Original content and rule-based readings remain in app.js, arts.js and gallery.js. */
(() => {
  'use strict';
  const store=KotonohaStore;
  let applying=true, timer=null, dirty=false, generation=0, queue=Promise.resolve(true), importing=false, suspended=false;
  let actionDraft=null, failedAction=null;
  const messages={
    ready:'記録と入力はこのブラウザだけに保存します。外部への送信はありません。',
    saved:'記録・入力・選択をこのブラウザに保存しました。',
    pending:'入力・記録を保存しています…',
    cancelled:'確認後に入力が変わったため、復元・削除を中止しました。入力を保護しています。必要ならもう一度操作してください。',
    corrupt:'保存データが壊れているか未対応の形式です。元データを上書きせず保護中です。「元の保存データを退避」または確認付きの復元をご利用ください。',
    unavailable:'ブラウザの保存領域を利用できません。入力と結果は画面内に保持しています。閉じる前にJSONを書き出してください。',
    unsupported:'この環境では安全な複数タブ保存（Web Locks）が使えません。自動保存は行わず、入力と結果を画面内に保持します。閉じる前にJSONを書き出してください。',
    quota:'保存容量が不足しています。以前の保存は変更していません。今回の入力と結果は画面内に保持しています。閉じる前にJSONを書き出してください。',
    conflict:'別のタブで保存が更新されました。上書きを停止しています。このタブの入力と結果はJSONに書き出し、再読み込みして最新の保存を開いてください。',
    invalid:'保存できない形式または記録の上限です。以前の保存を保護しています。入力と結果を確認してください。'
  };
  function status(p){
    const n=$('browserStatus');n.textContent=messages[p]||p;n.dataset.state=['ready','saved','pending'].includes(p)?'ok':'error';
    $('browserRaw').classList.toggle('hidden',store.original===null && p!=='conflict');
  }
  function snapshot(){
    const fields={};for(const id of store.fields)fields[id]=$(id).value||'';
    return {data,ui:{screen:store.screens.find(id=>!$(id).classList.contains('hidden'))||'title',fields,
      active,manualActive,selectedGuide:selectedGuide?.id||null,selectedArt:selectedArt?.id||null,activeArtSession,
      resultVisible:!$('result').classList.contains('hidden'),artResultVisible:!$('artResult').classList.contains('hidden'),ritualPending:ritualBusy}};
  }
  function captureAction(){const f={};for(const id of store.fields)f[id]=$(id).value||'';return {fields:f,generation};}
  function sameAction(draft){return draft&&JSON.stringify(data)===draft.after&&store.fields.every(id=>($(id).value||'')===draft.fields[id]);}
  function recoverClearedFields(draft){
    if(!draft)return;
    for(const id of ['additional','manualQuestion','cardname','reflection','artQuestion','artObservation','artAction']){
      if(!$(id).value && draft.fields[id])$(id).value=draft.fields[id];
    }
  }
  function saveSoon(){
    if(applying)return false;
    dirty=true;generation++;
    if(['ready','saved'].includes(store.phase))status('pending');
    if(timer!==null)clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;flush();},0);
    return false;
  }
  function flush(force=false){
    if(timer!==null){clearTimeout(timer);timer=null;}
    if(applying || (importing&&!force) || !dirty)return queue;
    dirty=false;
    const snap=JSON.parse(JSON.stringify(snapshot())), draft=actionDraft, savedGeneration=generation;actionDraft=null;
    queue=queue.then(async()=>{
      const ok=await store.commit(snap);
      if(!ok){if(generation===savedGeneration){recoverClearedFields(draft);if(draft)failedAction=draft;}dirty=true;}
      else if(sameAction(failedAction)){for(const id of failedAction.cleared)$(id).value='';failedAction=null;saveSoon();}
      return ok;
    }).catch(()=>{status('unavailable');recoverClearedFields(draft);dirty=true;return false;});
    return queue;
  }
  function apply(ui){
    applying=true;
    if(ritualBusy)finishRitual();
    selectedGuide=null;selectedArt=null;active=null;manualActive=null;activeArtSession=null;
    $('chosenGuide').textContent='占い師未選択';
    $('result').classList.add('hidden');$('artResult').classList.add('hidden');$('continuation').classList.add('hidden');$('question').readOnly=false;
    for(const id of store.fields){const n=$(id);if(n.tagName==='SELECT')n.selectedIndex=0;else n.value='';}
    for(const id of ['name','gender','birth','time','place','zone'])$(id).value=data.profile[id]||'';
    if(fortuneGuides.some(g=>g.id===ui.selectedGuide))chooseGuide(ui.selectedGuide);
    if(arts.some(a=>a.id===ui.selectedArt))selectArt(ui.selectedArt);
    for(const [id,value]of Object.entries(ui.fields||{})){const n=$(id);if(!n)continue;if(n.tagName==='SELECT'&&![...n.querySelectorAll('option')].some(o=>(o.getAttribute('value')??o.textContent)===value))n.selectedIndex=0;else n.value=value;}
    oracleOptions();if(ui.fields?.oracleType && oracleTypes.some(o=>o.id===ui.fields.oracleType))$('oracleType').value=ui.fields.oracleType;
    selectedOracle=$('oracleType').value;note();
    const s=data.sessions.find(x=>x.id===ui.active);active=s?.id||null;
    if(s){showContext(s);if(ui.resultVisible||ui.ritualPending)renderResult(s);}
    manualActive=data.journals.some(j=>j.consultationId===ui.manualActive)?ui.manualActive:null;
    const artSession=data.artSessions.find(x=>x.id===ui.activeArtSession&&x.artId===selectedArt?.id);activeArtSession=artSession?.id||null;
    if(artSession){renderArtContext(artSession);if(ui.artResultVisible||ui.ritualPending)renderArtResult(artSession);}
    sessions();journals();manualContext();if(selectedArt)renderArtHistory();
    view(ui.screen==='artwork'&&!selectedArt?'allarts':ui.screen||'title');
    // Restore form drafts after context renderers, which may populate the initial question.
    for(const id of ['additional','artQuestion','artObservation','artAction','manualQuestion','reflection','cardname'])if(ui.fields?.[id]!==undefined)$(id).value=ui.fields[id];
    applying=false;
  }
  function download(text,name){
    if(typeof Blob!=='function'||!URL.createObjectURL)throw Error('download');
    const u=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
    try{const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();}finally{setTimeout(()=>URL.revokeObjectURL(u),1000);}
  }
  backup=function(){try{download(store.encode(snapshot()),'kotonoha-fortune-backup.json');}catch{alert('バックアップを書き出せませんでした。ダウンロードに対応したブラウザをご利用ください。');}};
  restoreFile=async function(input){
    const file=input.files?.[0];input.value='';
    if(!file||importing)return;
    importing=true;
    try{
      if(file.size>store.MAX_BYTES)throw Error('size');
      const decoded=store.decode(await file.text(),true);
      await flush(true);
      let expected;try{expected=store.getCurrent();}catch{status('unavailable');return;}
      if(!confirm('現在の記録と入力を、このバックアップの内容で置き換えますか？必要なら先に取消してJSONを書き出してください。'))return;
      const start=generation;
      const ok=await store.commit(decoded,{replace:true,expected,shouldContinue:()=>generation===start});
      if(ok){
        data=decoded.data;failedAction=null;apply(decoded.ui);dirty=false;status('saved');
      }
    }catch{alert('対応するバックアップを読み込めませんでした。元の記録と入力は変更していません。');}
    finally{input.value='';importing=false;if(dirty)saveSoon();}
  };
  erase=async function(){
    if(importing)return;importing=true;
    try{
      await flush(true);let expected;try{expected=store.getCurrent();}catch{status('unavailable');return;}
      if(!confirm('この作品の相談・プロフィール・カード記録・入力をすべて削除しますか？他の作品の保存は変更しません。必要なら先に取消してJSONを書き出してください。'))return;
      const empty={data:{profile:{},sessions:[],journals:[],artSessions:[]},ui:store.normalizeUI()}, start=generation;
      if(await store.commit(empty,{replace:true,expected,shouldContinue:()=>generation===start})){data=empty.data;failedAction=null;apply(empty.ui);dirty=false;status('saved');}
    }finally{importing=false;if(dirty)saveSoon();}
  };
  // Native dialog fallback is local and still exposes explicit Close/Escape.
  const dialog=$('cardPreview');
  if(typeof dialog.showModal!=='function'){
    dialog.showModal=function(){this.setAttribute('open','');this.open=true;this.setAttribute('role','dialog');this.setAttribute('aria-modal','true');this.querySelector('button')?.focus();};
    dialog.close=function(){this.removeAttribute('open');this.open=false;};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open)dialog.close();});
  }
  for(const label of document.querySelectorAll('label')){const n=label.nextElementSibling;if(n?.id&&['INPUT','SELECT','TEXTAREA'].includes(n.tagName))label.htmlFor=n.id;}
  if(!globalThis.crypto || typeof crypto.getRandomValues!=='function'){
    random=n=>Math.floor(Math.random()*n);
    $('methodnote').textContent+=' この環境では簡易乱数を利用します。';
  }
  apply(store.initialUI);store.subscribe(status);
  if(store.initialUI.ritualPending && ['ready','saved'].includes(store.phase))$('browserStatus').textContent='中断前に引いたカードと入力を読み込みました。再抽選せず結果を表示しています。';
  const original={view,reading,manualSave,runArt,saveProfile,chooseGuide,chooseTopic,newSession,newManualConsultation,selectArt,resetArtConsultation,finishRitual,deepen,continueArt};
  view=function(...args){const r=original.view(...args);saveSoon();return r;};
  function action(kind,args){
    if(failedAction?.kind===kind&&sameAction(failedAction)){store.retry();dirty=true;flush();return;}
    const before=JSON.stringify(data),draft=captureAction(),r=original[kind](...args),after=JSON.stringify(data);
    if(before!==after){draft.kind=kind;draft.after=after;draft.cleared=['additional','manualQuestion','cardname','reflection','artQuestion','artObservation','artAction'].filter(id=>draft.fields[id]&&!$(id).value);actionDraft=draft;}
    saveSoon();return r;
  }
  reading=function(...args){return action('reading',args);};
  manualSave=function(...args){return action('manualSave',args);};
  runArt=function(...args){return action('runArt',args);};
  saveProfile=function(...args){const r=original.saveProfile(...args);saveSoon();return r;};
  chooseGuide=function(...args){const r=original.chooseGuide(...args);saveSoon();return r;};
  chooseTopic=function(...args){const r=original.chooseTopic(...args);saveSoon();return r;};
  newSession=function(...args){const r=original.newSession(...args);saveSoon();return r;};
  newManualConsultation=function(...args){const r=original.newManualConsultation(...args);saveSoon();return r;};
  selectArt=function(...args){const r=original.selectArt(...args);saveSoon();return r;};
  resetArtConsultation=function(...args){const r=original.resetArtConsultation(...args);saveSoon();return r;};
  finishRitual=function(...args){const r=original.finishRitual(...args);saveSoon();return r;};
  deepen=function(...args){const r=original.deepen(...args);saveSoon();return r;};
  continueArt=function(...args){const r=original.continueArt(...args);saveSoon();return r;};
  document.addEventListener('input',saveSoon);document.addEventListener('change',saveSoon);
  document.addEventListener('click',()=>{if(!applying)saveSoon();});
  function stop(){
    suspended=true;
    if(ritualBusy)finishRitual();
    saveSoon();flush();
  }
  window.addEventListener('blur',stop);
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else suspended=false;});
  window.addEventListener('pageshow',()=>{suspended=false;});
  window.addEventListener('beforeunload',e=>{if(dirty||['corrupt','conflict','quota','unavailable','unsupported','invalid'].includes(store.phase)){e.preventDefault();e.returnValue='';}});
  window.KotonohaBrowser={version:'1.0.3-web.1',saveSoon,flush,snapshot,
    async retry(){store.retry();dirty=true;const ok=await flush();if(ok&&dirty)return flush();return ok;},
    exportOriginal(){try{const raw=store.original??store.getCurrent();if(raw!==null)download(raw,'kotonoha-fortune-original-save.json');}catch{alert('元データを退避できませんでした。ブラウザの保存設定をご確認ください。');}}
  };
})();
