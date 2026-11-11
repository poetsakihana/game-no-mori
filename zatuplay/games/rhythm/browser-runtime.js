/* The original game owns charts/scoring. This adapter only stops and restores clocks. */
'use strict';
(() => {
  const panel=$('#browser-pause-panel'),resume=$('#browser-resume'),message=$('#browser-pause-message');
  const playRoot=document.querySelector('main');
  let suspension=Promise.resolve();
  let suspended=null,serial=0,readyTimer=null,previousFocus=null,lastFrame=performance.now(),lastAudio=audio?.currentTime||0;
  function clearInputs(){
    inputSources.clear();held.clear();
    if(run)run.modelHeld=run.autoMode;
    if(sideRun)sideRun.heldDown=false;
    document.querySelectorAll('.pressed').forEach(n=>n.classList.remove('pressed'));
  }
  function silence(r){
    if(!r)return;
    try{r.bus.gain.value=0;r.bus.disconnect();}catch{}
    for(const v of r.musicVoices||[]){try{v.stop();}catch{}}
    r.musicVoices?.clear();
    try{r.bgmGain?.disconnect();r.sfxGain?.disconnect();}catch{}
  }
  function newBus(r){
    r.bus=audio.createGain();r.bus.connect(master);
    if(r===run){
      r.bgmGain=audio.createGain();r.sfxGain=audio.createGain();
      r.bgmGain.connect(r.bus);r.sfxGain.connect(r.bus);updateMix();
    }
  }
  function resetScheduled(r,t){
    r.scheduled?.clear();
    if(r===run){
      r.cues.forEach((q,i)=>{if(q.at<t-.03)r.scheduled.add('q'+i);});
      r.musicCursor=0;
      while(r.musicCursor<r.sections*16&&timeAtBeat(r,r.musicCursor/2)<t-.03)r.musicCursor++;
    }else for(const q of r.cues||[])q.done=q.at<t-.03;
  }
  RhythmBrowser.pause=(reason='一時停止しました。',at=null)=>{
    if(RhythmBrowser.paused){
      // Interrupt a countdown, never resume a hidden page.
      if(readyTimer!==null){serial++;clearTimeout(readyTimer);readyTimer=null;resume.disabled=false;message.textContent='再開準備を停止しました。もう一度「続きから再開」を押してください。';}
      return;
    }
    if(!run&&!sideRun&&!startPending&&!RhythmBrowser.pendingSide)return;
    RhythmBrowser.paused=true;serial++;
    RhythmBrowser.freezeTimers();startEpoch++;sideStartEpoch++;startPending=false;
    const r=run||sideRun,now=at??audio?.currentTime??0;
    let t=r?now-r.base:0,rewound=false;
    for(const e of r?.events||[]){
      const unfinished=r===run?e.result===null:e.results?.[0]===null;
      if(e.held&&unfinished){t=Math.min(t,(e.cueStart??e.at-.8));e.held=false;e.demo=false;rewound=true;}
    }
    suspended={r,time:t,clock:now,rewound};
    clearInputs();silence(r);
    window.speechSynthesis?.cancel();
    // Speech cues are regenerated from the original chart, not replayed late.
    if(r===run)RhythmBrowser.clearTimers();
    try{suspension=Promise.resolve(audio?.suspend()).catch(()=>{});}catch{suspension=Promise.resolve();}
    previousFocus=document.activeElement;playRoot.inert=true;panel.hidden=false;
    resume.disabled=false;resume.textContent=r?'続きから再開':'開始画面へ戻る';
    $('#browser-pause-back').textContent='中断を取り消して一覧へ';
    message.textContent=reason+' 成績・挑戦回数は変わりません。'+(rewound?'長押しを解除したため、その合図からやり直します。採点済みの入力は保持します。':'')+(r?'再開ボタンの後、3秒の準備で続きます。':'開始前の画面へ戻れます。');
    resume.focus();
  };
  function leavePause(){
    RhythmBrowser.paused=false;suspended=null;panel.hidden=true;playRoot.inert=false;
    lastFrame=performance.now();lastAudio=audio?.currentTime||0;
    previousFocus?.focus?.();
  }
  RhythmBrowser.resume=async()=>{
    if(!RhythmBrowser.paused||resume.disabled||document.hidden)return;
    if(!suspended?.r){leavePause();$('#start').disabled=false;RhythmBrowser.resumeTimers();return;}
    resume.disabled=true;const owner=++serial;
    try{await suspension;await audio.resume();}catch{resume.disabled=false;message.textContent='音声を再開できませんでした。端末の音声設定を確認し、もう一度押してください。';return;}
    if(owner!==serial||document.hidden)return;
    let remaining=3;message.textContent='再開まで 3…';
    const tick=()=>{
      if(owner!==serial||document.hidden)return;
      remaining--;
      if(remaining){message.textContent='再開まで '+remaining+'…';readyTimer=setTimeout(tick,1000);return;}
      readyTimer=null;
      const {r,time,clock}=suspended;
      if(r!==run&&r!==sideRun){leavePause();return;}
      // A new audio graph drops every queued pre-pause tone. All engine clocks
      // shift together, including the rabbit quiz's separate absolute clock.
      const now=audio.currentTime;
      r.base=now-time;
      if(Number.isFinite(r.quizStart))r.quizStart+=now-clock;
      if(Number.isFinite(r.lockUntil))r.lockUntil+=now-clock;
      if(r===run){lastHit+=now-clock;toastUntil+=now-clock;rhythmFX.lastTime=now;rhythmFX.sceneAt+=now-clock;}
      newBus(r);resetScheduled(r,time);leavePause();RhythmBrowser.resumeTimers();
    };
    readyTimer=setTimeout(tick,1000);
  };
  resume.onclick=()=>RhythmBrowser.resume();
  $('#browser-pause').onclick=()=>RhythmBrowser.pause('手動で停止しました。');
  $('#browser-pause-back').onclick=()=>{
    serial++;clearTimeout(readyTimer);readyTimer=null;RhythmBrowser.clearTimers();
    // Interruption is not a failed perfect attempt. An intentional in-game
    // "中止" still uses the original rule and consumes a challenge.
    if(run){const trial=run.trial;run.trial='normal';stop(true);void trial;}
    sideStop();leavePause();selected=null;renderLibrary();showScreen('select');
  };
  RhythmBrowser.checkGap=()=>{
    const wall=performance.now(),now=audio?.currentTime||0;
    const interrupted=(run||sideRun)&&(wall-lastFrame>700||now-lastAudio>.7||['suspended','closed'].includes(audio?.state));
    const frozenAt=lastAudio;lastFrame=wall;lastAudio=now;
    if(interrupted){RhythmBrowser.pause('画面更新が長く止まったため停止しました。',frozenAt);return true;}
    return false;
  };
  for(const event of ['blur','pagehide'])window.addEventListener(event,()=>RhythmBrowser.pause('画面を離れたため停止しました。'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)RhythmBrowser.pause('タブが非表示になったため停止しました。');});
  document.addEventListener('keydown',e=>{
    if(e.code==='Escape'&&(run||sideRun||RhythmBrowser.paused)){
      e.preventDefault();e.stopImmediatePropagation();RhythmBrowser.pause('手動で停止しました。');return;
    }
    if(!RhythmBrowser.paused)return;
    if(e.code==='Tab'){
      const controls=[resume,$('#browser-pause-back')].filter(n=>!n.disabled);
      if(controls.length){e.preventDefault();const i=controls.indexOf(document.activeElement);controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}
    }else if(!e.target.closest?.('#browser-pause-panel')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  // All side-mode start errors become recoverable UI, rather than unhandled
  // promises. The epoch guards in the original starts discard stale completions.
  function guardedStart(fn){return async function(...args){
    if(RhythmBrowser.paused)return;
    const promise=fn(...args),epoch=sideStartEpoch;
    try{return await promise;}catch{
      if(epoch!==sideStartEpoch||screen!=='mode'||RhythmBrowser.paused)return;
      sideStop();const b=$('#mode-body');b.replaceChildren();
      b.append(sideNode('p','音声を開始できませんでした。端末の音声設定を確認して再挑戦してください。'),sideButton('モード一覧へ',openModeHub));
    }
  };}
  sideStart=guardedStart(sideStart);partyStart=guardedStart(partyStart);miniStart=guardedStart(miniStart);miniComposer=guardedStart(miniComposer);spellStart=guardedStart(spellStart);drumStart=guardedStart(drumStart);
  for(const name of ['pointerdown','click'])document.addEventListener(name,e=>{
    if(RhythmBrowser.paused&&!e.target.closest?.('#browser-pause-panel')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  // Save notices remain visible even when a later write in the same result fails.
  rhythmStorage.paint();
})();
