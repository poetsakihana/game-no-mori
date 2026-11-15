import { stages } from "./catalog.js";
import { cardIcon, PixelDisplay } from "./art.js";
import { drawSession, inputSession, sessionFor, updateSession } from "./games.js";
import { loadRecord, nextUncleared, recordClear, unlockedCount } from "./progress.js";

const storageKey = "pocket-lcd-100:save:v1";
const pageSize = 12;
const format = value => String(value).padStart(2, "0");
const nodes = Object.fromEntries([
  "sound", "sound-label", "help", "help-open", "unlocked-count", "clear-count", "progress-track", "progress-fill",
  "device", "device-number", "screen", "score", "goal", "time", "life", "screen-end", "screen-title", "screen-subtitle",
  "left", "right", "action", "game-number", "game-name", "game-cleared", "game-description", "game-objective",
  "primary", "primary-icon", "primary-label", "secondary", "arrow-hint", "action-hint", "arrow-help", "action-help", "game-result",
  "open-total", "cleared-total", "range", "games", "empty", "previous-page", "next-page", "page-number", "pagination"
].map(id => [id, document.getElementById(id)]));
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const touchLayout = matchMedia("(max-width: 760px)");
const display = new PixelDisplay(nodes.screen);
const indexed = new Map(stages.map(stage => [stage.id, stage]));

function readSave() {
  try {
    return loadRecord(JSON.parse(localStorage.getItem(storageKey)));
  } catch {
    return loadRecord(null);
  }
}

const record = readSave();
let stage = indexed.get(record.selected);
let session = sessionFor(stage);
let mode = "ready";
let filter = "all";
let page = Math.floor((stage.id - 1) / pageSize);
let unlockedStage = null;
let nextStage = null;
let frameId = 0;
let previousTime = null;
let lastSignal = 0;
let audio = null;

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      selected: stage.id,
      sound: record.sound,
      cleared: [...record.cleared]
    }));
  } catch {
    // Progress remains available for this tab when storage is unavailable.
  }
}

function playTone(kind) {
  if (!record.sound) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    audio ??= new Audio();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    const melody = {
      start: [470, 705], move: [345], point: [815, 1100],
      miss: [225, 165], win: [523, 659, 784, 1047], fail: [350, 255, 180]
    }[kind];
    melody.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      const start = audio.currentTime + index * .07;
      const duration = kind === "move" ? .04 : .08;
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(.024, start);
      volume.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(volume);
      volume.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    });
  } catch {
    // Browser audio support is optional.
  }
}

function renderSound() {
  nodes.sound.setAttribute("aria-pressed", String(record.sound));
  nodes["sound-label"].textContent = record.sound ? "音あり" : "音なし";
}

function renderProgress() {
  const count = unlockedCount(record);
  nodes["unlocked-count"].textContent = format(count);
  nodes["clear-count"].textContent = format(record.cleared.size);
  nodes["open-total"].textContent = format(count);
  nodes["cleared-total"].textContent = format(record.cleared.size);
  nodes["progress-track"].setAttribute("aria-valuenow", String(record.cleared.size));
  nodes["progress-fill"].style.width = record.cleared.size + "%";
}

function filteredStages() {
  if (filter === "open") return stages.slice(0, unlockedCount(record));
  if (filter === "cleared") return stages.filter(item => record.cleared.has(item.id));
  return stages;
}

function span(name, content = "") {
  const element = document.createElement("span");
  element.className = name;
  element.textContent = content;
  return element;
}

function makeCard(item) {
  const locked = item.id > unlockedCount(record);
  const cleared = record.cleared.has(item.id);
  const status = locked ? "未解放" : cleared ? "クリア済み" : item.category;
  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card";
  card.dataset.stage = item.id;
  card.disabled = locked;
  if (!locked) card.setAttribute("aria-pressed", String(item.id === stage.id));
  card.setAttribute("aria-label", format(item.id) + " " + item.title + " " + status);

  const top = span("card-top", format(item.id));
  const pin = span("card-pin" + (!locked && !cleared ? " open" : ""), cleared ? "✓" : "");
  pin.setAttribute("aria-hidden", "true");
  if (locked) pin.append(span("lock-icon"));
  top.append(pin);
  const icon = span("card-icon");
  icon.append(cardIcon(item.icon, locked ? "#77856e" : "#c6dc8e"));
  card.append(top, icon, span("card-title", item.title), span("card-status", status));
  return card;
}

