"use strict";

const $ = (id) => document.getElementById(id);
const elements = Object.fromEntries([
  "level-list", "clear-count", "global-progress", "stage-level", "stage-number",
  "phrase", "kana", "demo", "demo-label", "speed", "rounds", "record",
  "record-label", "status", "retry-area", "result", "browse-subtitle",
  "phrase-list", "random", "prev", "next", "help", "help-button", "close-help",
  "score-value", "score-misses","manual-round","automatic-speech","record-status","show-ending","reset-clears","restore-clears"
].map((id) => [id, $(id)]));
const MAX_SCORE = 100;
const PASS_SCORE = 85;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const pad = (n) => String(n).padStart(3, "0");
function micNotice(){
  if(window.isSecureContext!==true)return "マイクにはHTTPSなどの安全な接続が必要です。マイクなしの自己採点を使えます。";
  const policy=document.permissionsPolicy||document.featurePolicy;
  try{if(policy?.allowsFeature&&!policy.allowsFeature("microphone"))return "この画面ではマイクが制限されています。マイクなしの自己採点を使えます。";}catch{}
  return navigator.mediaDevices?.getUserMedia&&window.MediaRecorder?"":"この画面ではマイク録音を利用できません。マイクなしの自己採点を使えます。";
}
const micAvailable=()=>!micNotice();
elements["automatic-speech"].checked=false;
let progress=null, micEpoch=0, manageOperation=null;
function readClears(){
  try{progress=HayakuchiRecords.read(localStorage);return new Set(progress.ids);}
  catch(e){progress=null;elements["record-status"].textContent=e.message;return new Set();}
}
const state = {
  phrase: PHRASES[0],
  clears: readClears(),
  rounds: [],
  pending: null,
  session: null,
  busy: false,
  demo: null,
  message: "",
  isError: false
};

function saveClear(){
  if(!progress)return false;
  try{progress=HayakuchiRecords.append(localStorage,progress,state.phrase.id);state.clears=new Set(progress.ids);return true;}
  catch(e){state.clears=readClears();elements["record-status"].textContent=e.message;return false;}
}
function controlsExtra(){
  const locked=Boolean(state.session||state.busy);
  elements["manual-round"].disabled=locked||state.rounds.length===3;
  elements["automatic-speech"].disabled=locked||!Recognition||!micAvailable();
  elements["show-ending"].hidden=state.clears.size!==PHRASES.length;
  elements["show-ending"].disabled=locked;
  elements["reset-clears"].disabled=locked||!progress||state.clears.size===0;
  elements["restore-clears"].hidden=!progress||progress.backup===null;
  elements["restore-clears"].disabled=locked;
}
function showEnding(){
  if(state.clears.size!==PHRASES.length||state.session||state.busy)return;
  stopDemo(false);clearPlayer();$("ending").showModal();
}
function manageRecords(restore){
  if(state.busy||state.session||!progress)return;
  try{
    const current=HayakuchiRecords.read(localStorage);
    if(restore&&current.backup===null)return;
    manageOperation={current,restore};
    stopDemo(false);clearPlayer();
    $("manage-title").textContent=restore?"保管した記録に戻しますか？":"クリア記録をリセットしますか？";
    $("manage-explain").textContent=restore?"現在の記録と保管した記録を入れ替えます。":"現在のクリア記録を保管し、0問から始めます。前に保管した記録は置き換わります。";
    $("manage-error").textContent="";$("manage-apply").textContent=restore?"保管した記録に戻す":"リセットする";
    $("manage-records").showModal();
  }catch(e){elements["record-status"].textContent=e.message;}
}
async function applyRecords(){
  const op=manageOperation, btn=$("manage-apply");
  if(!op||!$("manage-records").open||btn.disabled)return;
  btn.disabled=true;
  const apply=()=>{
    if(manageOperation!==op||!$("manage-records").open)return;
    const generation=globalThis.crypto?.randomUUID?.()??Date.now()+":"+Math.random();
    progress=HayakuchiRecords.switchSaves(localStorage,op.current,op.current.backup,op.restore,generation);
    resetAttempt();state.clears=new Set(progress.ids);state.phrase=PHRASES[0];renderPhrase(false);
    $("manage-records").close();elements["record-status"].textContent=op.restore?"記録を復元しました。":"リセットしました。直前の記録は復元できます。";
  };
  try{if(navigator.locks?.request)await navigator.locks.request(HayakuchiRecords.key,apply);else apply();}
  catch(e){$("manage-error").textContent=e.message;} finally {btn.disabled=false;}
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  if (tag === "button") node.type = "button";
  return node;
}

