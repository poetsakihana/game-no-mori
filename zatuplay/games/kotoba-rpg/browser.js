'use strict';
const webMessages={loading:'保存準備中',saved:'このブラウザに保存済み',memory:'メモリ内のみ。別タブを閉じて再読込、またはJSONで保管してください',corrupt:'破損・未対応の元保存は上書きしません',unavailable:'保存にアクセスできません。JSONで保管してください',quota:'保存失敗。以前の保存を保持、最新記録はJSONで保管してください',conflict:'別タブで保存が変わりました。メモリ内のみで続けます'};
KotobaStore.subscribe(p=>$('webStatus').textContent=webMessages[p]);
function webStop(){webEpoch++;resetEndingTimer();if(typeof AtlasMap!=='undefined')AtlasMap.close();try{audioContext?.suspend()}catch{}battle=null;if(['quiz','map','ending','clear'].includes(screen))goSelect();}
function webApply(state){webStop();KotobaStore.write(state,{replace:true});adopt(KotobaStore.data);goTitle();$('webMessage').textContent='進行を置き換えました。日次報酬の受取日は巻き戻しません。保存状態をご確認ください。'}
function webDownload(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
$('webExport').onclick=()=>{save();webDownload(KotobaStore.encode(S),'kotoba-browser.json')};
$('webRaw').onclick=()=>{if(KotobaStore.raw!==null)webDownload(KotobaStore.raw,'kotoba-original-data.json');else $('webMessage').textContent='元保存はありません'};
$('webImport').onclick=()=>{webStop();$('webFile').value='';$('webFile').click()};
$('webFile').onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;const epoch=++webEpoch;try{if(f.size>KotobaStore.LIMIT)throw Error('1MB以下にしてください');const d=KotobaStore.decode(await f.text());if(epoch!==webEpoch)return;if(confirm('このJSONで進行を置き換えますか？直前の記録を1世代退避します。')&&epoch===webEpoch)webApply(d.data)}catch(err){if(epoch===webEpoch)$('webMessage').textContent='復元できません：'+err.message}};
$('webFile').oncancel=()=>webEpoch++;
$('webRecover').onclick=()=>{webStop();const p=KotobaStore.previous;if(!p){$('webMessage').textContent='退避した記録がありません';return}if(confirm('置換前の進行に戻しますか？'))webApply(p)};
$('webReset').onclick=()=>{webStop();if(confirm('学習・収集の進行を初期化しますか？直前の記録を1世代退避します。'))webApply(fresh())};
$('webCatalog').onclick=()=>{save();webStop()};
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();webStop();}else if(['map','quiz','ending','clear'].includes(screen)){goSelect();$('webMessage').textContent='中断した画面から一覧へ戻りました。正解済み記録は保持しています。'}});
addEventListener('pagehide',()=>{save();webStop();KotobaStore.release()});addEventListener('pageshow',e=>{if(e.persisted){goSelect();$('webMessage').textContent='戻る操作から復帰しました。保存を続けるには再読込してください。'}});

function webGuard(fn){return function(...args){const before=KotobaStore.check({...S,answered:[...answered]});try{return fn(...args)}catch(error){adopt(before);webStop();goSelect();toast('記録上限または不整合のため操作を取り消しました。JSONで保管してください。');return false}}}
choose=webGuard(choose);heal=webGuard(heal);pullCard=webGuard(pullCard);stageClear=webGuard(stageClear);finishEnding=webGuard(finishEnding);toggleSound=webGuard(toggleSound);