function renderCatalog() {
  const list = filteredStages();
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  page = Math.min(page, pages - 1);
  const visible = list.slice(page * pageSize, (page + 1) * pageSize);
  const focusedStage = document.activeElement?.dataset.stage;
  nodes.games.replaceChildren(...visible.map(makeCard));
  if (focusedStage) nodes.games.querySelector('[data-stage="' + focusedStage + '"]')?.focus({ preventScroll: true });

  const range = visible.length ? format(visible[0].id) + "–" + format(visible.at(-1).id) : "";
  nodes.range.textContent = filter === "all" ? range : "";
  nodes.empty.hidden = list.length !== 0;
  nodes.pagination.hidden = pages <= 1;
  nodes["previous-page"].disabled = page === 0;
  nodes["next-page"].disabled = page === pages - 1;
  nodes["page-number"].textContent = format(page + 1) + " / " + format(pages);
  for (const button of filterButtons) button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
}

function textIfChanged(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function renderHardware() {
  textIfChanged(nodes.score, format(session.score));
  textIfChanged(nodes.goal, format(stage.goal));
  textIfChanged(nodes.time, format(Math.ceil(session.time)));
  const lives = 3 - session.misses;
  const life = "ミス残り" + lives + "回";
  if (nodes.life.getAttribute("aria-label") !== life) {
    nodes.life.setAttribute("aria-label", life);
    nodes.life.replaceChildren(...Array.from({ length: 3 }, (_, index) => {
      const mark = document.createElement("i");
      mark.classList.toggle("spent", index >= lives);
      mark.setAttribute("aria-hidden", "true");
      return mark;
    }));
  }
  drawSession(session, display, mode === "ready");
}

function showActions(icon, title, secondary = "") {
  nodes["primary-icon"].textContent = icon;
  nodes["primary-label"].textContent = title;
  nodes.secondary.hidden = !secondary;
  nodes.secondary.textContent = secondary;
}

function renderDetails() {
  nodes["game-number"].textContent = format(stage.id);
  nodes["device-number"].textContent = format(stage.id) + " · " + stages.length;
  nodes["game-name"].textContent = stage.title;
  nodes["game-cleared"].hidden = !record.cleared.has(stage.id);
  nodes["game-description"].textContent = stage.description;
  nodes["game-objective"].textContent = stage.objective + " ｜ " + stage.seconds + "秒";
  nodes["arrow-hint"].textContent = stage.arrows;
  nodes["arrow-help"].hidden = stage.arrows === "—";
  nodes["action-hint"].textContent = mode === "play" ? stage.action : "決定";
  nodes["action-help"].hidden = mode === "play" && stage.action === "スタート";
  if (mode === "ready") nodes["action-hint"].textContent = "スタート";
  nodes.action.setAttribute("aria-label", mode === "play" ? stage.action + "（Aボタン）" : "Aボタン");

  const playing = mode === "play";
  nodes.device.classList.toggle("is-live", playing);
  nodes.left.disabled = !playing || stage.arrows === "—";
  nodes.right.disabled = !playing || stage.arrows === "—";
  nodes.action.disabled = playing && stage.action === "スタート";
  nodes["screen-end"].hidden = mode === "ready" || playing;
  if (mode === "ready") {
    showActions("▶", "ゲームを始める");
  } else if (playing) {
    showActions("Ⅱ", "一時停止");
  } else if (mode === "pause") {
    showActions("▶", "つづける", "はじめから");
    nodes["screen-title"].textContent = "PAUSE";
    nodes["screen-subtitle"].textContent = "一時停止中";
  } else if (mode === "clear") {
    if (nextStage) showActions("▶", "次のゲームへ", "もう一度");
    else showActions("↻", "もう一度");
    nodes["screen-title"].textContent = record.cleared.size === stages.length ? "ALL CLEAR" : "GAME CLEAR";
    nodes["screen-subtitle"].textContent = unlockedStage
      ? format(unlockedStage.id) + " 「" + unlockedStage.title + "」解放！"
      : record.cleared.size === stages.length ? "全100作クリア！" : "クリアおめでとう！";
  } else {
    showActions("↻", "もう一度");
    nodes["screen-title"].textContent = session.outcome === "time" ? "TIME UP" : "GAME OVER";
    nodes["screen-subtitle"].textContent = "目標 " + format(stage.goal) + " ／ 結果 " + format(session.score);
  }
}

function stopFrames() {
  cancelAnimationFrame(frameId);
  frameId = 0;
  previousTime = null;
}

function maybeScroll(element, block) {
  if (!touchLayout.matches) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ block, behavior: reduced ? "auto" : "smooth" });
}