function button(className, text, action) {
  const node = make("button", className, text);
  node.addEventListener("click", action);
  return node;
}

const WAVE = [4,9,7,16,12,22,13,9,27,39,21,12,43,65,40,18,27,47,34,11,23,49,61,34,18,11,32,43,21,9,15,30,22,11,16,8,7,4];
for (const el of document.querySelectorAll(".wave")) {
  const heights = el.classList.contains("intro-wave") ? WAVE : WAVE.slice(10, 30);
  heights.forEach((height, i) => {
    const bar = make("span");
    bar.style.setProperty("--height", height);
    bar.style.setProperty("--i", i);
    el.append(bar);
  });
}

function renderSelector(scroll = false) {
  const tier = state.phrase.tier;
  LEVELS.forEach((level, index) => {
    const node = elements["level-list"].children[index];
    const count = PHRASES.filter(item => item.tier === index && state.clears.has(item.id)).length;
    node.setAttribute("aria-pressed", index === tier);
    node.setAttribute("aria-label", level.name + "、" + count + "問クリア");
    node.querySelector(".level-count").textContent = count + "/40";
  });

  if (elements["phrase-list"].dataset.tier !== String(tier)) {
    elements["phrase-list"].dataset.tier = tier;
    elements["phrase-list"].replaceChildren(...PHRASES.filter(p => p.tier === tier).map(p => {
      const node = button("phrase-button", "", () => {
        selectPhrase(p.id);
        const active = elements["phrase-list"].querySelector("[aria-current=true]");
        active?.focus({preventScroll:true});
        if (matchMedia("(max-width: 570px)").matches) {
          elements.phrase.scrollIntoView({block:"center", behavior:"instant"});
          elements.record.focus({preventScroll:true});
        }
      });
      node.dataset.id = p.id;
      node.title = p.text;
      const mark = make("span", "checked");
      mark.setAttribute("aria-hidden", "true");
      node.append(make("span", "id", pad(p.id)), make("span", "row-label", p.text), mark);
      return node;
    }));
    elements["phrase-list"].scrollTop = 0;
  }

  for (const node of elements["phrase-list"].children) {
    const id = Number(node.dataset.id);
    const cleared = state.clears.has(id);
    node.setAttribute("aria-current", id === state.phrase.id);
    node.setAttribute("aria-label", pad(id) + " " + PHRASES[id - 1].text + (cleared ? "、クリア済み" : ""));
    node.querySelector(".checked").textContent = cleared ? "✓" : "";
  }
  if (scroll) {
    const list = elements["phrase-list"];
    const active = list.querySelector("[aria-current=true]");
    if (active) {
      const row = active.getBoundingClientRect();
      const box = list.getBoundingClientRect();
      if (row.top < box.top) list.scrollTop -= box.top - row.top + 3;
      if (row.bottom > box.bottom) list.scrollTop += row.bottom - box.bottom + 3;
    }
  }
  elements["browse-subtitle"].textContent = LEVELS[tier].name + " · " + LEVELS[tier].note;
  elements["clear-count"].textContent = state.clears.size;
  elements["global-progress"].value = state.clears.size;
}

function setMessage(message = "", error = false) {
  state.message = message;
  state.isError = error;
}

