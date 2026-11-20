(() => {
  'use strict';
  const $=id=>document.getElementById(id), dialog=$('recordDialog');
  const q=$('recordConfirm'),commit=$('recordApply'),cancel=$('recordCancel'),message=$('recordMessage');
  let active=null, priorPaused=false, action='', focusCover=false;
  function showChoices(){
    const r=active.recordStatus(), s=active.getState();
    action='';q.hidden=commit.hidden=cancel.hidden=true;$('recordChoices').hidden=false;
    $('recordReset').disabled=!r.ok||!r.hasRecord||!!s.pendingReward;
    $('recordRestore').hidden=!r.hasBackup;
    $('recordRestore').disabled=!r.ok||!!s.pendingReward;
    $('recordEnding').hidden=!r.ok||r.wave<5;
    message.textContent=!r.ok?'記録を保護しています。この作品の別タブを閉じて再読込してください。':s.pendingReward?'報酬が保留中です。報酬の確定後に、記録をリセット・復元できます。':r.hasRecord?'本編 '+r.wave+' / 100面クリア。':'まだ保存された記録はありません。';
  }
  $('recordOpen').addEventListener('click',()=>{
    if(!game||game.hasBlockingModal?.()||game.getState().phase==='progression'||dialog.open)return;
    active=game;priorPaused=!!active.getState().paused;if(!priorPaused)active.pause();showChoices();dialog.showModal();
  });
  const confirmOp=op=>{
    action=op;$('recordChoices').hidden=true;
    q.textContent=op==='reset'?'本編・仲間・育成・収集・イベントの記録を最初の状態に戻します。現在の記録を端末内の復元枠に一つ残します。前回の復元枠は置き換わります。':'リセット前の記録を読み込みます。現在の記録も復元枠に残します。';
    cancel.textContent='キャンセル';
    commit.textContent=op==='reset'?'リセットする':'復元する';
    q.hidden=commit.hidden=cancel.hidden=false;cancel.focus();
  };
  $('recordReset').addEventListener('click',()=>confirmOp('reset'));
  $('recordRestore').addEventListener('click',()=>confirmOp('restore'));
  $('recordEnding').addEventListener('click',()=>{
    const r=active.recordStatus();if(!r.ok||r.wave<5)return;
    $('recordChoices').hidden=true;q.hidden=cancel.hidden=false;commit.hidden=true;
    cancel.textContent='記録へ戻る';q.textContent=r.wave>=100?'100の道を踏破！ 集めた詩が、桜の町に新しい春を運びました。図鑑を開けば、ことばはまた、あなたのそばに。':'ワールド1クリア！ 初めて取り戻した詩が、次のワールドへと続く道を照らします。';
    cancel.focus();
  });
  cancel.addEventListener('click',showChoices);
  $('recordClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  dialog.addEventListener('close',()=>{
    if(active&&active===game&&!priorPaused)active.resume();
    active=null;action='';if(focusCover){focusCover=false;$('start').focus({preventScroll:true});}
  });
  commit.addEventListener('click',()=>{
    if(!action||!active||active!==game||!dialog.open)return;
    const op=action,ok=op==='reset'?active.restart():active.restoreResetRecord();
    if(!ok){showChoices();message.textContent='記録を変更できませんでした。元の保存はそのままです。別タブやブラウザ設定を確認してください。';return;}
    if(op==='restore'){
      active.destroy();game=null;cover.classList.remove('hidden');$('recordOpen').disabled=true;
      focusCover=true;
    }
    showChoices();
    message.textContent=op==='reset'?'はじめの状態に戻しました。リセット前の記録はここから復元できます。':'記録を復元しました。冒険をはじめると復元した記録から再開します。';
    if(op==='restore'){$('recordChoices').hidden=true;}
    $('recordClose').focus();
  });
})();