function selectStage(item, jumpToGame = false, showCard = false) {
  if (!item || item.id > unlockedCount(record)) return;
  stopFrames();
  stage = item;
  session = sessionFor(stage);
  mode = "ready";
  unlockedStage = null;
  nextStage = null;
  nodes["game-result"].textContent = "";
  if (showCard) {
    let position = filteredStages().findIndex(candidate => candidate.id === stage.id);
    if (position < 0) {
      filter = "all";
      position = stage.id - 1;
    }
    page = Math.floor(position / pageSize);
  }
  save();
  renderDetails();
  renderHardware();
  renderCatalog();
  if (jumpToGame) maybeScroll(nodes.device.closest(".play-panel"), "start");
}

function startGame() {
  stopFrames();
  session = sessionFor(stage);
  mode = "play";
  lastSignal = 0;
  nodes["game-result"].textContent = "";
  renderDetails();
  renderHardware();
  playTone("start");
  frameId = requestAnimationFrame(frame);
  maybeScroll(nodes.device, "nearest");
}

function pauseGame() {
  if (mode !== "play") return;
  stopFrames();
  mode = "pause";
  renderDetails();
}

function resumeGame() {
  mode = "play";
  renderDetails();
  frameId = requestAnimationFrame(frame);
}

function finishGame() {
  stopFrames();
  const cleared = session.outcome === "clear";
  mode = cleared ? "clear" : "fail";
  if (cleared) {
    unlockedStage = indexed.get(recordClear(record, stage.id));
    nextStage = indexed.get(nextUncleared(record, stage.id));
    save();
    renderProgress();
    renderCatalog();
  }
  renderDetails();
  nodes["game-result"].textContent = nodes["screen-title"].textContent + " " + nodes["screen-subtitle"].textContent;
  playTone(cleared ? "win" : "fail");
}

function displaySignals() {
  renderHardware();
  if (session.outcome) {
    finishGame();
  } else if (session.signal !== lastSignal) {
    lastSignal = session.signal;
    playTone(session.lastSignal);
  }
}

function frame(time) {
  if (mode !== "play") return;
  if (previousTime !== null) updateSession(session, Math.min(.10, (time - previousTime) / 1000));
  previousTime = time;
  displaySignals();
  if (mode === "play") frameId = requestAnimationFrame(frame);
}

function primaryAction() {
  if (mode === "play") pauseGame();
  else if (mode === "pause") resumeGame();
  else if (mode === "clear" && nextStage) {
    selectStage(nextStage, false, true);
  } else startGame();
}

function operate(key) {
  if (mode !== "play") {
    if (key === "action") primaryAction();
    return;
  }
  if (nodes[key].disabled) return;
  inputSession(session, key);
  displaySignals();
}

for (const key of ["left", "right", "action"]) nodes[key].addEventListener("click", () => operate(key));
nodes.primary.addEventListener("click", primaryAction);
nodes.secondary.addEventListener("click", startGame);
nodes.sound.addEventListener("click", () => {
  record.sound = !record.sound;
  save();
  renderSound();
  if (record.sound) playTone("move");
});
nodes["help-open"].addEventListener("click", () => {
  pauseGame();
  nodes.help.showModal();
});
nodes.games.addEventListener("click", event => {
  const card = event.target.closest("[data-stage]");
  const id = Number(card?.dataset.stage);
  if (id && id !== stage.id) selectStage(indexed.get(id), true);
});
for (const button of filterButtons) button.addEventListener("click", () => {
  filter = button.dataset.filter;
  page = 0;
  renderCatalog();
});
nodes["previous-page"].addEventListener("click", () => {
  page -= 1;
  renderCatalog();
});
nodes["next-page"].addEventListener("click", () => {
  page += 1;
  renderCatalog();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGame();
});

const keyboard = { ArrowLeft: "left", ArrowRight: "right", Space: "action" };
const pressedTimers = new Map();
window.addEventListener("keydown", event => {
  if (nodes.help.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "Escape") {
    if (mode === "play") pauseGame();
    else if (mode === "pause") resumeGame();
    return;
  }
  const key = keyboard[event.code];
  if (!key || key !== "action" && mode !== "play") return;
  if (key === "action" && mode !== "play" && event.target.closest?.("button, a")) return;
  event.preventDefault();
  if (event.repeat || nodes[key].disabled) return;
  nodes[key].classList.add("is-pressed");
  clearTimeout(pressedTimers.get(key));
  pressedTimers.set(key, setTimeout(() => nodes[key].classList.remove("is-pressed"), 115));
  operate(key);
});

renderSound();
renderProgress();
renderDetails();
renderHardware();
renderCatalog();