function updateControls() {
  const recording = Boolean(state.session && !state.session.finishing && !state.busy);
  elements.record.disabled = state.busy || (!state.session && (Boolean(state.demo) || state.rounds.length === 3 || !micAvailable()));
  elements.record.classList.toggle("is-recording", recording);
  elements["record-label"].textContent = recording ? "録音を止める"
    : state.busy ? (state.session ? "確認中…" : "マイク準備中…")
    : state.rounds.length === 3 ? "3回の挑戦完了"
    : state.pending ? (state.rounds.length + 1) + "回目を録り直す"
    : (state.rounds.length + 1) + "回目を録音";

  elements.demo.disabled = Boolean(state.session || state.busy);
  controlsExtra();
  elements.speed.disabled = Boolean(state.demo);
  elements["demo-label"].textContent = state.demo ? "手本を止める" : "手本を聴く";
  elements.prev.disabled = state.busy || state.phrase.id === 1;
  elements.next.disabled = state.busy || state.phrase.id === PHRASES.length;
  elements.random.disabled = state.busy;
  for (const node of [...elements["level-list"].children, ...elements["phrase-list"].children]) {
    node.disabled = state.busy;
  }

  elements.status.textContent=state.message||micNotice()||"1回ずつ録音します。言い終わったら録音を止めてね。";
  elements.status.classList.toggle("error",state.isError);
}

function renderRounds() {
  const rounds = [];
  for (let i = 0; i < 3; i++) {
    const row = make("li");
    const item = state.rounds[i];
    const active = i === state.rounds.length;
    const className = "round" + (item ? (item.mistakes ? " review" : " done") : active ? " active" : "");
    const marker = make("strong", "", String(i + 1));
    marker.setAttribute("aria-hidden", "true");
    const badge = item
      ? button(className, "", () => showAudio(item, i))
      : make("span", className);
    if (item) badge.setAttribute("aria-label", (i + 1) + "回目の録音を確認、ミス" + item.mistakes + "回");
    if (active) badge.setAttribute("aria-current", "step");
    badge.append(marker, document.createTextNode((i + 1) + "回目"));
    if (item) badge.append(make("span", "round-deduction", item.mistakes ? "−" + item.mistakes : "✓"));
    row.append(badge);
    rounds.push(row);
  }
  elements.rounds.replaceChildren(...rounds);
  const {score, mistakes} = scoreRounds(state.rounds);
  elements["score-value"].textContent = String(score);
  elements["score-misses"].textContent = "ミス合計 " + mistakes + "回";
}

function renderPhrase(scroll = true) {
  const item = state.phrase;
  elements["stage-level"].textContent = LEVELS[item.tier].name;
  elements["stage-number"].textContent = "NO. " + pad(item.id) + " / " + PHRASES.length;
  elements.phrase.classList.toggle("long", item.text.length > 22);
  elements.phrase.replaceChildren(...item.text.split(" ").flatMap((part, i) => {
    const node = make("span", "", part);
    return i ? [document.createTextNode(" "), node] : [node];
  }));
  elements.kana.textContent = item.kana;
  renderSelector(scroll);
  renderRounds();
  updateControls();
}

function clearPlayer() {
  const panel = elements["retry-area"];
  panel.querySelector("audio")?.pause();
  panel.replaceChildren();
  panel.hidden = true;
}

function discard(blob) {
  if (blob?.url) URL.revokeObjectURL(blob.url);
}

function resetAttempt() {
  stopDemo(false);
  cancelRecording();
  clearPlayer();
  for (const item of state.rounds) discard(item);
  discard(state.pending);
  state.rounds = [];
  state.pending = null;
  elements.result.hidden = true;
  elements.result.replaceChildren();
  setMessage();
}

function selectPhrase(id) {
  if (state.busy) return;
  const next = PHRASES[id - 1];
  if (!next || next === state.phrase) return;
  resetAttempt();
  state.phrase = next;
  renderPhrase();
}

