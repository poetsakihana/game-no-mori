'use strict';
window.etoPaused=false;let etoEpoch=0;
const etoMessages={loading:'保存準備中',saved:'このブラウザに保存済み',memory:'メモリ内のみ。別タブを閉じて再読込するかJSONで保管してください。',corrupt:'元の記録が破損・未対応のため上書きしません。JSONで保管できます。',unavailable:'保存にアクセスできません。メモリ内のみで動作します。',quota:'保存失敗。以前の記録を保持しています。最新状態をJSONで保管してください。',conflict:'別タブで記録が変わりました。上書きせずメモリ内だけで続けます。'};
EtoStore.subscribe(p=>{$('etoSaveStatus').textContent=etoMessages[p];$('saveinfo').textContent=etoMessages[p]});
function etoPause(){etoEpoch++;window.etoPaused=true;lastFrame=0;try{audioCtx?.suspend()}catch{}$('etoPause').textContent='再開する'}
function etoResume(){if(document.hidden)return;etoEpoch++;window.etoPaused=false;lastFrame=0;$('etoPause').textContent='一時停止';try{if(sound)audioCtx?.resume()?.catch(()=>{})}catch{}}
$('etoPause').onclick=()=>window.etoPaused?etoResume():etoPause();
const originalStart=$('start').onclick;$('start').onclick=()=>{if(running)return;if(state.points>1e9-80||state.races>=1e9){$('etoMessage').textContent='記録上限に達しました。JSONで保管し初期化してください。';return}etoResume();originalStart()};
const originalTrain=$('train').onclick;$('train').onclick=()=>{etoEpoch++;originalTrain()};
const originalChange=$('change').onclick;$('change').onclick=()=>{etoEpoch++;originalChange()};
const originalSound=$('sound').onclick;$('sound').onclick=()=>{etoEpoch++;originalSound();save();if(window.etoPaused)try{audioCtx?.suspend()}catch{}};$('sound').textContent='音：'+(sound?'ON':'OFF');
function etoDownload(text,name){const u=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
$('etoExport').onclick=()=>{etoPause();etoDownload(EtoStore.encode({state,sound}),'eto-race-browser.json');$('etoMessage').textContent='育成と完了レースを出力しました。途中の走行は含みません。'};
$('etoRaw').onclick=()=>{etoPause();if(EtoStore.raw!==null)etoDownload(EtoStore.raw,'eto-race-original-data.json');else $('etoMessage').textContent='元の保存はありません。'};
function etoApply(next){etoPause();running=false;raceElapsed=0;finishOrder=[];state=next.state;sound=next.sound;EtoStore.write(next,{replace:true});setup();runners=N.map((_,i)=>({i,p:0,shieldUntil:0}));drawBoard();$('sound').textContent='音：'+(sound?'ON':'OFF');$('live').textContent='出走準備中';$('etoMessage').textContent='記録を置き換えました。保存状態をご確認ください。途中のレースは中止しました。'}
$('etoImport').onclick=()=>{etoPause();$('etoFile').value='';$('etoFile').click()};
$('etoFile').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;const epoch=++etoEpoch;try{if(file.size>EtoStore.LIMIT)throw Error('32KB以下にしてください');const d=EtoStore.decode(await file.text());if(epoch!==etoEpoch)return;if(!confirm('記録をJSONで置き換えますか？途中のレースは中止し、直前の記録を1世代退避します。'))return;if(epoch===etoEpoch)etoApply(d.data)}catch(err){if(epoch===etoEpoch)$('etoMessage').textContent='復元できませんでした：'+err.message}};
$('etoFile').oncancel=()=>etoEpoch++;
$('etoRecover').onclick=()=>{etoPause();const p=EtoStore.previous;if(!p){$('etoMessage').textContent='退避記録がありません';return}if(confirm('直前の記録へ戻しますか？途中のレースは中止します。'))etoApply(p)};
$('reset').onclick=()=>{etoPause();if(confirm('育成・星・記録を初期化しますか？直前の記録は1世代退避します。'))etoApply(EtoStore.blank())};
$('etoCatalog').onclick=()=>etoPause();$('etoLight').onclick=()=>{etoPause();location.hash=location.hash.includes('light')?'normal':'light';location.reload()};$('etoLight').textContent=location.hash.includes('light')?'標準表示で再読込':'軽量表示で再読込';
addEventListener('blur',etoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)etoPause()});addEventListener('pagehide',()=>{etoPause();running=false;EtoStore.release()});addEventListener('pageshow',e=>{if(e.persisted){etoPause();render();$('etoMessage').textContent='戻る操作から復帰しました。保存を続けるには再読込してください。'}});
addEventListener('error',()=>{$('etoMessage').textContent='動作エラーが発生しました。記録をJSONで保管し、軽量表示または再読込を試してください。'});
