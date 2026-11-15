import { WIDTH, HEIGHT, categories, designs } from "./catalog.js";
import { drawArt } from "./art.js";
import { COLUMNS, ROWS, decodeMask, encodeMask, hasCell, trace, mergeMasks, score, restoreScratch, erase } from "./scratch.js";

const element = (id) => document.getElementById(id);
const refs = Object.fromEntries([
  "studio", "gallery", "studio-intro", "gallery-intro", "studio-link", "gallery-link",
  "drawing", "art", "scratch", "brush-cursor", "draw-hint", "work-number", "work-title",
  "work-genre", "reset", "reset-label", "progress", "progress-value", "finish", "finish-status",
  "show-art", "next-art", "search", "category", "stage-list", "filter-empty", "pagination",
  "previous-page", "next-page", "range", "gallery-empty", "gallery-list", "gallery-pages",
  "gallery-prev", "gallery-next", "gallery-range", "nav-count", "completed-count",
  "save-problem", "announcement", "artwork-dialog", "dialog-image", "dialog-label",
  "dialog-title", "dialog-date", "reset-dialog", "confirm-reset", "download"
].map((id) => [id, element(id)]));

const PREFIX = "kirameki-scratch:v1:";
const LAST_DESIGN = PREFIX + "last-design";
const PAGE_SIZE = 6;
const GALLERY_PAGE_SIZE = 16;
const records = new Map();
const failedSaves = new Set();
const targetSample = document.createElement("canvas");
targetSample.width = COLUMNS;
targetSample.height = ROWS;
const targetContext = targetSample.getContext("2d", { willReadFrequently: true });
const scratchContext = refs.scratch.getContext("2d");
const noRecord = Object.freeze({ doneAt: 0, round: 0 });
const dateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const starterMarks = [
  [173, 225, 239, 147, 20],
  [185, 261, 280, 156, 28],
  [199, 296, 326, 173, 32],
  [241, 312, 343, 215, 24],
  [286, 313, 362, 247, 15],
  [543, 437, 593, 376, 18],
  [567, 461, 620, 406, 17]
].map(([x, y, endX, endY, radius]) => ({
  start: { x, y }, end: { x: endX, y: endY }, radius
}));
const starterMask = decodeMask();
for (const mark of starterMarks) trace(starterMask, mark.start, mark.end, mark.radius);

let selected;
let bytes;
let targets;
let round;
let progress = 0;
let done = false;
let dirty = false;
let touched = false;
let radius = 37;
let pointer = null;
let position = { x: WIDTH / 2, y: HEIGHT / 2 };
let saveTimer;
let page = 0;
let galleryPage = 0;
let filterResult = designs;

function readRecord(raw) {
  if (!raw) return undefined;
  try {
    const state = JSON.parse(raw);
    if (!state || !Number.isSafeInteger(state.round)) return undefined;
    const doneAt = Number.isSafeInteger(state.doneAt) && state.doneAt > 0 ? state.doneAt : 0;
    const record = { doneAt, round: state.round };
    if (typeof state.mask === "string") record.mask = state.mask;
    if (Number.isFinite(state.percent)) record.percent = Math.min(99, Math.max(0, state.percent));
    return record;
  } catch {
    return undefined;
  }
}

function loadRecords() {
  try {
    for (const design of designs) {
      const record = readRecord(localStorage.getItem(PREFIX + design.id));
      if (record) records.set(design.id, record);
    }
    return designs[Number(localStorage.getItem(LAST_DESIGN)) - 1] ?? designs[0];
  } catch {
    return designs[0];
  }
}

function latestRecord(id) {
  if (failedSaves.has(id)) return records.get(id) ?? noRecord;
  try {
    return readRecord(localStorage.getItem(PREFIX + id)) ?? records.get(id) ?? noRecord;
  } catch {
    return records.get(id) ?? noRecord;
  }
}

function saveRecord(id, record) {
  records.set(id, record);
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(record));
    failedSaves.delete(id);
  } catch {
    failedSaves.add(id);
  }
  refs["save-problem"].hidden = failedSaves.size === 0;
}

function sampleTargets(design) {
  drawArt(targetSample, design, "target");
  const data = targetContext.getImageData(0, 0, COLUMNS, ROWS).data;
  const cells = [];
  for (let i = 0; i < COLUMNS * ROWS; i++) {
    const alreadyRevealed = design.id === 1 && hasCell(starterMask, i);
    if (data[i * 4 + 3] > 19 && !alreadyRevealed) cells.push(i);
  }
  return cells;
}

function renderScratch() {
  drawArt(refs.scratch, selected, "guide");
  if (selected.id === 1) {
    for (const mark of starterMarks) erase(scratchContext, mark.start, mark.end, mark.radius);
  }
  restoreScratch(scratchContext, bytes);
}