function showAudio(item, i, pending = false) {
  if (state.busy || state.session) return;
  stopDemo(false);
  clearPlayer();
  const panel = elements["retry-area"];
  panel.hidden = false;
  panel.append(make("p","",(i+1)+"回目"+(item.url?"の録音":"の自己採点")+(item.transcript?" · 聞き取った文「"+item.transcript+"」":"")));
  if(item.url){
    const audio=make("audio");audio.controls=true;audio.preload="metadata";audio.src=item.url;
    audio.addEventListener("play",()=>stopDemo());audio.setAttribute("aria-label",(i+1)+"回目の録音を聴く");panel.append(audio);
  }
  if (pending) {
    panel.append(make("p", "", "音声認識で採点できませんでした。録音を聴き、ミスの回数を入力してください。"));
    const form = make("form", "manual-score");
    const label = make("label", "", "ミス回数");
    const input = make("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.required = true;
    input.min = "0";
    input.step = "1";
    input.placeholder = "0";
    label.append(input);
    const submit = make("button", "secondary", "採点する");
    submit.type = "submit";
    form.append(label, submit);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const mistakes = input.valueAsNumber;
      if (state.pending !== item || !Number.isSafeInteger(mistakes) || mistakes < 0) return;
      acceptRound({...item, mistakes, manual: true});
      focusAfterScoring();
    });
    panel.append(form);
  } else {
    panel.append(make("p", "", "ミス " + item.mistakes + "回（" + (item.manual ? "自己採点" : "自動採点") + "）"));
    panel.append(button("secondary", "閉じる", () => {
      clearPlayer();
      if (state.pending) showAudio(state.pending, state.rounds.length, true);
      else elements.rounds.children[i]?.querySelector("button")?.focus();
    }));
  }
  updateControls();
}

function scoreRounds(rounds) {
  const mistakes = rounds.reduce((sum, round) => sum + round.mistakes, 0);
  return {mistakes, score: Math.max(0, MAX_SCORE - mistakes)};
}

function focusAfterScoring() {
  if (state.rounds.length === 3) elements.result.focus();
  else if(state.rounds.at(-1)?.manual||elements.record.disabled)elements["manual-round"].focus();
  else elements.record.focus();
}

function acceptRound(item) {
  clearPlayer();
  state.pending = null;
  state.rounds.push(item);
  renderRounds();

  if (state.rounds.length < 3) {
    setMessage(state.rounds.length + "回目はミス" + item.mistakes + "回。" + (state.rounds.length + 1) + "回目へ進もう。");
  } else {
    const {score} = scoreRounds(state.rounds);
    const passed = score >= PASS_SCORE;
    const saved = passed && saveClear();
    if (passed) renderSelector();
    const box = elements.result;
    box.replaceChildren();
    box.hidden = false;
    box.classList.toggle("result-missed", !passed);
    box.append(make("strong", "", passed ? "クリア！" : "クリアまであと " + (PASS_SCORE - score) + "点"));
    const manualCount = state.rounds.filter(record => record.manual).length;
    const autoCount = 3 - manualCount;
    box.append(make("p", "", [autoCount ? "自動採点 " + autoCount + "回" : "", manualCount ? "自己採点 " + manualCount + "回" : ""].filter(Boolean).join(" · ")));
    if (passed && state.phrase.id < PHRASES.length) {
      box.append(button("secondary", "次のお題へ ›", () => {
        selectPhrase(state.phrase.id + 1);
        elements.record.focus();
      }));
    }
    if(saved&&state.clears.size===PHRASES.length)box.append(button("secondary","エンディングを見る",showEnding));
    box.append(button("nav-button", "もう一度挑戦", () => {
      resetAttempt();
      renderPhrase(false);
      elements.record.focus();
    }));
    setMessage(!passed ? score + "点。もう一度挑戦できます。"
      : !saved ? score + "点。クリア記録を保存できませんでした。"
      : state.clears.size === PHRASES.length ? score + "点。全200問をクリアしました！"
      : score + "点。クリア記録を保存しました。", passed && !saved);
  }
  updateControls();
}

function stopDemo(resetMessage = true) {
  if (!state.demo) return;
  const {audio} = state.demo;
  state.demo = null;
  audio.pause();
  if (resetMessage) setMessage();
  updateControls();
}

