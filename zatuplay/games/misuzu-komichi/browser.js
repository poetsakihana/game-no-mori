/* Browser lifecycle/navigation/import adapter. Original poem/game mechanics remain in app.js/events.js. */
'use strict';
let importGeneration=0,replaceGeneration=0;
function invalidateImport(){importGeneration++;replaceGeneration++;busy=false;$('#importFile').value='';$('#panel').removeAttribute('aria-busy')}
const statusMessages={ready:'このブラウザに自動保存',saved:'保存済み · このブラウザのみ',corrupt:'保存データが壊れているか未対応の版です。原データを保持中。設定で退避・復元できます。',conflict:'別タブで保存が変わりました。上書きを停止中。今の記録を書き出して再読込してください。',unavailable:'保存が利用できません。このタブ内だけの記録です。書き出してください。',unsupported:'安全な排他保存に非対応。このタブ内だけの記録です。書き出してください。',quota:'保存容量が不足しています。今の記録はメモリに保持中。書き出してください。',invalid:'保存内容を検査できませんでした。今の記録は保持中です。'};
function clearMovement(){keys={};target=null;last=performance.now()}
function silenceAudio(){if(audioCtx&&audioCtx.state==='running')audioCtx.suspend().catch(()=>{})}
function cancelDeferred(){clearTimeout(startTimer);clearTimeout(completionTimer);startTimer=completionTimer=null}
function syncPause(){const overlay=$('#pauseOverlay');overlay.hidden=!paused;$('#pause').textContent=paused?'再開':'一時停止';$('#pause').setAttribute('aria-pressed',String(paused))}
function pauseGame(){invalidateImport();clearMovement();cancelDeferred();silenceAudio();if(playing){paused=true;syncPause()}save()}
function resumeGame(){if(busy||document.hidden)return;clearMovement();paused=false;syncPause();canvas.focus()}
$('#pause').onclick=()=>{if(paused)resumeGame();else pauseGame()};$('#resume').onclick=resumeGame;
canvas.tabIndex=0;
MisuzuStore.subscribe(p=>{storageOK=p==='ready'||p==='saved';$('#saveStatus').textContent=statusMessages[p]||statusMessages.unavailable;$('#saveStatus').dataset.phase=p;const s=$('#settingsSaveStatus');if(s)s.textContent=$('#saveStatus').textContent});
function downloadText(raw,name){
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportJourney(){try{downloadText(MisuzuStore.encode(state),'misuzu-komichi-journey.json');toast('記録ファイルのダウンロードを開始しました。保存先を確認してください。')}catch{toast('書き出せませんでした。画面を閉じずにもう一度お試しください。')}}
$('#quickExport').onclick=exportJourney;
function browserSettings(){
 openModal(panelTop('旅の支度')+`<p class="notice">矢印キー・WASD、画面の方向ボタン、または地面をタップして移動。灯りの近くで「近くの詩をひらく」か Enter を押します。地図から全12章へ移動できます。</p><div class="actions"><button id="soundBtn">音 ${state.sound?'入':'切'}（短い環境音）</button><button id="export">記録を書き出す</button><button id="import">記録を読み込む</button><button id="reset">旅の記録をリセット</button><button id="backup">直前の退避記録を書き出す</button><button id="rawExport">ブラウザ保存の原データを書き出す</button><button id="retrySave">保存を再試行</button></div><p id="settingsSaveStatus" class="notice"></p><p class="notice">記録はこのブラウザ・このサイトだけに保存します。同期はありません。容量不足・プライベートモード・サイトデータ削除・強制終了では保存が失われることがあります。大切な記録はJSONでも保管してください。他タブ更新を検知すると上書きを停止します。安全な排他保存（Web Locks）が使えない環境ではメモリ内だけで遊べます。</p><p class="notice">読み込みは全項目を検査して確認後に復元します。ブラウザ版とAndroid版の misuzu-v1 JSONに対応。章・位置・音・灯り・お気に入り・目線・会話の選択・道しるべを復元します。読み込み・リセットの直前の状態は退避し、設定から書き出せます。失敗時は元の状態を保持します。</p><p class="notice">ブラウザ版 0.2-web.2 / 原版 Android 0.2：516作品・530表記の提供資料を収録。詩文の完全性、異体字や転記の正確さは未校訂です。探索の風景・問い・物語は創作で、金子みすゞ本人の発言や解説ではありません。</p><p class="notice">提供資料「KanekoPoems.xlsx」。全文かどうかは未確認です。括弧内には資料作成者の検索用追記も含まれます。音は短い合成環境音のみで、録音された音楽・朗読はありません。初回読込には通信が必要です。この作品はオフライン再起動を保証する専用キャッシュを持ちません。読込済みの画面は外部通信なしで遊べます。</p><p class="notice"><a href="README.md" target="_blank" rel="noopener">移植の変更点と検証範囲</a> · <a href="provenance.json" target="_blank" rel="noopener">原本・内容の記録</a></p>`);
 $('#settingsSaveStatus').textContent=$('#saveStatus').textContent;
 $('#soundBtn').onclick=e=>{if(busy)return;state.sound=!state.sound;if(!state.sound)silenceAudio();save();e.target.textContent='音 '+(state.sound?'入':'切')+'（短い環境音）';if(state.sound)tone()};
 $('#export').onclick=exportJourney;$('#import').onclick=()=>{invalidateImport();$('#importFile').click()};
 $('#reset').onclick=resetJourney;
 $('#backup').onclick=()=>{const raw=MisuzuStore.backup();if(raw)downloadText(raw,'misuzu-komichi-before-change.json');else toast('退避記録はまだありません。')};
 $('#rawExport').onclick=()=>{const raw=MisuzuStore.baseline;if(raw!==null)downloadText(raw,'misuzu-komichi-original-storage.json');else toast('ブラウザ保存の原データはありません。')};
 $('#retrySave').onclick=async()=>{MisuzuStore.retry();const ok=await save();toast(ok?'記録を保存しました。':'保存できません。上部の状態を確認し、記録を書き出してください。')};
}
async function replaceJourney(next,label,requestCurrent=()=>true){
 if(busy||!requestCurrent())return false;
 const memoryOnly=!MisuzuStore.locks||MisuzuStore.phase==='unavailable';
 if(MisuzuStore.phase==='conflict'){toast('別タブの保存が変わっています。今の記録を書き出し、再読込してから復元してください。');return false}
 const previous=MisuzuStore.validate(state),guard=JSON.stringify(previous);
 if(!confirm(`${label}\n現在の灯り ${state.seen.length}/516、出会い ${state.events.length}/36 の記録を置き換えます。章・位置・音・お気に入り・目線も対象です。直前の状態を退避します。${memoryOnly?'\n保存機能が使えないため、このタブのメモリ内だけに反映します。閉じる前に書き出してください。':''}\n続けますか？`))return false;
 if(!requestCurrent())return false;
 const operation=++replaceGeneration,stillCurrent=()=>operation===replaceGeneration&&requestCurrent();
 clearMovement();cancelDeferred();silenceAudio();busy=true;$('#panel').setAttribute('aria-busy','true');
 try{
  let ok=false;
  if(memoryOnly){MisuzuStore.rememberBackup(previous);ok=true;}
  else ok=await MisuzuStore.commit(next,{replace:true,previous,shouldContinue:()=>stillCurrent()&&JSON.stringify(MisuzuStore.validate(state))===guard});
  if(!ok){if(stillCurrent())toast('変更できませんでした。元の記録を保持しています。保存状態を確認してください。');return false}
  state=MisuzuStore.validate(next);view='旅人';near=null;activeEvent=null;eventPage=eventChoice=0;meter();
  busy=false;closeModal();toast(memoryOnly?'このタブ内の記録を変更しました。閉じる前に書き出してください。':'旅の記録を変更し、保存しました。');return true;
 }finally{if(operation===replaceGeneration){busy=false;$('#panel').removeAttribute('aria-busy')}}
}
async function resetJourney(){invalidateImport();const ticket=importGeneration;const next={...MisuzuStore.validate(state),seen:[],favorites:[],notes:{},events:[],eventChoices:{},waypoint:null};await replaceJourney(next,'旅の記録をリセットしますか？（章・位置・音はそのままです）',()=>ticket===importGeneration)}
$('#importFile').addEventListener('cancel',invalidateImport);
$('#importFile').onchange=async e=>{
 const input=e.target,file=input.files?.[0];invalidateImport();const ticket=importGeneration,current=()=>ticket===importGeneration;
 // Capture the file first and clear immediately. A stale request never clears a newer input.
 input.value='';if(!file)return;
 try{
  if(file.size>MisuzuStore.MAX_BYTES*3)throw Error('size');
  const raw=await file.text();if(!current())return;let next;
  try{next=MisuzuStore.decode(raw,true).state}catch{next=MisuzuStore.decodeBackup(raw)}
  if(!current())return;
  await replaceJourney(next,`記録を読み込みますか？\n復元先：第${next.chapter+1}章、灯り ${next.seen.length}/516、出会い ${next.events.length}/36`,current);
 }catch{if(current())toast('この記録ファイルは読み込めません。形式・サイズ・項目を確認してください。元の記録は変更していません。')}
};
const controls=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d']);
function textFocus(e){return e.target?.closest?.('input,select,textarea,[contenteditable="true"]')}
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();if(e.repeat)return;if(busy)invalidateImport();if(modalOpen)closeModal();else if(playing){if(paused)resumeGame();else pauseGame()}return}
 if(modalOpen){if(e.key==='Tab'){const f=[...$('#panel').querySelectorAll('button,input,select,a[href]')].filter(b=>!b.disabled);if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus()}}return}
 if(!playing||paused||busy||textFocus(e))return;
 const key=e.key.length===1?e.key.toLowerCase():e.key;
 if(controls.has(key)){e.preventDefault();keys[key]=true;target=null;return}
 if((key==='Enter'||key===' ')&&!e.target?.closest?.('button,a')){e.preventDefault();if(!e.repeat)interactNear()}
});
window.addEventListener('keyup',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;delete keys[key]});
window.addEventListener('blur',pauseGame);window.addEventListener('pagehide',pauseGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();else clearMovement()});
window.addEventListener('pageshow',()=>{clearMovement();if(playing){paused=true;syncPause()}});
window.addEventListener('pointerup',()=>{keys={}});window.addEventListener('pointercancel',pauseGame);
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();if(!playing||paused||modalOpen||busy)return;b.setPointerCapture?.(e.pointerId);keys[b.dataset.key]=true;target=null};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{delete keys[b.dataset.key]}});
// A key held while focus moves to a field/select must not keep walking.
document.addEventListener('focusin',e=>{if(textFocus(e))clearMovement()});
// Do not let stale clicks/keyboard submissions alter a snapshot while restore is pending.
document.addEventListener('click',e=>{if(busy){if(e.target===$('#modal')||e.target.closest?.('[aria-label="閉じる"],header nav button,#pause,#resume,#zatuplayReturn,#import')){invalidateImport();return}if(!e.target.closest?.('#quickExport')){e.preventDefault();e.stopImmediatePropagation()}}},true);
$('#zatuplayReturn').addEventListener('click',()=>{pauseGame()});
syncPause();requestAnimationFrame(frame);