function updateProgress() {
  refs.progress.value = progress;
  refs["progress-value"].textContent = progress + "%";
  refs["draw-hint"].hidden = touched || done;
  refs.drawing.classList.toggle("is-done", done);
  refs.finish.hidden = !done;
  refs["reset-label"].textContent = done ? "もう一度こする" : "やり直す";
  refs.reset.disabled = !touched && !done;
  if (done) {
    refs["brush-cursor"].hidden = true;
    refs["finish-status"].textContent = failedSaves.has(selected.id)
      ? "この画面から画像を保存できます。"
      : "ギャラリーに保存しました。";
  }
}

function getNextDesign() {
  const later = designs.slice(selected.id);
  const earlier = designs.slice(0, selected.id - 1);
  return [...later, ...earlier].find((design) => !records.get(design.id)?.doneAt);
}

function refreshCounters() {
  const total = [...records.values()].filter((record) => record.doneAt).length;
  refs["completed-count"].textContent = total;
  refs["nav-count"].textContent = total;
  refs["next-art"].disabled = !getNextDesign();
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(flush, 210);
}

function flush() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  if (!dirty || !selected) return;

  dirty = false;
  const id = selected.id;
  const latest = latestRecord(id);
  const wasDone = done;
  if (latest.round !== round || (latest.doneAt && latest.mask === undefined && !done)) {
    records.set(id, latest);
    openDesign(selected);
    return;
  }
  const merged = mergeMasks(bytes, latest.mask);
  progress = score(bytes, targets);
  done = progress === 100;

  const record = { round, doneAt: latest.doneAt };
  if (done) {
    record.doneAt = Date.now();
  } else {
    record.mask = encodeMask(bytes);
    record.percent = progress;
  }
  saveRecord(id, record);

  if (merged && !done) renderScratch();
  updateProgress();
  if (done && !wasDone) refs.announcement.textContent = selected.name + "が完成しました。";
  refreshCounters();
  updateCards();
}

function openDesign(design, remember = false) {
  flush();
  pointer = null;
  refs["brush-cursor"].hidden = true;
  selected = design;
  const state = records.get(design.id) ?? noRecord;
  bytes = decodeMask(state.mask);
  round = state.round;
  done = Boolean(state.doneAt && state.mask === undefined);
  touched = done || Boolean(state.mask);
  targets = sampleTargets(design);
  progress = done ? 100 : score(bytes, targets);
  position = { x: WIDTH / 2, y: HEIGHT / 2 };
  drawArt(refs.art, design);
  renderScratch();
  refs["work-number"].textContent = "#" + design.number;
  refs["work-title"].textContent = design.name;
  refs["work-genre"].textContent = design.category.name;
  refs.drawing.setAttribute("aria-label", design.name + "のスクラッチシート");
  updateProgress();
  updateCards();
  refreshCounters();
  if (remember) {
    try {
      localStorage.setItem(LAST_DESIGN, String(design.id));
    } catch {
      // Drawing and viewing remain available for this session.
    }
  }
}

function scrape(from, to) {
  if (done) return;
  erase(scratchContext, from, to, radius);
  if (trace(bytes, from, to, radius)) {
    touched = true;
    dirty = true;
    progress = score(bytes, targets);
    if (progress === 100) {
      flush();
    } else {
      updateProgress();
      scheduleSave();
    }
  }
}

function clamp(value, limit) {
  return Math.max(0, Math.min(limit, value));
}

function eventPosition(event) {
  const box = refs.drawing.getBoundingClientRect();
  return {
    x: clamp((event.clientX - box.left) / box.width * WIDTH, WIDTH),
    y: clamp((event.clientY - box.top) / box.height * HEIGHT, HEIGHT)
  };
}

function showCursor(point) {
  const cursor = refs["brush-cursor"];
  cursor.hidden = done;
  cursor.style.left = (point.x / WIDTH * 100) + "%";
  cursor.style.top = (point.y / HEIGHT * 100) + "%";
  cursor.style.setProperty("--brush-preview", (radius * 2 / WIDTH * 100) + "%");
}

refs.drawing.addEventListener("pointerdown", (event) => {
  if (pointer !== null || event.button !== 0 || done) return;
  event.preventDefault();
  pointer = event.pointerId;
  refs.drawing.setPointerCapture(pointer);
  position = eventPosition(event);
  if (event.pointerType !== "touch") showCursor(position);
  scrape(position, position);
});

