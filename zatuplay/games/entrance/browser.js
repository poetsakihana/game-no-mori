'use strict';
const webInitialIntro={title:$('title').textContent,lead:$('lead').textContent,intro:$('intro').innerHTML};
function webResetIntro(){for(const k of ['title','lead'])$(k).textContent=webInitialIntro[k];$('intro').innerHTML=webInitialIntro.intro;$('start').textContent=$('start').disabled?'通路を準備中…':'入口へ進む →';}
let webEpoch=0,webTransition=null,webCheckpoint=EntranceStore.initial.checkpoint;
const saveMessages={loading:'保存準備中',saved:'このブラウザに保存済み',memory:'メモリ内のみ。別タブを閉じ再読込するかJSONを保管してください。',corrupt:'既存の保存が破損・未対応です。元データを保護し、上書きしません。',unavailable:'保存にアクセスできません。JSONを保管してください。',quota:'保存失敗。以前の保存は保持しています。最新状態をJSONで保管してください。',conflict:'別タブで保存が変わりました。上書きせずメモリ内のみで続けます。'};
EntranceStore.subscribe(p=>{$('webSaveStatus').textContent=saveMessages[p]});
function webState(){return {settings:{...settings},checkpoint:webCheckpoint}}
function webSave(replace=false){webEpoch++;return EntranceStore.write(webState(),{replace})}
saveSettings=()=>webSave();
function webMark(status='playing'){webCheckpoint={stage,round,anomaly,seenBag:[...seenBag],status};webSave();$('webResume').disabled=status!=='playing';}
function webStopTransition(){if(webTransition){clearTimeout(webTransition.timer);const fn=webTransition.fn;webTransition=null;fn();webMark();}transitioning=false;$('flash').style.opacity=0;}
transition=function(fn){if(transitioning)return;transitioning=true;resetInput();$('flash').style.opacity=1;const job={fn,timer:null};webTransition=job;job.timer=setTimeout(()=>{if(webTransition!==job)return;webTransition=null;fn();webMark();transitioning=false;$('flash').style.opacity=0;},210)};
const webOriginalEnd=end;end=function(win){if(!active)return;webStopTransition();webOriginalEnd(win);webMark(win?'won':'lost')};
function webPause(){webStopTransition();webEpoch++;resetInput();turnTarget=null;paused=true;AudioGame.suspend();if(active)$('settings').classList.remove('hidden')}
const webOriginalStart=$('start').onclick;$('start').onclick=()=>{if(webCheckpoint?.status==='playing'&&!confirm('途中の記録を退避して1番入口からやり直しますか？'))return;webStopTransition();webOriginalStart();webCheckpoint={stage,round,anomaly,seenBag:[...seenBag],status:'playing'};webSave(true);$('webResume').disabled=false;};
function webResumeCheckpoint(){if(!webCheckpoint||webCheckpoint.status!=='playing')return;webStopTransition();resetInput();const c=JSON.parse(JSON.stringify(webCheckpoint));stage=c.stage;round=c.round-1;seenBag=[...c.seenBag];setup(c.anomaly);active=true;paused=false;transitioning=false;$('settings').classList.add('hidden');$('overlay').classList.add('hidden');for(const id of ['hud','controls','dot'])$(id).classList.remove('hidden');last=performance.now();AudioGame.unlock();AudioGame.mix();say('保存した通路の入口から再開します。途中の歩行位置は保存しません。',5)}
$('webResume').onclick=webResumeCheckpoint;$('webResume').disabled=webCheckpoint?.status!=='playing';
const originalCloseSettings=closeSettings;closeSettings=function(){if(document.hidden)return;last=performance.now();resetInput();AudioGame.resume();originalCloseSettings()};$('closeSettings').onclick=$('closeSettingsTop').onclick=closeSettings;
const oldKeys=window.onkeydown;window.onkeydown=e=>{if(e.target?.matches?.('input,select,textarea')||$('webTools').contains(e.target))return;if(e.repeat&&(e.code==='Space'||e.code==='Escape'))return;oldKeys(e)};
window.onblur=webPause;addEventListener('pagehide',()=>{webPause();EntranceStore.release()});document.addEventListener('visibilitychange',()=>{if(document.hidden)webPause()});addEventListener('pageshow',e=>{if(e.persisted){webPause();$('webMessage').textContent='戻る操作から復帰しました。保存を続ける場合は再読込してください。'}});
$('webCatalog').onclick=()=>webPause();
const light=$('lightMode').onclick;$('lightMode').onclick=()=>{webPause();light()};
function webDownload(raw,name){const u=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
$('webExport').onclick=()=>{webPause();webDownload(EntranceStore.encode(webState()),'entrance-backup.json')};
$('webRaw').onclick=()=>{webPause();if(EntranceStore.raw!==null)webDownload(EntranceStore.raw,'entrance-original-data.json');else $('webMessage').textContent='元の保存はありません。'};
function webApply(state){webStopTransition();webResetIntro();webEpoch++;active=false;paused=true;resetInput();AudioGame.suspend();Object.assign(settings,state.settings);webCheckpoint=state.checkpoint;EntranceStore.write(state,{replace:true});for(const k of ['master','ambient','sfx','bgm']){$(k+'Volume').value=settings[k];$(k+'Out').textContent=settings[k]}$('sensitivity').value=settings.sensitivity;$('sensitivityOut').textContent=settings.sensitivity;$('headbob').checked=settings.headbob;$('quality').value=settings.quality;muteLabel();resize();$('settings').classList.add('hidden');$('overlay').classList.remove('hidden');for(const id of ['hud','controls','dot'])$(id).classList.add('hidden');$('webResume').disabled=webCheckpoint?.status!=='playing';$('webMessage').textContent=(webCheckpoint?.status==='playing'?'記録を置き換えました。保存状態を確認し「通路から再開」を押してください。':'記録を置き換えました。保存状態を確認し「入口へ進む」から新しく始められます。')}
$('webImport').onclick=()=>{webPause();$('webFile').value='';$('webFile').click()};
$('webFile').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;const token=++webEpoch;try{if(file.size>EntranceStore.LIMIT)throw Error('JSONは32KB以下にしてください。');const v=EntranceStore.decode(await file.text());if(token!==webEpoch)return;if(!confirm('このJSONの設定と通路記録へ置き換えますか？現在の記録は1世代退避します。'))return;if(token===webEpoch)webApply(v.state)}catch(err){if(token===webEpoch)$('webMessage').textContent='復元できませんでした: '+err.message}};
$('webFile').oncancel=()=>webEpoch++;
$('webRecover').onclick=()=>{webPause();const p=EntranceStore.previous;if(!p){$('webMessage').textContent='退避記録はありません。';return;}if(confirm('直前の設定・通路記録へ戻しますか？'))webApply(p)};
$('webReset').onclick=()=>{webPause();if(confirm('設定と通路記録を初期化しますか？直前の記録は1世代退避します。'))webApply(EntranceStore.blank())};
EntranceStore.ready.then(()=>{if(EntranceStore.phase!=='saved')$('webMessage').textContent='保存状態をご確認ください。別タブや保存非対応時はJSONで保管できます。'});
const savedOpenSettings=openSettings;openSettings=function(){webStopTransition();webEpoch++;savedOpenSettings()};$('pause').onclick=$('audioSettings').onclick=openSettings;
$('webTools').addEventListener('toggle',()=>{if($('webTools').open)webPause()});