function playDemo() {
  if (state.session || state.busy) return;
  if (state.demo) {
    stopDemo();
    return;
  }
  elements["retry-area"].querySelector("audio")?.pause();
  const audio = new Audio("./demo/" + pad(state.phrase.id) + ".mp3");
  const demo = {audio, run: 1};
  audio.playbackRate = Number(elements.speed.value);
  state.demo = demo;
  setMessage("手本を再生中 · 1 / 3 回目");
  updateControls();

  const failed = () => {
    if (state.demo !== demo) return;
    stopDemo(false);
    setMessage("手本を再生できませんでした。もう一度押してください。", true);
    updateControls();
  };
  audio.addEventListener("error", failed, {once:true});
  audio.addEventListener("timeupdate", () => {
    if (state.demo !== demo || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const current = Math.min(3, Math.floor(audio.currentTime / audio.duration * 3) + 1);
    if (current === demo.run) return;
    demo.run = current;
    setMessage("手本を再生中 · " + current + " / 3 回目");
    updateControls();
  });
  audio.addEventListener("ended", () => {
    if (state.demo !== demo) return;
    state.demo = null;
    setMessage("手本が3回流れました。");
    updateControls();
  }, {once:true});
  audio.play().catch(failed);
}

function compact(text) {
  return text.normalize("NFKC").replace(/[\p{P}\p{S}\s]/gu, "").toLowerCase();
}

function toHiragana(text) {
  return text.replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

const commonReadings = new Map([
  ["卵", "たまご"], ["玉子", "たまご"], ["カエル", "かえる"], ["蛙", "かえる"],
  ["食う", "くう"], ["喰う", "くう"], ["云う", "いう"], ["いう", "いう"],
  ["米", "こめ"], ["麦", "むぎ"], ["生", "なま"], ["三ぴょこ", "みぴょこ"],
  ["3ぴょこ", "みぴょこ"], ["六ぴょこ", "むぴょこ"], ["6ぴょこ", "むぴょこ"],
  ["赤", "あか"], ["青", "あお"], ["巻き紙", "まきがみ"], ["巻紙", "まきがみ"],
  ["ショー", "しょー"], ["坊主", "ぼうず"], ["上手", "じょうず"], ["描いた", "かいた"],
  ["屏風", "びょうぶ"], ["桃", "もも"], ["李", "すもも"], ["柿", "かき"],
  ["爆発", "ばくはつ"], ["鶏", "にわとり"], ["ニワトリ", "にわとり"],
  ["ぴょこぴょこ", "ぴょこぴょこ"]
]);

function soundUnits(text) {
  return text.match(/[ぁ-ゖ][ぁぃぅぇぉゃゅょゎ]?|./gu) || [];
}

function editCount(expected, actual) {
  const a = soundUnits(expected);
  const b = soundUnits(actual);
  let previous = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 0; i < a.length; i++) {
    const row = [i + 1];
    for (let j = 0; j < b.length; j++) {
      row.push(Math.min(previous[j + 1] + 1, row[j] + 1, previous[j] + Number(a[i] !== b[j])));
    }
    previous = row;
  }
  return previous[b.length];
}

function compareSpeech(item, alternatives) {
  const normalizedText = toHiragana(compact(item.text));
  const expectedReadings = [...new Set([item.kana, spokenKana(item)].map(text => toHiragana(compact(text))))];
  const words = item.text.split(" ");
  const readings = item.kana.split(" ");
  const localReadings = new Map(commonReadings);
  words.forEach((part, index) => localReadings.set(toHiragana(compact(part)), toHiragana(compact(readings[index]))));
  const dictionary = [...localReadings.entries()].map(([key, reading]) => [toHiragana(key), reading]).sort((a, b) => b[0].length - a[0].length);

  let best = null;
  for (const transcript of alternatives) {
    const heard = toHiragana(compact(transcript));
    if (!heard) continue;
    if (heard === normalizedText) return {transcript, mistakes: 0};
    let converted = "";
    for (let offset = 0; offset < heard.length;) {
      const match = dictionary.find(([term]) => heard.startsWith(term, offset));
      if (match) {
        converted += match[1];
        offset += match[0].length;
      } else {
        converted += heard[offset++];
      }
    }
    const distances = expectedReadings.map(reading => editCount(reading, converted));
    if (/[^ぁ-ゖー]/u.test(converted)) distances.push(editCount(normalizedText, heard));
    const mistakes = Math.min(...distances);
    if (!best || mistakes < best.mistakes) best = {transcript, mistakes};
  }
  return best;
}

function startRecognition(session) {
  if(!Recognition||!session.autoConsent||!elements["automatic-speech"].checked||!micAvailable()||document.hidden||state.session!==session)return;
  try {
    const recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;
    const ended = new Promise(resolve => {
      session.resolveRecognition = resolve;
      recognition.onend = resolve;
      recognition.onerror = resolve;
    });
    recognition.onresult = event => {
      const sets = Array.from(event.results).filter(set => set.isFinal);
      const transcript = sets.map(set => set[0]?.transcript ?? "").join(" ").trim();
      session.alternatives = sets.length === 1 ? Array.from(sets[0], item => item.transcript) : [transcript];
    };
    session.recognition = recognition;
    session.recognitionEnded = ended;
    recognition.start();
  } catch {
    session.resolveRecognition?.();
  }
}

async function startRecording() {
  if (!micAvailable() || state.busy || state.session || state.demo || state.rounds.length === 3) return;
  state.busy = true;
  setMessage("ブラウザのマイク使用を許可してください。");
  clearPlayer();
  updateControls();
  let stream;
  const epoch=++micEpoch, autoConsent=Boolean(elements["automatic-speech"].checked);
  try {
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(epoch!==micEpoch||document.hidden||!micAvailable()){stream.getTracks().forEach(track=>track.stop());return;}
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };
    const sound = new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, {type: recorder.mimeType || chunks[0]?.type}));
      recorder.onerror = () => resolve(null);
    });
    recorder.start();
    const session = {stream, recorder, sound, phrase: state.phrase, startTime: performance.now(), autoConsent, finishing: false};
    state.session = session;
    discard(state.pending);
    state.pending = null;
    startRecognition(session);
    session.limit = setTimeout(stopRecording, 45000);
    setMessage("録音中 · お題を1回読んでから止めてね。");
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    if(epoch!==micEpoch)return;
    setMessage(error?.name === "NotAllowedError"
      ? "マイクを使えませんでした。マイクなしの自己採点でも遊べます。"
      : "マイクを開けませんでした。入力機器を確認して、もう一度お試しください。", true);
  } finally {
    if(epoch===micEpoch){state.busy=false;updateControls();if(state.pending)showAudio(state.pending,state.rounds.length,true);}
  }
}