refs.drawing.addEventListener("pointermove", (event) => {
  if (done) return;
  if (pointer === null) {
    if (event.pointerType !== "touch") showCursor(eventPosition(event));
    return;
  }
  if (event.pointerId !== pointer) return;
  const collected = event.getCoalescedEvents?.();
  const points = collected?.length ? collected : [event];
  for (const sample of points) {
    const next = eventPosition(sample);
    scrape(position, next);
    position = next;
  }
  if (event.pointerType !== "touch") showCursor(position);
});

function endStroke(event) {
  if (event.pointerId !== pointer) return;
  if (event.type === "pointerup") {
    const end = eventPosition(event);
    scrape(position, end);
    position = end;
  }
  pointer = null;
  if (event.pointerType === "touch") refs["brush-cursor"].hidden = true;
  flush();
}

for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
  refs.drawing.addEventListener(event, endStroke);
}
refs.drawing.addEventListener("pointerleave", () => {
  if (pointer === null) refs["brush-cursor"].hidden = true;
});
refs.drawing.addEventListener("focus", () => showCursor(position));
refs.drawing.addEventListener("blur", () => {
  if (pointer === null) refs["brush-cursor"].hidden = true;
});

const directions = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
refs.drawing.addEventListener("keydown", (event) => {
  if (done) return;
  if (event.code === "Space" || event.key === "Enter") {
    event.preventDefault();
    scrape(position, position);
    showCursor(position);
    return;
  }
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  const next = {
    x: clamp(position.x + direction[0] * radius * 0.75, WIDTH),
    y: clamp(position.y + direction[1] * radius * 0.75, HEIGHT)
  };
  if (event.shiftKey) scrape(position, next);
  position = next;
  showCursor(position);
});

document.querySelectorAll('input[name="brush"]').forEach((tool) => {
  tool.addEventListener("change", () => {
    radius = Number(tool.value);
  });
});

function makeIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#i-" + name);
  svg.setAttribute("aria-hidden", "true");
  svg.append(use);
  return svg;
}

function createCard(design, inGallery) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "stage-card";
  card.dataset.design = design.id;
  card.setAttribute("aria-label", design.number + " " + design.name);
  if (!inGallery) card.setAttribute("aria-pressed", String(design.id === selected.id));

  const thumb = document.createElement("canvas");
  thumb.width = 288;
  thumb.height = 192;
  thumb.setAttribute("aria-hidden", "true");
  drawArt(thumb, design);
  const label = document.createElement("span");
  label.className = "card-line";
  const number = document.createElement("span");
  number.className = "card-number";
  number.textContent = "#" + design.number;
  const name = document.createElement("span");
  name.className = "card-name";
  name.textContent = design.name;
  name.title = design.name;
  label.append(number, name);
  card.append(thumb, label);

  if (inGallery) {
    card.addEventListener("click", () => viewArtwork(design));
  } else {
    const badge = document.createElement("span");
    badge.className = "card-badge";
    badge.hidden = true;
    card.append(badge);
    card.addEventListener("click", () => {
      openDesign(design, true);
      if (matchMedia("(max-width: 730px)").matches) {
        refs["work-title"].scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "center" });
      }
    });
  }
  return card;
}

function formatRange(start, end, length) {
  return (start + 1) + "–" + end + " / " + length;
}

function updateCards() {
  for (const button of refs["stage-list"].children) {
    const id = Number(button.dataset.design);
    const design = designs[id - 1];
    const record = records.get(id);
    const badge = button.querySelector(".card-badge");
    button.setAttribute("aria-pressed", String(id === selected.id));
    badge.hidden = !record?.doneAt && !record?.mask;
    badge.classList.toggle("is-complete", Boolean(record?.doneAt));
    if (record?.doneAt) {
      badge.replaceChildren(makeIcon("check"));
      button.setAttribute("aria-label", design.number + " " + design.name + "、完成済み");
    } else {
      badge.textContent = (record?.percent ?? 0) + "%";
      const status = record?.mask ? "、途中 " + (record.percent ?? 0) + "パーセント" : "";
      button.setAttribute("aria-label", design.number + " " + design.name + status);
    }
  }
}

function renderStageList() {
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, filterResult.length);
  refs["stage-list"].replaceChildren(...filterResult.slice(start, end).map((design) => createCard(design, false)));
  refs["filter-empty"].hidden = filterResult.length !== 0;
  refs.pagination.hidden = filterResult.length === 0;
  refs["previous-page"].disabled = page === 0;
  refs["next-page"].disabled = end === filterResult.length;
  refs.range.textContent = formatRange(start, end, filterResult.length);
  updateCards();
}

