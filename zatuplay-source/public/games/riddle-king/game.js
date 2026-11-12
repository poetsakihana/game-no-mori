'use strict';
// Browser adaptation of the APK's 16,000-stage game. Question data is unchanged.
(() => {
const Q = window.QUESTIONS, TOTAL = 16000, KEY = 'zatuplay-riddle-king-v1';
const titles = ['なぞなぞ見習い','ひらめきの旅人','謎の探検家','知恵の騎士','推理の達人','謎解き賢者','ひらめき伯爵','知恵の公爵','王冠の挑戦者','王の継承者','なぞなぞ王'];
const app = document.getElementById('app'), status = document.getElementById('save-status');
const norm = v => v.normalize('NFKC').trim().replace(/[\s、。,.!！?？]/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state = {version:1,unlocked:0,stage:0,answer:'',hint:false,solved:false,screen:'home',page:0,sound:false};
let storage, expected = null, revision = 0, protectedSave = false, failed = false, suspended = false, ready = false;
let ctx, interval, note = 0, audioFailed = false, saveQueue = Promise.resolve();
const oscillators = new Set(), timeouts = new Set(), pointers = new Map();
function notice(message, danger=false) { status.textContent = message; status.dataset.kind = danger ? 'warning' : 'ok'; }
function valid(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s) || s.version !== 1 || Object.keys(s).sort().join(',') !== 'answer,hint,page,screen,solved,sound,stage,unlocked,version') return false;
  if (!Number.isInteger(s.unlocked) || s.unlocked < 0 || s.unlocked > TOTAL || !Number.isInteger(s.stage) || s.stage < 0 || s.stage >= TOTAL || s.stage > s.unlocked) return false;
  if (typeof s.answer !== 'string' || s.answer.length > 200 || typeof s.hint !== 'boolean' || typeof s.solved !== 'boolean' || typeof s.sound !== 'boolean') return false;
  if (!['home','play','select','ending'].includes(s.screen) || !Number.isInteger(s.page) || s.page < 0 || s.page > Math.floor(Math.min(s.unlocked,TOTAL-1)/50)) return false;
  if (s.solved && (s.stage >= s.unlocked || norm(s.answer) !== norm(Q[s.stage].a))) return false;
  return s.screen !== 'ending' || s.unlocked === TOTAL;
}
function block(message) { protectedSave = true; notice(message, true); document.getElementById('retry-save').hidden = true; }
function readSave() {
  try {
    storage = window.localStorage;
    expected = storage.getItem(KEY);
    if (expected !== null) {
      const data = JSON.parse(expected);
      if (!data || !Number.isSafeInteger(data.revision) || data.revision < 1 || !valid(data.state)) throw Error('invalid save');
      state = data.state; revision = data.revision;
      notice('保存データを読み込みました（再開後は未保存）。');
    } else {
      // The original key is read only. Never alter another version's progress.
      const legacy = storage.getItem('king-progress');
      if (legacy !== null) {
        if (!/^(0|[1-9]\d*)$/.test(legacy) || +legacy > TOTAL) throw Error('invalid original save');
        state.unlocked = +legacy; state.stage = Math.min(+legacy,TOTAL-1);
        notice('元の進行を読み込みました。次の操作からブラウザ版に保存します。');
      } else notice('進行・入力中の答え・音設定は、このブラウザ内に保存します。');
    }
  } catch (_) { block('保存データを読み込めません。元のデータを上書きせず、この回は保存なしで遊べます。'); }
  if (!protectedSave && !navigator.locks?.request) block('このブラウザでは安全な別タブ保存に対応していません。この回は保存なしで遊べます。');
}
function save() {
  if (protectedSave || !ready) return saveQueue;
  if (!failed) notice('保存中…');
  saveQueue = saveQueue.then(async () => {
    if (protectedSave) return;
    try {
      await navigator.locks.request(KEY, () => {
        if (protectedSave) return;
        const current = storage.getItem(KEY);
        if (current !== expected) { block('別のタブで保存データが変わりました。上書きを停止しました。必要なら現在の記録を書き出し、再読込してください。'); return; }
        if (!valid(state)) { block('進行の整合性を確認できないため、保存を停止しました。現在の記録を書き出して保管してください。'); return; }
        const raw = JSON.stringify({revision:revision+1,state});
        storage.setItem(KEY, raw);
        expected = raw; revision++; failed = false;
        notice('保存しました。'); document.getElementById('retry-save').hidden = true;
      });
    } catch (_) {
      failed = true; notice('保存に失敗しました。この回の進行は未保存です。記録を書き出すか、保存を再試行してください。', true);
      document.getElementById('retry-save').hidden = false;
    }
  });
  return saveQueue;
}
function later(fn, delay) { const id=setTimeout(()=>{timeouts.delete(id); if (!suspended) fn();},delay); timeouts.add(id); }
function stopAudio() {
  clearInterval(interval); interval = undefined;
  for (const id of timeouts) clearTimeout(id); timeouts.clear();
  for (const o of oscillators) { try { o.stop(); } catch (_) {} } oscillators.clear();
  if (ctx?.suspend) Promise.resolve(ctx.suspend()).catch(()=>{});
}
function audioError() {
  audioFailed = true; stopAudio();
  document.getElementById('audio-status').textContent = 'この環境では音を再生できません。文字で続けて遊べます。';
}
function tone(f,d=.17,type='sine') {
  if (!state.sound || suspended || document.hidden || audioFailed) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return audioError();
    ctx ||= new Audio();
    if (ctx.resume) Promise.resolve(ctx.resume()).catch(audioError);
    const o=ctx.createOscillator(),g=ctx.createGain(); o.type=type; o.frequency.value=f;
    g.gain.setValueAtTime(.055,ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+d);
    o.connect(g);g.connect(ctx.destination);o.onended=()=>oscillators.delete(o);oscillators.add(o);o.start();o.stop(ctx.currentTime+d);
  } catch (_) { audioError(); }
}
function startMusic() {
  clearInterval(interval);
  if (!state.sound || suspended || audioFailed) return;
  tone(523); if (!audioFailed) interval=setInterval(()=>tone([261.6,329.6,392,523.2,440,392,329.6,293.7][note++%8],.35),450);
}
function musicLabel() { document.getElementById('music').textContent='♫ 音：'+(state.sound?'ON':'OFF'); }
function home() { state.screen='home'; render(); save(); }
function select(page=Math.floor(Math.min(state.unlocked,TOTAL-1)/50)) {
  if (!Number.isInteger(page) || page<0 || page>Math.floor(Math.min(state.unlocked,TOTAL-1)/50)) return;
  state.screen='select';state.page=page;render();save();
}
function play(i, resume=false) {
  if (!Number.isInteger(i) || i<0 || i>=TOTAL || i>state.unlocked) return;
  if (!resume || i!==state.stage) { state.stage=i;state.answer='';state.hint=false;state.solved=false; }
  state.screen='play';render();save();
}
function result() {
  const m=document.getElementById('msg'), q=Q[state.stage];
  m.textContent='✨ 正解！ '+q.e;
  const b=document.createElement('button'); b.type='button';b.id='next';b.textContent=state.stage===TOTAL-1?'王冠の間へ':'次のステージ';
  b.onclick=()=>{if(suspended)return; if(state.stage===TOTAL-1)ending();else play(state.stage+1);};m.append(document.createElement('br'),b);
  if (state.unlocked%1600===0 && state.stage===state.unlocked-1) { const p=document.createElement('p');p.textContent='🏅 新しい称号：'+titles[state.unlocked/1600];m.append(p); }
}
function hint() { if(suspended || state.screen!=='play' || state.solved)return;state.hint=true;document.getElementById('msg').textContent='💡 '+Q[state.stage].h;save(); }
function check() {
  if(suspended || state.screen!=='play' || state.solved)return;
  const a=document.getElementById('answer');state.answer=a.value.slice(0,200);
  if (norm(state.answer)!==norm(Q[state.stage].a)) {tone(160,.25,'triangle');document.getElementById('msg').textContent='もうひと考え！ ヒントも使ってみよう。';save();return;}
  state.solved=true;if(state.stage===state.unlocked)state.unlocked++;
  document.getElementById('check').disabled=true;a.disabled=true;document.getElementById('hint').disabled=true;
  tone(523);later(()=>tone(659),130);later(()=>tone(784),260);result();save();
}
function ending() {if(state.unlocked<TOTAL)return home();state.screen='ending';render();save();[523,659,784,1047].forEach((f,i)=>later(()=>tone(f,.6),i*230));}
function render() {
  if(state.screen==='home'){
    app.innerHTML=`<div class="card"><div class="crown">👑</div><h2>${titles[Math.min(10,Math.floor(state.unlocked/1600))]}</h2><p>${state.unlocked.toLocaleString()} / 16,000 ステージクリア</p><progress max="16000" value="${state.unlocked}"></progress><p class="sub">難易度 ${Q[Math.min(state.unlocked,TOTAL-1)].d} / 10</p><button id="continue">${state.unlocked===TOTAL?'最終問題に再挑戦':'冒険を続ける'}</button><button class="alt" id="select">ステージ選択</button>${state.unlocked===TOTAL?'<button id="ending">エンディングを見る</button>':''}</div>`;
    document.getElementById('continue').onclick=()=>{const i=Math.min(state.unlocked,TOTAL-1);play(i,state.stage===i&&!state.solved);};
    document.getElementById('select').onclick=()=>select();if(state.unlocked===TOTAL)document.getElementById('ending').onclick=ending;
  } else if(state.screen==='select') {
    const first=state.page*50;
    app.innerHTML=`<div class="card"><h2>ステージ選択</h2><p class="sub">クリア済みの問題にも再挑戦できます · ${state.page+1} / 320 ページ</p><div class="grid">${Q.slice(first,first+50).map((q,i)=>`<button ${first+i>state.unlocked?'disabled':''} data-stage="${first+i}" class="${first+i<state.unlocked?'':'alt'}">${first+i<state.unlocked?'✓ ':''}${q.id}</button>`).join('')}</div><button class="alt" id="previous-page" ${state.page===0?'disabled':''}>前</button><button class="alt" id="next-page" ${first+50>state.unlocked||state.page===319?'disabled':''}>次</button><button class="alt" id="home">戻る</button></div>`;
    for(const b of app.querySelectorAll('[data-stage]'))b.onclick=()=>play(+b.dataset.stage,+b.dataset.stage===state.stage&&!state.solved);
    document.getElementById('previous-page').onclick=()=>select(state.page-1);document.getElementById('next-page').onclick=()=>select(state.page+1);
  } else if(state.screen==='play') {
    const q=Q[state.stage];
    app.innerHTML=`<div class="card"><div class="sub">STAGE ${q.id.toLocaleString()} / 16,000 ・ 難易度 ${q.d}</div><progress max="16000" value="${state.unlocked}"></progress><p class="q">${esc(q.q)}</p><label class="sr-only" for="answer">答え</label><input id="answer" placeholder="答えを入力" maxlength="200" autocomplete="off" enterkeyhint="done"><button id="check">答える</button><button class="alt" id="hint">ヒント</button><div id="msg" aria-live="polite"></div></div><button class="alt" id="home">冒険の記録</button>`;
    const a=document.getElementById('answer');a.value=state.answer;
    a.oninput=()=>{if(!suspended&&!state.solved){state.answer=a.value.slice(0,200);save();}};
    a.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();check();}};
    document.getElementById('check').onclick=check;document.getElementById('hint').onclick=hint;
    if(state.solved){a.disabled=true;document.getElementById('check').disabled=true;document.getElementById('hint').disabled=true;result();}
    else if(state.hint)document.getElementById('msg').textContent='💡 '+q.h;
  } else {
    app.innerHTML='<div class="card" id="end"><div class="crown star">👑</div><p class="sub">ALL STAGES CLEAR</p><h2>なぞなぞ王、誕生。</h2><p class="q">ひとつの「わからない」が、<br>冒険のはじまりだった。<br><br>16,000の扉を開いたあなた。<br>迷い、考え、ひらめいた時間が、<br>いま、王冠に変わる。<br><br>おめでとう、なぞなぞ王！</p><p>称号「なぞなぞ王」を獲得しました</p><p class="sub">企画：咲華<br>あなたの冒険は、これからも続く。</p><button id="home">冒険の記録へ</button></div>';
  }
  const back=document.getElementById('home');if(back)back.onclick=home;
}
function releasePointers(){for(const [id,target] of pointers){try{if(target.hasPointerCapture?.(id))target.releasePointerCapture(id);}catch(_) {}}pointers.clear();}
function pause(){if(!ready)return;suspended=true;stopAudio();releasePointers();document.activeElement?.blur?.();document.querySelector('main').inert=true;document.getElementById('music').disabled=true;document.getElementById('pause-panel').hidden=false;document.body.classList.add('paused');document.getElementById('resume').focus();save();}
function resume(){if(document.hidden)return;suspended=false;document.querySelector('main').inert=false;document.getElementById('music').disabled=false;document.getElementById('pause-panel').hidden=true;document.body.classList.remove('paused');startMusic();document.getElementById('answer')?.focus();}
function download(){
  try{const data={revision:Math.max(revision,1),state};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='riddle-king-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.getElementById('import-status').textContent='現在の記録ファイルを書き出しました。ダウンロード先を確認してください。';}
  catch(_){document.getElementById('import-status').textContent='記録を書き出せませんでした。このページを閉じずに、ブラウザのダウンロード設定を確認してください。';}
}
document.getElementById('music').onclick=()=>{if(suspended||!ready)return;state.sound=!state.sound;audioFailed=false;document.getElementById('audio-status').textContent='';musicLabel();if(state.sound)startMusic();else stopAudio();save();};
document.getElementById('resume').onclick=resume;document.getElementById('pause').onclick=pause;
document.getElementById('retry-save').onclick=save;document.getElementById('export-save').onclick=download;
document.getElementById('import-save').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  const importStatus=document.getElementById('import-status');
  if(protectedSave){importStatus.textContent='保存保護中は復元できません。元のデータを変更せず、再読込で状態を確認してください。';return;}
  try{
    if(file.size>20000)throw Error('large file');
    const data=JSON.parse(await file.text());
    if(!data||!valid(data.state))throw Error('invalid save');
    if(!confirm('このブラウザの記録を、選んだファイルの '+data.state.unlocked+' 問クリアの記録で置き換えますか？'))return;
    if(protectedSave){importStatus.textContent='別タブの更新を検出したため、復元を中止しました。';return;}
    stopAudio();state=data.state;render();musicLabel();await save();
    importStatus.textContent=protectedSave||failed?'ファイルは読み込みましたが未保存です。保存欄を確認してください。':'記録を復元しました。';
    if(state.sound)pause();
  }catch(_){importStatus.textContent='記録ファイルを読み込めませんでした。進行と保存データは変更していません。';}
};
document.getElementById('reload').onclick=()=>{if(confirm('未保存の進行は失われます。必要なら先に記録を書き出してください。再読込しますか？'))location.reload();};
window.addEventListener('blur',pause);window.addEventListener('pagehide',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('storage',e=>{if((e.key===KEY||e.key===null)&&(!e.storageArea||e.storageArea===storage)&&e.newValue!==expected)block('別のタブで保存データが変わりました。上書きを停止しました。記録を書き出すか、再読込してください。');});
document.addEventListener('pointerdown',e=>pointers.set(e.pointerId,e.target));
for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>pointers.delete(e.pointerId));
try {
  if(!Array.isArray(Q)||Q.length!==TOTAL||Q.some((q,i)=>q.id!==i+1||!Number.isInteger(q.d)||q.d<1||q.d>10||['q','a','h','e'].some(k=>typeof q[k]!=='string'||!q[k].trim())))throw Error('invalid data');
  readSave();ready=true;render();musicLabel();
  // Loading a saved ON setting never starts audio without an explicit gesture.
  if(state.sound)pause();
} catch (_) {app.textContent='問題データを読み込めませんでした。通信を確認して再読込してください。保存データは変更していません。';block('起動できなかったため、保存は行いません。');document.getElementById('music').disabled=true;document.getElementById('export-save').disabled=true;}
})();
