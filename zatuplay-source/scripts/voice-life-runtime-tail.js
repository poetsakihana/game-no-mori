// Browser additions: restore one complete validated record, never four partial keys.
function snapshot(){return {state,extra,media,social}}
function cancelWork(){sessionEpoch++;roomEpoch++;importEpoch++;cancelImages();stopMic();if(room){room=null;clearInterval(roomTimer);roomTimer=null}document.querySelectorAll('.cpu-detail,.gift-fx').forEach(e=>e.remove())}
function apply(next){cancelWork();live=false;viewers.clear();sessionPoints=0;likes=0;gifts=0;giftValue=0;sessionFollows.clear();state=next.state;extra=next.extra;media=next.media;social=next.social;extra.collab=null;$('setup').classList.toggle('hidden',!!state.name);$('app').classList.toggle('hidden',!state.name);$('chat').replaceChildren();$('mode').value='sim';finishCollab();init();show('home');update()}
store.attach(snapshot,apply);
function download(text,name){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
function report(text){$('backupStatus').textContent=text}
function protectActive(){importEpoch++;if(live)endStream('バックアップ操作のため配信終了');else stopMic();cancelImages()}
$('exportBackup').onclick=()=>{try{protectActive();store.flush();download(store.backup(),'voice-life-7.0-web.1.json');report('JSONのダウンロードを要求しました。保存先を確認してください。')}catch(e){report('書き出せませんでした：'+e.message)}};
$('exportOriginal').onclick=()=>{const raw=store.original();if(raw===null){report('端末に保存原本はありません');return}download(raw,'voice-life-storage-original.json');report('端末保存の原本です。通常のJSON読み込み形式とは異なります。')};
$('importBackup').onchange=async()=>{const file=$('importBackup').files[0];$('importBackup').value='';if(!file)return;const ticket=++importEpoch,version=store.revision;try{if(file.size>VoiceLifeStorage.MAX)throw Error('JSONは4MiB以下にしてください');const next=store.parse(await file.text());await store.decodeMedia(next);if(ticket!==importEpoch||dead)return;if(version!==store.revision)throw Error('選択中に保存が変更されました。もう一度選択してください');if(!confirm('このブラウザ版の全記録・画像を選択したJSONで置換しますか？現在の未精算配信は終了し、端末保存の置換前データを1世代保管します。APKデータは変更しません。')){report('読み込みをキャンセルしました');return}protectActive();store.flush();if(store.replace(next))report('JSONを復元しました。置換前に戻すボタンで直前の保存に戻せます。')}catch(e){report('読み込みしませんでした：'+e.message)}};
function resetBrowser(){if(!confirm('このブラウザ版の記録・画像を初期化しますか？未精算配信は終了します。端末保存の置換前データを1世代保管します。APKの4つの保存キーは変更しません。'))return;protectActive();store.flush();if(store.replace(voiceLifeDefaults()))report('初期化しました。置換前データを1世代保管しています。')}
$('reset').onclick=resetBrowser;$('resetBrowser').onclick=resetBrowser;
$('restorePrevious').onclick=async()=>{const previous=store.previousData();if(previous===null){report('復元できる置換前保存はありません');return}const ticket=++importEpoch,version=store.revision;try{VoiceLifeStorage.validate(previous);await store.decodeMedia(previous);if(ticket!==importEpoch||dead)return;if(version!==store.revision)throw Error('復元準備中に保存が変わりました。再選択してください');if(!confirm('直前の置換前データに戻しますか？現在の記録を代わりに1世代保管します。'))return;protectActive();store.flush();if(store.replace(previous))report('置換前データを復元しました。')}catch(e){report('復元できませんでした：'+e.message)}};
$('exportRecovery').onclick=()=>{const raw=store.previous();if(raw===null){report('置換前の端末原本はありません');return}download(raw,'voice-life-recovery-original.json');report('置換前の端末原本をダウンロード要求しました。破損原本も変更せず保管されています。')};
$('retrySave').onclick=()=>{protectActive();if(store.retry())report('端末保存を再試行しました。上部の保存状態を確認してください。')};
$('mode').onchange=()=>{if(live)endStream('モード変更');else stopMic();update()};
function suspend(reason){if(live)endStream(reason);cancelWork();store.flush()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend('画面を離れたため配信終了')});
window.addEventListener('pagehide',()=>{suspend('ページ終了');dead=true;intervals.forEach(window.clearInterval);timeouts.forEach(window.clearTimeout);store.release()});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
$('catalogReturn').addEventListener('click',()=>suspend('一覧へ戻る'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.cpu-detail').forEach(n=>n.remove());if(micPending){stopMic();update()}}});
extra.collab=null;init();store.flush();
