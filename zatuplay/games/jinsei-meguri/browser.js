'use strict';
let webEpoch=0,webBefore=null;
function webCancel(){webEpoch++;if(webBefore)s=JSON.parse(JSON.stringify(webBefore));webBefore=null;busy=false;$('dice').classList.remove('rolling');window.cancelWalk?.();if(s)render()}
const messages={loading:'保存準備中',saved:'このブラウザに保存済み',memory:'メモリ内のみ：別タブを閉じて再読込、またはJSONで保管してください',corrupt:'保存が破損・未対応です。元記録を上書きしません',unavailable:'保存にアクセスできません。JSONで保管してください',quota:'保存失敗：以前の保存を保持。最新記録はJSONで保管してください',conflict:'別タブで保存が変更されました。上書きせずメモリ内で続けます'};
LifeStore.subscribe(p=>$('webStatus').textContent=messages[p]);
function webApply(next){webCancel();LifeStore.write(next,{replace:true});s=next;if(s){selected=s.map;show()}else{$('game').classList.add('hidden');$('setup').classList.remove('hidden');$('resume').disabled=true}$('webMessage').textContent='記録を置換しました。保存状態をご確認ください。'}
function download(text,name){let u=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
$('webExport').onclick=()=>{webCancel();download(LifeStore.encode(s??LifeStore.data),'jinsei-meguri-browser.json')};
$('webImport').onclick=()=>{webCancel();$('webFile').value='';$('webFile').click()};
$('webFile').onchange=async e=>{let f=e.target.files?.[0];e.target.value='';if(!f)return;const epoch=++webEpoch;try{if(f.size>LifeStore.LIMIT)throw Error('64KB以下にしてください');let d=LifeStore.decode(await f.text());if(epoch!==webEpoch)return;if(confirm('保存を置き換えますか？直前の記録を1世代退避します。')&&epoch===webEpoch)webApply(d.data)}catch(err){if(epoch===webEpoch)$('webMessage').textContent='復元できません：'+err.message}};
$('webFile').oncancel=()=>webEpoch++;
$('webRecover').onclick=()=>{webCancel();const p=LifeStore.previous;if(p===null){$('webMessage').textContent='復旧できるゲーム記録がありません';return}if(confirm('置換前のゲームへ戻しますか？'))webApply(p)};
$('webReset').onclick=()=>{webCancel();if(confirm('記録を初期化しますか？現在のゲームを1世代退避します。'))webApply(null)};
const start=$('start').onclick;$('start').onclick=()=>{webCancel();start()};
const home=$('home').onclick;$('home').onclick=()=>{webCancel();home()};
$('webCatalog').onclick=webCancel;$('webLight').onclick=()=>{webCancel();location.hash=location.hash.includes('light')?'normal':'light';location.reload()};
addEventListener('blur',webCancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)webCancel()});addEventListener('pagehide',()=>{webCancel();LifeStore.release()});addEventListener('pageshow',e=>{if(e.persisted){webCancel();$('webMessage').textContent='戻る操作から復帰しました。保存を続けるには再読込してください。'}});

$('webRaw').onclick=()=>{webCancel();if(LifeStore.raw!==null)download(LifeStore.raw,'jinsei-meguri-original-data.json');else $('webMessage').textContent='元保存データはありません'};
