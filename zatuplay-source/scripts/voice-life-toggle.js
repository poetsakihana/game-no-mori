function endStream(reason='配信終了'){
  if(!live){stopMic();return false}
  // Synchronous/idempotent settlement. No await between flag and mutation.
  live=false;sessionEpoch++;stopMic();const points=sessionPoints,followers=sessionFollows.size;
  state.streams++;state.totalLikes+=likes;state.totalGifts+=gifts;state.totalGiftCoins+=giftValue;
  state.totalMinutes+=Math.max(0,Math.ceil((Date.now()-start)/60000));state.totalPoints+=points;
  familyContribution(Math.ceil(points/8));state.followers+=followers;state.level=1+Math.floor(state.totalPoints/300);
  state.history.unshift({at:new Date().toISOString(),likes,gifts,viewers:viewers.size,points});state.history=state.history.slice(0,20);
  sessionPoints=0;sessionFollows.clear();viewers.clear();finishCollab();checkDailySnapshot();save();
  log(reason+'！ 獲得ランクポイント：'+points+'pt / 新規フォロワー：'+followers+'人','sys');update();return true
}
async function toggle(){
  if(dead)return;
  if(micPending){stopMic();update();return}
  if(live){endStream();return}
  const ticket=++micEpoch;
  if($('mode').value==='mic'){
    micPending=true;$('toggle').textContent='マイク開始待ちをキャンセル';$('micStatus').textContent='許可待ち（キャンセル可能）';
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw Error('この環境ではマイクを利用できません');
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(ticket!==micEpoch||dead||document.hidden){stream.getTracks().forEach(t=>t.stop());return}
      micStream=stream;micPending=false;$('micStatus').textContent='🎤 マイクON（端末内のみ・CPUは音声を認識しません）';
      stream.getTracks().forEach(track=>track.addEventListener('ended',()=>{if(micStream===stream)endStream('マイク終了')}));
    }catch(e){if(ticket===micEpoch&&!dead){stopMic();update();alert('マイクを開始できませんでした。マイクなしモードでも全機能を遊べます。\n'+e.message)}return}
  }
  if(ticket!==micEpoch||dead||document.hidden)return;
  sessionEpoch++;live=true;start=Date.now();likes=0;gifts=0;giftValue=0;sessionPoints=0;sessionFollows.clear();viewers.clear();
  $('chat').replaceChildren();log('🎉 配信開始！ 1200人のCPUが活動する街からリスナーが来るかも…','sys');lastJoin=Date.now();lastEvent=event().id;update()
}