function setFilter() {
  const category = refs.category.value;
  const query = refs.search.value.normalize("NFKC").trim().toLowerCase();
  const numeric = /^#?[0-9]+$/.test(query);
  filterResult = designs.filter((design) => {
    if (category && design.category.id !== category) return false;
    if (!query) return true;
    if (numeric) return design.id === Number(query.replace(/^#/, ""));
    return (design.name + " " + design.category.name).normalize("NFKC").toLowerCase().includes(query);
  });
  page = 0;
  renderStageList();
}

function renderGallery() {
  const complete = designs.filter((design) => records.get(design.id)?.doneAt);
  complete.sort((a, b) => records.get(b.id).doneAt - records.get(a.id).doneAt || a.id - b.id);
  galleryPage = Math.min(galleryPage, Math.max(0, Math.ceil(complete.length / GALLERY_PAGE_SIZE) - 1));
  const start = galleryPage * GALLERY_PAGE_SIZE;
  const end = Math.min(start + GALLERY_PAGE_SIZE, complete.length);
  refs["gallery-empty"].hidden = complete.length > 0;
  refs["gallery-list"].replaceChildren(...complete.slice(start, end).map((design) => createCard(design, true)));
  refs["gallery-pages"].hidden = complete.length <= GALLERY_PAGE_SIZE;
  refs["gallery-prev"].disabled = galleryPage === 0;
  refs["gallery-next"].disabled = end === complete.length;
  refs["gallery-range"].textContent = formatRange(start, end, complete.length);
}

function route() {
  flush();
  const inGallery = location.hash === "#gallery";
  refs.studio.hidden = inGallery;
  refs["studio-intro"].hidden = inGallery;
  refs.gallery.hidden = !inGallery;
  refs["gallery-intro"].hidden = !inGallery;
  refs["studio-link"].toggleAttribute("aria-current", !inGallery);
  refs["gallery-link"].toggleAttribute("aria-current", inGallery);
  refs[inGallery ? "gallery-link" : "studio-link"].setAttribute("aria-current", "page");
  if (inGallery) renderGallery();
}

function viewArtwork(design) {
  const state = records.get(design.id);
  if (!state?.doneAt) return;
  refs["dialog-label"].textContent = "#" + design.number + "  " + design.category.name;
  refs["dialog-title"].textContent = design.name;
  refs["dialog-date"].textContent = dateFormat.format(state.doneAt) + " 完成";
  refs["dialog-image"].setAttribute("aria-label", design.name + "の完成したスクラッチアート");
  drawArt(refs["dialog-image"], design);
  refs.download.href = refs["dialog-image"].toDataURL("image/png");
  refs.download.download = "きらめきスクラッチ_" + design.number + "_" + design.name + ".png";
  refs["artwork-dialog"].showModal();
}

refs.reset.addEventListener("click", () => {
  flush();
  refs["reset-dialog"].showModal();
});
refs["confirm-reset"].addEventListener("click", () => {
  const latest = latestRecord(selected.id);
  const record = { round: Math.max(Date.now(), latest.round + 1), doneAt: latest.doneAt };
  record.mask = "";
  saveRecord(selected.id, record);
  refs["reset-dialog"].close();
  openDesign(selected);
});

refs["show-art"].addEventListener("click", () => viewArtwork(selected));
refs["next-art"].addEventListener("click", () => {
  const next = getNextDesign();
  if (!next) return;
  openDesign(next, true);
  if (!filterResult.includes(next)) {
    refs.search.value = "";
    refs.category.value = "";
    setFilter();
  }
  page = Math.floor(filterResult.indexOf(next) / PAGE_SIZE);
  renderStageList();
  refs.drawing.focus({ preventScroll: true });
});
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

refs.search.addEventListener("input", setFilter);
refs.category.addEventListener("change", setFilter);
refs["previous-page"].addEventListener("click", () => {
  page--;
  renderStageList();
});
refs["next-page"].addEventListener("click", () => {
  page++;
  renderStageList();
});
refs["gallery-prev"].addEventListener("click", () => {
  galleryPage--;
  renderGallery();
});
refs["gallery-next"].addEventListener("click", () => {
  galleryPage++;
  renderGallery();
});

window.addEventListener("hashchange", () => {
  route();
  window.scrollTo(0, 0);
});
window.addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});
window.addEventListener("storage", (event) => {
  if (!event.key?.startsWith(PREFIX) || event.key === LAST_DESIGN) return;
  const id = Number(event.key.slice(PREFIX.length));
  if (!designs[id - 1]) return;
  const record = readRecord(event.newValue);
  if (record) {
    records.set(id, record);
  } else {
    records.delete(id);
  }
  if (selected.id === id && pointer === null && !dirty) openDesign(selected);
  refreshCounters();
  updateCards();
  if (!refs.gallery.hidden) renderGallery();
});

for (const category of categories) {
  refs.category.append(new Option(category.name + " · 50", category.id));
}
const last = loadRecords();
openDesign(last);
page = Math.floor((last.id - 1) / PAGE_SIZE);
renderStageList();
route();