function stopTracks(session){if(session.tracksStopped)return;session.tracksStopped=true;session.stream.getTracks().forEach(track=>track.stop());}
function release(session, abort) {
  clearTimeout(session.limit);
  if (abort) {
    try { session.recognition?.abort(); } catch {}
  }
  stopTracks(session);
}

function cancelRecording() {
  const session = state.session;
  if (!session) return;
  state.session = null;
  try{if(session.recorder.state!=="inactive")session.recorder.stop();}catch{}finally{release(session,true);}
}

function within(promise, ms) {
  let timeout;
  return Promise.race([promise, new Promise(resolve => { timeout = setTimeout(() => resolve(null), ms); })])
    .finally(() => clearTimeout(timeout));
}

async function stopRecording() {
  const session = state.session;
  if (!session || session.finishing) return;
  session.finishing = true;
  state.busy = true;
  setMessage("録音を確認中…");
  updateControls();
  const duration = performance.now() - session.startTime;
  let scored = false;
  const epoch=micEpoch;
  try{if(session.recorder.state!=="inactive")session.recorder.stop();}catch{}
  try { session.recognition?.stop(); } catch {}
  stopTracks(session);
  try {
    const [blob] = await Promise.all([
      within(session.sound, 3400),
      session.recognitionEnded ? within(session.recognitionEnded, 2800) : Promise.resolve()
    ]);
    if (state.session !== session) return;
    if (!blob?.size || duration < 300) {
      setMessage("録音が短すぎるか、音声を取得できませんでした。もう一度録音してね。", true);
      return;
    }
    const result = compareSpeech(session.phrase, session.alternatives || []);
    const url = URL.createObjectURL(blob);
    if (result) {
      acceptRound({...result, url, manual: false});
      scored = true;
    } else {
      state.pending = {url};
      setMessage("ミス回数を入力するか、録り直せます。");
    }
  } catch {
    if(epoch===micEpoch)setMessage("録音を確認できませんでした。もう一度録音してね。", true);
  } finally {
    release(session, true);
    if(epoch===micEpoch){
      if(state.session===session)state.session=null;
      state.busy=false;updateControls();
      if(state.pending)showAudio(state.pending,state.rounds.length,true);
      else if(scored)focusAfterScoring();
    }
  }
}

