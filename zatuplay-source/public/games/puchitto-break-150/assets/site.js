"use strict";

const $ = id => document.getElementById(id);
const saveKey = "puchitto-break-150-v1";
const pageSize = 16;
const allIds = new Set(catalog.map(game => game.id));

const initial = BrowserSave.read();
const save = { done: new Set(initial.done), favorites: new Set(initial.favorites), sound: initial.sound };
function writeSave() {
  BrowserSave.write({done: [...save.done], favorites: [...save.favorites], sound: save.sound});
}

const filter = {category: -1, query: "", favorites: false, limit: pageSize};
let current = null;
let playfield = null;
let lobbyScroll = 0;
let returningToCard = null;

function create(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function updateProgress() {
  $("progress").textContent = "クリア " + save.done.size + " / " + catalog.length;
}

function paintSound() {
  const button = $("sound-switch");
  button.setAttribute("aria-pressed", String(save.sound));
  button.textContent = save.sound ? "♪ 音あり" : "♪ 音なし";
}

function favoriteButton() {
  if (!current) return;
  const on = save.favorites.has(current.id);
  const button = $("favorite");
  button.setAttribute("aria-pressed", String(on));
  button.setAttribute("aria-label", on ? "お気に入りから外す" : "お気に入りに追加");
  button.textContent = on ? "♥" : "♡";
}

function searchable(text) {
  return text.normalize("NFKC").toLocaleLowerCase("ja-JP")
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

const categoryButtons = [];
function prepareCategories() {
  for (const [i, label] of ["すべて", ...groups.map(group => group.name)].entries()) {
    const button = create("button", "category", label);
    button.type = "button";
    button.addEventListener("click", () => {
      filter.category = i - 1;
      filter.limit = pageSize;
      renderCatalog();
    });
    categoryButtons.push(button);
    $("categories").append(button);
  }
}

function card(game) {
  const button = create("button", "card");
  button.type = "button";
  button.dataset.game = game.id;
  button.style.setProperty("--game-color", "var(--" + game.color + ")");
  const art = create("span", "card-art");
  art.setAttribute("aria-hidden", "true");
  art.append(create("span", "card-emoji", game.icon));
  if (save.done.has(game.id)) art.append(create("span", "card-finished", "✓"));
  const label = create("span", "card-label", game.title);
  const arrow = create("span", "card-arrow", "↗");
  arrow.setAttribute("aria-hidden", "true");
  label.append(arrow);
  button.append(art, label);
  button.addEventListener("click", () => openGame(game, button));
  return button;
}

function renderCatalog() {
  const query = searchable(filter.query.trim()).split(/\s+/).filter(Boolean);
  const selected = catalog.filter(game => {
    if (filter.category >= 0 && game.category !== filter.category) return false;
    if (filter.favorites && !save.favorites.has(game.id)) return false;
    if (!query.length) return true;
    const content = searchable(game.title + " " + game.help + " " + groups[game.category].name);
    return query.every(term => content.includes(term));
  });
  categoryButtons.forEach((el, i) => el.setAttribute("aria-pressed", String(filter.category === i - 1)));
  $("favorites").setAttribute("aria-pressed", String(filter.favorites));
  $("count").textContent = selected.length + " 種類";
  $("cards").replaceChildren(...selected.slice(0, filter.limit).map(card));
  if (!selected.length) {
    $("cards").append(create("p", "empty", filter.favorites && !save.favorites.size
      ? "ゲーム画面の「♡」から、お気に入りを登録できるよ。"
      : "見つからなかったよ。キーワードやジャンルを変えて探してみよう。"));
  }
  $("more").hidden = selected.length <= filter.limit;
}

function mountGame(game) {
  playfield?.dispose();
  playfield = new Playfield($("surface"), $("game-controls"), $("game-status"), $("game-meter"), game, () => {
    save.done.add(game.id);
    writeSave();
    updateProgress();
  });
}

function showGame(game) {
  current = game;
  $("lobby").hidden = true;
  $("play").hidden = false;
  $("game-title").textContent = game.title;
  $("game-help").textContent = game.help;
  $("genre").textContent = groups[game.category].name + "　" + game.id + " / " + catalog.length;
  document.title = game.title + " | ぷちっと休憩";
  favoriteButton();
  mountGame(game);
  window.scrollTo(0, 0);
  $("game-title").focus({preventScroll: true});
}

function showLobby(scrollBack) {
  current = null;
  playfield?.dispose();
  playfield = null;
  $("lobby").hidden = false;
  $("play").hidden = true;
  document.title = "ぷちっと休憩";
  renderCatalog();
  window.scrollTo(0, scrollBack ? lobbyScroll : 0);
  if (scrollBack && returningToCard) {
    $("cards").querySelector('[data-game="' + returningToCard + '"]')?.focus({preventScroll: true});
  }
}

function openGame(game, source) {
  effects.unlock();
  const editing = Boolean(current);
  if (!editing) {
    lobbyScroll = window.scrollY;
    returningToCard = source?.dataset.game ?? null;
  }
  const hash = "#play-" + game.id;
  if (editing) window.history.replaceState(history.state, "", hash);
  else window.history.pushState({fromLobby: true}, "", hash);
  showGame(game);
}

function leave() {
  if (!current) { window.scrollTo(0, 0); return; }
  if (history.state?.fromLobby) history.back();
  else {
    history.replaceState(null, "", "#");
    showLobby(false);
  }
}

function fromLocation() {
  const match = /^#play-(\d+)$/.exec(location.hash);
  const game = match ? catalog[Number(match[1]) - 1] : null;
  if (game) {
    if (game !== current) showGame(game);
  } else if (current || !$("play").hidden) {
    showLobby(true);
  }
}

prepareCategories();
renderCatalog();
updateProgress();
paintSound();
effects.enabled = save.sound;
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

$("featured").addEventListener("click", () => openGame(catalog[0]));
$("random").addEventListener("click", () => {
  const fresh = catalog.filter(game => !save.done.has(game.id));
  const options = fresh.length ? fresh : catalog;
  openGame(options[Math.floor(Math.random() * options.length)]);
});
$("sound-switch").addEventListener("click", () => {
  save.sound = !save.sound;
  effects.set(save.sound);
  playfield?.scene.soundChange?.(save.sound);
  writeSave();
  paintSound();
});
$("search").addEventListener("input", event => {
  filter.query = event.target.value;
  filter.limit = pageSize;
  renderCatalog();
});
$("favorites").addEventListener("click", () => {
  filter.favorites = !filter.favorites;
  filter.limit = pageSize;
  renderCatalog();
});
$("more").addEventListener("click", () => {
  filter.limit += pageSize;
  renderCatalog();
});
$("favorite").addEventListener("click", () => {
  if (!current) return;
  if (save.favorites.has(current.id)) save.favorites.delete(current.id);
  else save.favorites.add(current.id);
  writeSave();
  favoriteButton();
});
$("back").addEventListener("click", leave);
$("brand").addEventListener("click", event => {
  event.preventDefault();
  leave();
});
$("restart").addEventListener("click", () => {
  if (current) mountGame(current);
});
$("next").addEventListener("click", () => {
  if (current) openGame(catalog[current.id % catalog.length]);
});

window.addEventListener("popstate", fromLocation);
window.addEventListener("hashchange", fromLocation);
fromLocation();