LEVELS.forEach((level, index) => {
  const node = button("level-button", "", () => {
    if (state.phrase.tier !== index) selectPhrase(index * 40 + 1);
  });
  node.append(make("span", "level-index", String(index + 1)), make("span", "level-name", level.name), make("span", "level-count"));
  elements["level-list"].append(node);
});
elements.demo.addEventListener("click", playDemo);
elements.record.addEventListener("click", () => state.session ? stopRecording() : startRecording());
elements.prev.addEventListener("click", () => selectPhrase(state.phrase.id - 1));
elements.next.addEventListener("click", () => selectPhrase(state.phrase.id + 1));
elements.random.addEventListener("click", () => {
  const tierOptions = PHRASES.filter(p => p.tier === state.phrase.tier && p.id !== state.phrase.id);
  const unfinished = tierOptions.filter(p => !state.clears.has(p.id));
  const options = unfinished.length ? unfinished : tierOptions;
  selectPhrase(options[Math.floor(Math.random() * options.length)].id);
});
elements["help-button"].addEventListener("click", ()=>{if(state.session||state.busy){silencePage();setMessage("録音を中止しました。続けるときは、もう一度録音してね。");}elements.help.showModal();});
elements["close-help"].addEventListener("click", () => elements.help.close());
elements.help.addEventListener("click", event => {
  if (event.target !== elements.help) return;
  const rect = elements.help.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) elements.help.close();
});
function silencePage(){
  micEpoch++;elements["automatic-speech"].checked=false;cancelRecording();
  state.busy=false;stopDemo(false);elements["retry-area"].querySelector("audio")?.pause();updateControls();
}
window.addEventListener("pagehide",silencePage);
document.addEventListener("visibilitychange",()=>{if(document.hidden)silencePage();});
window.addEventListener("storage",event=>{
  if(event.key!==null&&![HayakuchiRecords.key,HayakuchiRecords.legacyKey,HayakuchiRecords.backupKey].includes(event.key))return;
  const oldGeneration=progress?.generation;state.clears=readClears();
  if(oldGeneration!==progress?.generation){
    silencePage();resetAttempt();renderRounds();
    if($("ending").open)$("ending").close();
    if($("manage-records").open)$("manage-records").close();
  }
  renderSelector();updateControls();
});
elements["manual-round"].onclick=()=>{
  if(state.busy||state.session||state.rounds.length===3)return;
  stopDemo(false);discard(state.pending);state.pending={manual:true};showAudio(state.pending,state.rounds.length,true);
};
elements["show-ending"].onclick=showEnding;
elements["reset-clears"].onclick=()=>manageRecords(false);
elements["restore-clears"].onclick=()=>manageRecords(true);
$("close-ending").onclick=()=>$("ending").close();
$("replay-first").onclick=()=>{$("ending").close();resetAttempt();state.phrase=PHRASES[0];renderPhrase();elements.phrase.scrollIntoView({block:"center"});};
$("manage-cancel").onclick=()=>$("manage-records").close();
$("manage-apply").onclick=applyRecords;
$("manage-records").addEventListener("close",()=>{manageOperation=null;});
renderPhrase();
