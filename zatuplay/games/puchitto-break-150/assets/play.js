"use strict";

const W = 720;
const H = 420;
const palettes = {
  lilac: ["#ece4f6", "#baa0de", "#7c51b0", "#5e3d83"],
  peach: ["#f8e8dd", "#ecb294", "#ad5f4d", "#794737"],
  mint: ["#e2f1e8", "#91c6ae", "#417d66", "#315e4f"],
  rose: ["#f7e5eb", "#e8a3bc", "#ab5379", "#7d3a59"],
  sky: ["#e4eff7", "#9dc5e4", "#467ba8", "#345b7b"],
  butter: ["#f7eed8", "#e4c77b", "#a07631", "#715321"]
};
const paints = ["#bd95de", "#efa590", "#81c9b3", "#efce78", "#9cc8ed", "#e49fba"];
const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const lerp = (a, b, t) => a + (b - a) * t;
const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function shuffle(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function round(ctx, x, y, w, h, r, fill, stroke, line = 1) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function circle(ctx, x, y, r, color, line, width = 1) {
  if (r <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (color) {
    ctx.fillStyle = color;
    ctx.fill();
  }
  if (line) {
    ctx.strokeStyle = line;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function word(ctx, message, x, y, size = 24, color = "#342a40", weight = 700, align = "center") {
  ctx.font = weight + " " + size + "px sans-serif";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(message, x, y);
}

function glyph(ctx, icon, x, y, size = 55) {
  ctx.font = size + 'px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#513c67";
  ctx.fillText(icon, x, y + size * 0.045);
}

function line(ctx, points, color, width, dashed = false) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  if (dashed) ctx.setLineDash([7, 12]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const pt of points.slice(1)) ctx.lineTo(pt.x, pt.y);
  ctx.stroke();
  ctx.restore();
}

function marble(ctx, x, y, r, color, soft = false) {
  const light = ctx.createRadialGradient(x - r * .34, y - r * .43, r * .08, x, y, r);
  light.addColorStop(0, "#ffffff");
  light.addColorStop(.26, soft ? "#fff9" : "#fff7");
  light.addColorStop(1, color);
  circle(ctx, x, y + r * .12, r, "#41285023");
  circle(ctx, x, y, r, color, "#fff9", 1.5);
  circle(ctx, x, y, r - 1, light);
}

function slab(ctx, x = 88, y = 82, w = 544, h = 262, fill = "#fffc", stroke = "#fff") {
  ctx.save();
  ctx.shadowColor = "#3d234c27";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  round(ctx, x, y, w, h, 25, fill, stroke, 2);
  ctx.restore();
}

function chip(ctx, label, x, y, color, selected = false, width = 110) {
  round(ctx, x - width / 2, y - 22, width, 44, 16, selected ? color : "#fffdf7", color, 2);
  word(ctx, label, x, y, label.length > 10 ? 16 : 20, selected ? "#fff" : "#392b46", 740);
}

function within(p, x, y, width, height) {
  return Math.abs(p.x - x) <= width / 2 && Math.abs(p.y - y) <= height / 2;
}

function sketchGrid(cols, rows, x = 126, y = 80, width = 468, height = 260) {
  const dx = width / cols;
  const dy = height / rows;
  return Array.from({length: cols * rows}, (_, k) => ({
    x: x + ((k % cols) + .5) * dx, y: y + (Math.floor(k / cols) + .5) * dy, dx, dy
  }));
}

function choices(n, y = 300, left = 123, right = 597) {
  return Array.from({length: n}, (_, i) => ({
    x: n === 1 ? W / 2 : lerp(left, right, i / (n - 1)), y
  }));
}

function sample(from, to, every = 13) {
  const steps = Math.max(1, Math.ceil(length(from, to) / every));
  return Array.from({length: steps}, (_, i) => ({
    x: lerp(from.x, to.x, (i + 1) / steps), y: lerp(from.y, to.y, (i + 1) / steps)
  }));
}

const effects = {
  enabled: true,
  ctx: null,
  ambient: [],
  unlock() {
    if (!this.enabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.ctx ??= new Audio();
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch { /* Audio is optional on embedded browsers. */ }
  },
  noiseBuffer() {
    if (this.noise) return this.noise;
    const c = this.ctx;
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const values = this.noise.getChannelData(0);
    for (let i = 0; i < values.length; i++) values[i] = Math.random() * 2 - 1;
    return this.noise;
  },
  tone(freq = 500, span = .15, gain = .09, delay = 0, shape = "sine", tail = freq * .78) {
    const c = this.ctx;
    if (!this.enabled || !c || c.state === "closed") return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, tail), t + span);
    amp.gain.setValueAtTime(.001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + .014);
    amp.gain.exponentialRampToValueAtTime(.001, t + span);
    osc.connect(amp).connect(c.destination);
    osc.start(t);
    osc.stop(t + span + .02);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  },
  rustle(freq = 1300, span = .13, gain = .10, delay = 0) {
    const c = this.ctx;
    if (!this.enabled || !c) return;
    const t = c.currentTime + delay;
    const noise = c.createBufferSource();
    noise.buffer = this.noiseBuffer();
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    const amp = c.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(.001, t + span);
    noise.connect(filter).connect(amp).connect(c.destination);
    noise.start(t, Math.random() * .9);
    noise.stop(t + span + .01);
  },
  hit(style, index = 0) {
    if (["bubble", "popit", "pillow", "soap", "jelly", "drop"].includes(style)) {
      this.tone(330 + index % 6 * 44, .10, .095, 0, "triangle", 115);
      this.rustle(1050, .075, .09);
    } else if (["sticker", "tissue", "film", "perforation", "tape", "rain", "bag", "cloth", "scratch"].includes(style)) {
      this.rustle(820 + index % 4 * 500, .23, .12);
    } else if (["notes", "chime", "clock", "coins", "ice", "telephone"].includes(style)) {
      const freq = [392, 494, 587, 698][index % 4];
      this.tone(freq, .29, .09, 0, "sine", freq);
      this.tone(freq * 2.03, .17, .035, 0, "sine", freq * 2);
    } else {
      this.tone(550 + (index % 5) * 60, .12, .055, 0, "triangle");
      this.rustle(1900, .082, .06);
    }
  },
  complete() {
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, .26, .04, .07 * i, "sine", f));
  },
  stopAmbient() {
    for (const layer of this.ambient) {
      try {
        layer.source.stop();
        layer.source.disconnect();
        layer.filter.disconnect();
        layer.amp.disconnect();
      } catch { /* An already ended layer can be discarded. */ }
    }
    this.ambient = [];
  },
  mix(style, volumes) {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx;
    if (!this.ambient.length) {
      const freqs = style === "rain" ? [270, 1080, 2450] : [480, 1430, 2670];
      for (const freq of freqs) {
        const source = c.createBufferSource();
        source.buffer = this.noiseBuffer();
        source.loop = true;
        const filter = c.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = freq;
        filter.Q.value = style === "rain" ? .3 : .7;
        const amp = c.createGain();
        amp.gain.value = 0;
        source.connect(filter).connect(amp).connect(c.destination);
        source.start(0, Math.random());
        this.ambient.push({source, filter, amp});
      }
    }
    this.ambient.forEach(({amp}, i) => amp.gain.setTargetAtTime((volumes[i] ?? 0) * .13, c.currentTime, .09));
  },
  set(enabled) {
    this.enabled = enabled;
    if (enabled) this.unlock();
    else { this.stopAmbient(); narration.stop(); }
  }
};

// Browser-provided Japanese synthesis; only fixed game text, no microphone.
const narration = {
  token: 0,
  utterance: null,
  stop() {
    this.token++;
    this.utterance = null;
    try { globalThis.speechSynthesis?.cancel(); } catch { /* optional API */ }
  },
  speak(text, fallback) {
    this.stop();
    if (!effects.enabled) { fallback("音OFF："); return; }
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) {
      fallback("読み上げ非対応："); return;
    }
    const token = this.token;
    try {
      const u = new SpeechSynthesisUtterance(text);
      this.utterance = u;
      u.lang = "ja-JP"; u.rate = .85; u.volume = .8;
      const voice = speechSynthesis.getVoices().find(v => /^ja(?:-|$)/i.test(v.lang));
      if (voice) u.voice = voice;
      u.onerror = () => { if (token === this.token) { this.utterance = null; fallback("読み上げできません："); } };
      u.onend = () => { if (token === this.token) this.utterance = null; };
      speechSynthesis.speak(u);
    } catch { if (token === this.token) fallback("読み上げできません："); }
  }
};
globalThis.addEventListener?.("pagehide", () => narration.stop());

class Playfield {
  constructor(canvas, controls, status, meter, game, onClear) {
    this.canvas = canvas;
    this.controls = controls;
    this.status = status;
    this.meter = meter;
    this.game = game;
    this.onClear = onClear;
    this.ctx = canvas.getContext("2d");
    this.colors = palettes[game.color];
    this.now = 0;
    this.finished = false;
    this.bits = [];
    this.drag = null;
    this.pointerId = null;
    this.dirty = true;
    this.abort = new AbortController();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.setAttribute("aria-label", game.title + "のゲーム画面");
    controls.replaceChildren();
    status.removeAttribute("data-kind");
    this.say("好きなペースで遊ぼう。", 0);
    this.scene = scenes[game.kind](this, game.config);
    this.attach();
    this.last = performance.now();
    this.frame = requestAnimationFrame(t => this.tick(t));
  }
  attach() {
    const {signal} = this.abort;
    const point = ev => {
      const box = this.canvas.getBoundingClientRect();
      return {
        x: clamp((ev.clientX - box.left) / box.width) * W,
        y: clamp((ev.clientY - box.top) / box.height) * H
      };
    };
    this.canvas.addEventListener("pointerdown", ev => {
      if (this.finished || this.pointerId !== null || ev.button !== 0) return;
      ev.preventDefault();
      effects.unlock();
      const p = point(ev);
      this.drag = p;
      this.pointerId = ev.pointerId;
      this.canvas.setPointerCapture(ev.pointerId);
      this.scene.down?.(p);
      this.dirty = true;
    }, {signal});
    this.canvas.addEventListener("pointermove", ev => {
      if (this.pointerId !== ev.pointerId || this.finished) return;
      const p = point(ev);
      this.scene.move?.(p, this.drag);
      this.drag = p;
      this.dirty = true;
    }, {signal});
    const stop = (ev, cancelled) => {
      if (this.pointerId !== ev.pointerId) return;
      this.pointerId = null;
      const p = cancelled ? this.drag : point(ev);
      this.drag = null;
      if (!this.finished) {
        if (cancelled) this.scene.cancel?.();
        else this.scene.up?.(p);
      }
      this.dirty = true;
    };
    this.canvas.addEventListener("pointerup", ev => stop(ev, false), {signal});
    this.canvas.addEventListener("pointercancel", ev => stop(ev, true), {signal});
    this.canvas.addEventListener("keydown", ev => {
      if (this.finished || !this.scene.key) return;
      const acceptable = [" ", "Enter", "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"];
      if (!acceptable.includes(ev.key)) return;
      ev.preventDefault();
      effects.unlock();
      this.scene.key(ev.key);
      this.dirty = true;
    }, {signal});
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        narration.stop();
        effects.stopAmbient();
        this.scene.suspend?.();
      }
    }, {signal});
  }
  button(label, action, emphasis = false) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = emphasis ? "secondary" : "outline";
    el.textContent = label;
    el.addEventListener("click", () => {
      if (this.finished && !el.dataset.afterClear) return;
      effects.unlock();
      action();
      this.dirty = true;
    });
    this.controls.append(el);
    return el;
  }
  range(name, value, change) {
    const label = document.createElement("label");
    label.className = "range-control";
    const input = document.createElement("input");
    input.type = "range";
    input.min = 0;
    input.max = 100;
    input.value = Math.round(value * 100);
    label.append(name, input);
    input.addEventListener("input", () => {
      if (this.finished) return;
      effects.unlock();
      change(Number(input.value) / 100);
      this.dirty = true;
    });
    this.controls.append(label);
    return input;
  }
  hold(label, start, stop, cancel) {
    const el = this.button(label, () => {});
    el.dataset.hold = "";
    const begin = ev => {
      ev.preventDefault();
      if (this.finished || ev.repeat) return;
      effects.unlock();
      start();
      this.dirty = true;
    };
    const end = ev => {
      ev.preventDefault();
      if (this.finished) return;
      stop();
      this.dirty = true;
    };
    el.addEventListener("pointerdown", ev => {
      if (ev.button !== 0) return;
      el.setPointerCapture(ev.pointerId);
      begin(ev);
    });
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", () => cancel());
    el.addEventListener("keydown", ev => {
      if (ev.key === " " || ev.key === "Enter") begin(ev);
    });
    el.addEventListener("keyup", ev => {
      if (ev.key === " " || ev.key === "Enter") end(ev);
    });
    el.addEventListener("blur", cancel);
  }
  say(message, fraction) {
    if (this.finished) return;
    if (this.status.textContent !== message) this.status.textContent = message;
    if (fraction !== undefined) this.meter.style.width = Math.round(clamp(fraction) * 100) + "%";
  }
  sparkle(x, y, count = 8) {
    if (reduceMotion) count = Math.min(3, count);
    for (let i = 0; i < count; i++) {
      this.bits.push({
        x, y, vx: (Math.random() - .5) * 170, vy: -40 - Math.random() * 140,
        t: .38 + Math.random() * .42, color: paints[i % paints.length], r: 2 + Math.random() * 4
      });
    }
    this.dirty = true;
  }
  clear(message = "できあがり！") {
    if (this.finished) return;
    this.finished = true;
    this.scene?.finish?.();
    this.status.textContent = message;
    this.status.dataset.kind = "clear";
    this.meter.style.width = "100%";
    for (const el of this.controls.querySelectorAll("button,input")) {
      if (!el.dataset.afterClear) el.disabled = true;
    }
    this.sparkle(W / 2, H / 2, 26);
    effects.complete();
    this.onClear();
  }
  tick(time) {
    const dt = clamp((time - this.last) / 1000, 0, .065);
    this.last = time;
    if (!document.hidden) {
      this.now += dt;
      this.scene.update?.(dt);
      if (this.dirty || this.bits.length || (this.scene.motion && !this.finished)) {
        this.draw(dt);
      }
    }
    this.frame = requestAnimationFrame(t => this.tick(t));
  }
  draw(dt) {
    const c = this.ctx;
    this.dirty = false;
    const horizon = c.createLinearGradient(0, 0, W * .65, H);
    horizon.addColorStop(0, this.colors[0]);
    horizon.addColorStop(1, "#fff9ef");
    c.fillStyle = horizon;
    c.fillRect(0, 0, W, H);
    circle(c, 74, 395, 154, "#fff5");
    circle(c, 661, 54, 134, "#ffffff58");
    for (let i = 0; i < 6; i++) circle(c, 36 + i * 18, 33, 2.5, this.colors[1]);
    this.scene.draw(c);
    for (const bit of this.bits) {
      if (bit.t <= 0) continue;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.vy += 185 * dt;
      bit.t -= dt;
      c.globalAlpha = clamp(bit.t * 2);
      circle(c, bit.x, bit.y, bit.r, bit.color);
    }
    c.globalAlpha = 1;
    if (this.bits.length) this.dirty = true;
    this.bits = this.bits.filter(bit => bit.t > 0);
  }
  dispose() {
    narration.stop();
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.scene.dispose?.();
    if (this.pointerId !== null && this.canvas.hasPointerCapture(this.pointerId)) {
      this.canvas.releasePointerCapture(this.pointerId);
    }
    this.pointerId = null;
    effects.stopAmbient();
  }
}

const scenes = {};

scenes.tiles = (g, [style, cols, rows, icon, quota]) => {
  const light = style === "lights";
  const popit = style === "popit";
  const points = sketchGrid(cols, rows, light ? 116 : 108, 76, light ? 360 : 504, 268);
  let phase = 0;
  let pressed = new Set();
  let wanted = new Set();
  const isPattern = light || popit || style === "scratch";
  const pattern = (i, half) => {
    const x = i % cols;
    const y = Math.floor(i / cols);
    if (light) return [0, 2, 3, 5, 6, 8, 11].includes(i);
    if (popit) return (x + y + half) % 2 === 0 || x === 2;
    return (x + 2 * y) % 4 === 0 || y === 2 || x === y;
  };
  let flip;
  function setup() {
    wanted = new Set(points.map((_, i) => i).filter(i => !isPattern || pattern(i, phase)));
    pressed = new Set();
    update();
  }
  function update() {
    const goal = quota ?? wanted.size;
    const amount = light
      ? points.filter((_, i) => pressed.has(i) === wanted.has(i)).length : pressed.size;
    const maximum = light ? points.length : goal;
    g.say(popit ? (phase === 0 ? "表" : "裏") + "　" + amount + " / " + maximum :
      amount + " / " + maximum + (style === "chocolate" ? " かけ" : ""), amount / maximum);
  }
  function press(i) {
    if (g.finished || i < 0 || (popit && phase === 0 && pressed.size === wanted.size)) return;
    if (!light && (pressed.has(i) || !wanted.has(i))) return;
    if (light && pressed.has(i)) pressed.delete(i);
    else pressed.add(i);
    const p = points[i];
    g.sparkle(p.x, p.y, 4);
    effects.hit(style, i);
    update();
    const completed = light
      ? points.every((_, k) => pressed.has(k) === wanted.has(k))
      : pressed.size >= (quota ?? wanted.size);
    if (!completed) return;
    if (popit && phase === 0) {
      flip.disabled = false;
      g.say("表がそろった！ 裏返してもう一面。", .5);
    } else {
      g.clear(style === "night" ? "おやすみ。星が全部見えたよ。" : "そろった！");
    }
  }
  function at(p) {
    const i = points.findIndex(q => within(p, q.x, q.y, q.dx * .91, q.dy * .89));
    press(i);
  }
  function next() {
    const i = points.findIndex((_, k) => pressed.has(k) !== wanted.has(k));
    press(i);
  }
  g.button(light ? "次の窓を切り替え" : "ひとつ押す", next);
  if (popit) {
    flip = g.button("裏返す", () => {
      if (phase === 1 || pressed.size !== wanted.size) return;
      phase++;
      flip.disabled = true;
      setup();
      g.sparkle(W / 2, 120, 18);
    }, true);
    flip.disabled = true;
  }
  setup();
  return {
    down: at,
    move(p, previous) {
      if (!light) sample(previous, p, 10).forEach(at);
    },
    key(key) { if (key === " " || key === "Enter") next(); },
    draw(c) {
      const [base, shade, accent] = g.colors;
      slab(c, 82, 56, 556, 320, style === "night" ? "#352b51" :
        style === "chocolate" ? "#8b5a55" : style === "scratch" ? "#27243b" : "#fff8");
      if (style === "lint") {
        for (let x = 106; x < 630; x += 10) {
          line(c, [{x, y: 72}, {x: x + 4, y: 356}], "#aa7d3145", 2);
        }
      }
      points.forEach((p, i) => {
        const on = pressed.has(i);
        const radius = Math.min(p.dx, p.dy) * .36;
        if (light) {
          round(c, p.x - 28, p.y - 29, 56, 58, 9, on ? "#ffdf88" : "#8d7b9b", "#fff9", 3);
          line(c, [{x: p.x - 27, y: p.y}, {x: p.x + 27, y: p.y}], "#fff9", 2);
          line(c, [{x: p.x, y: p.y - 28}, {x: p.x, y: p.y + 28}], "#fff9", 2);
        } else if (style === "chocolate") {
          round(c, p.x - 41, p.y - 25, 82, 50, 6, on ? "#a36c63" : "#5f3737", "#af7f71", 3);
          if (!on) word(c, "◇", p.x, p.y, 20, "#af7f71");
        } else if (style === "night") {
          if (on) word(c, ["✦", "✧", "⋆"][i % 3], p.x, p.y, 37, "#ffe8a1");
          else round(c, p.x - 24, p.y - 18, 48, 36, 8, "#ffe3a4", "#f2ba68", 2);
        } else if (style === "scratch") {
          if (on) word(c, "✦", p.x, p.y, 26, paints[i % paints.length]);
          else if (wanted.has(i)) circle(c, p.x, p.y, 7, "#8f7eab");
          else circle(c, p.x, p.y, 2, "#51496a");
        } else {
          const active = wanted.has(i);
          const tone = popit ? paints[Math.floor(i / cols) % paints.length] :
            style === "pillow" ? "#d2b4e8" : shade;
          if (on && style === "pillow") marble(c, p.x, p.y, 47, tone);
          else if (on) circle(c, p.x, p.y + 1, radius * .75, "#55457526", "#fff8", 2);
          else if (!active) circle(c, p.x, p.y, radius * .75, base, "#fff", 2);
          else marble(c, p.x, p.y, style === "lint" ? radius * .67 : radius, tone, style === "lint");
        }
      });
      if (light) {
        round(c, 504, 138, 103, 103, 12, base, "#fff", 2);
        word(c, "見本", 555, 158, 16, accent);
        for (const [i, p] of sketchGrid(cols, rows, 512, 173, 87, 62).entries()) {
          round(c, p.x - 8, p.y - 7, 16, 14, 3, wanted.has(i) ? "#ffcf75" : "#8d7b9b");
        }
      }
      if (popit && phase === 0 && pressed.size === wanted.size) {
        chip(c, "表がそろった", 360, 386, accent, true, 178);
      }
      if (g.finished) {
        circle(c, 360, 208, 57, "#fffdf2ee", shade, 3);
        glyph(c, icon, 360, 208, 56);
      }
    }
  };
};

scenes.calc = g => {
  const numbers = [3, 7, 13, 20, 28, 36];
  const keys = sketchGrid(3, 2, 178, 170, 364, 168);
  let total = 0;
  function add(amount) {
    if (total + amount > 100) {
      g.say("100まで、あと " + (100 - total) + "。ほかの数字を試そう。", total / 100);
      return;
    }
    total += amount;
    effects.hit("calc", numbers.indexOf(amount));
    g.say("合計 " + total + " / 100", total / 100);
    if (total === 100) g.clear("ぴったり100！");
  }
  numbers.forEach(n => g.button("+" + n, () => add(n)));
  g.button("0に戻す", () => { total = 0; g.say("合計 0 / 100", 0); });
  g.say("合計 0 / 100", 0);
  return {
    down(p) {
      const i = keys.findIndex(q => within(p, q.x, q.y, q.dx - 10, q.dy - 10));
      if (i !== -1) add(numbers[i]);
    },
    draw(c) {
      slab(c, 150, 46, 420, 325, g.colors[1]);
      round(c, 176, 70, 368, 83, 17, "#dfecd9", "#fff9", 3);
      word(c, "めざせ 100", 202, 111, 20, "#4b624e", 700, "left");
      word(c, String(total), 519, 115, 50, "#263b2f", 800, "right");
      keys.forEach((p, i) => {
        round(c, p.x - 53, p.y - 31, 106, 67, 13, "#50396c55");
        round(c, p.x - 53, p.y - 35, 106, 64, 13, "#fffaf4", "#fff", 2);
        word(c, "+" + numbers[i], p.x, p.y - 4, 26);
      });
    }
  };
};

scenes.sequence = (g, [style, pads, order, label]) => {
  let progress = 0;
  let last = -1;
  let started = false;
  let preview = -1;
  let begins = 0;
  const notes = style === "notes";
  const wantHighlight = ["typing", "pinwheel", "buttons"].includes(style);
  const pts = sketchGrid(Math.min(pads.length, 5), Math.ceil(pads.length / 5), 97, 169, 526, 166);
  function status() {
    g.say(notes && !started ? "先に「見本を聴く」を押そう。" :
      order.slice(0, progress).join("  ") + (progress ? "　·　" : "") + progress + " / " + order.length, progress / order.length);
  }
  function press(i) {
    if (notes && (!started || preview >= 0)) return;
    const val = pads[i];
    if (val !== order[progress]) {
      effects.rustle(900, .08, .05);
      g.say(notes ? "もう一度、聞いた順に押してみよう。" : "次は「" + order[progress] + "」。");
      if (notes) progress = 0;
      return;
    }
    last = i;
    effects.hit(style, i);
    g.sparkle(pts[i].x, pts[i].y);
    progress++;
    status();
    if (progress === order.length) g.clear(style === "typing" ? label + "！" : "そろった！");
  }
  function listen() {
    started = true;
    preview = 0;
    begins = g.now;
    progress = 0;
    order.forEach((name, i) => effects.tone([392, 494, 587][pads.indexOf(name)], .32, .09, i * .47, "sine"));
    g.say("見本の音。光った順も覚えよう。", 0);
  }
  pads.forEach((name, i) => g.button(name, () => press(i)));
  if (notes) g.button("見本を聴く", listen, true);
  status();
  return {
    update() {
      if (preview < 0) return;
      while (g.now - begins >= (preview + 1) * .47) {
        preview++;
        g.dirty = true;
        if (preview === order.length) {
          preview = -1;
          status();
          break;
        }
      }
    },
    down(p) {
      const i = pts.slice(0, pads.length).findIndex(q => within(p, q.x, q.y, q.dx - 6, Math.min(q.dy, 84)));
      if (i >= 0) press(i);
    },
    draw(c) {
      const [,shade,accent,dark] = g.colors;
      slab(c, 76, 53, 568, 316, "#fff7");
      if (style === "vending") glyph(c, last < 0 ? "🥫" : pads[last].split(" ")[0], 360, 353, 33);
      else if (style === "pinwheel") glyph(c, "🍃", 360 + (last < 0 ? 0 : 36 * (last - 1)), 351, 37);
      else if (style === "locker") glyph(c, g.finished ? "🔓" : "🔒", 591, 96, 35);
      const next = order[progress] ?? "";
      const headline = g.finished ? "できあがり" : (notes ? "見本の三音" : style === "vending" ? "注文　" + next : label);
      word(c, headline, 360, 92, 26, dark);
      const track = notes ? order.map((name, i) => i < progress || i === preview ? name : "○") :
        order.map((name, i) => i < progress ? "✓" : name.split(" ").at(-1));
      word(c, track.join("　"), 360, 130, track.join("").length > 19 ? 16 : 20, dark);
      pads.forEach((name, i) => {
        const p = pts[i];
        const on = preview >= 0 ? name === order[preview] : wantHighlight && name === next && !g.finished;
        round(c, p.x - p.dx / 2 + 4, p.y - 31, p.dx - 8, 66, 13, shade);
        round(c, p.x - p.dx / 2 + 4, p.y - 35, p.dx - 8, 65, 13, on ? accent : "#fffaf8", "#fff", 2);
        word(c, name, p.x, p.y, name.length > 6 ? 16 : 23, on ? "#fff" : dark);
      });
    }
  };
};

scenes.timing = (g, [style, period, goal, label]) => {
  let hits = 0;
  let lastHit = -1;
  let pulse = 0;
  const center = 360;
  const left = 130;
  const right = 590;
  function phase() {
    return .5 + .46 * Math.sin(g.now * Math.PI * 2 / period - 1.2);
  }
  function tap() {
    const pass = Math.floor((g.now + .27) / (period / 2));
    effects.hit(style, hits);
    if (Math.abs(phase() - .5) > .16 || pass === lastHit) {
      g.say("真ん中の色の帯に重なったときに押そう。", hits / goal);
      return;
    }
    lastHit = pass;
    hits++;
    pulse = g.now;
    g.sparkle(center, 224, 12);
    g.say("いい感じ！ " + hits + " / " + goal, hits / goal);
    if (hits === goal) g.clear("ぴったりのタイミング！");
  }
  g.button(label, tap, true);
  g.say("真ん中の色の帯が目印。 0 / " + goal, 0);
  return {
    motion: true,
    down: tap,
    key(k) { if (k === " " || k === "Enter") tap(); },
    draw(c) {
      const [,shade,accent,dark] = g.colors;
      slab(c);
      const x = lerp(left, right, phase());
      const glow = hits > 0 && g.now - pulse < .4;
      if (style === "clock") {
        line(c, [{x: 360, y: 81}, {x, y: 201}], dark, 8);
        marble(c, x, 201, 26, "#e2c073");
      } else if (style === "cabbage") {
        glyph(c, g.game.icon, 372, 161, 90);
        for (let i = 0; i < hits; i++) round(c, 258 + i * 14, 189 + i % 2 * 10, 13, 21, 4, "#7bcf8e");
      } else {
        const renderIcon = style === "egg" && glow ? "🍳" : style === "catnap" && hits % 2 ? "😺" : g.game.icon;
        c.save();
        c.translate(style === "alarm" ? (x - center) * .3 : 0, glow && !reduceMotion ? -6 : 0);
        glyph(c, renderIcon, 360, 160, 92);
        c.restore();
      }
      line(c, [{x: left, y: 256}, {x: right, y: 256}], "#5c44632e", 13);
      round(c, 284, 231, 152, 50, 18, "#aff0c9", "#fff", 2);
      circle(c, center, 256, 5, "#52826a");
      marble(c, x, 256, 18, glow ? "#70be9d" : accent);
      word(c, hits + " / " + goal, 360, 308, 20, dark, 800);
      if (g.finished) word(c, "✓", 360, 54, 34, shade);
    }
  };
};

scenes.peel = (g, [style, mark, message]) => {
  let amount = 0;
  let tick = -1;
  const up = ["tissue", "can", "yogurt"].includes(style);
  function set(n) {
    amount = clamp(n);
    const nextTick = Math.floor(amount * 8);
    if (nextTick > tick) {
      tick = nextTick;
      effects.hit(style, tick);
    }
    g.say((up ? "上へ" : "右へ") + "引く　" + Math.round(amount * 100) + "%", amount);
    if (amount >= 1) g.clear(message);
  }
  const advance = () => set(amount + .2);
  g.button(up ? "上へ引く" : "右へ引く", advance, true);
  g.say(up ? "つまみから上へ引こう。" : "角から右へ引こう。", 0);
  return {
    move(p, previous) {
      const delta = up ? previous.y - p.y + (style === "yogurt" ? (p.x - previous.x) * .45 : 0) : p.x - previous.x;
      if (delta > 0) set(amount + delta / (up ? 181 : 387));
    },
    key(k) { if (k === (up ? "ArrowUp" : "ArrowRight") || k === " ") advance(); },
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      const x = 153, y = 81, w = 414, h = 246;
      slab(c, x - 10, y - 10, w + 20, h + 20, "#fff9");
      const isWindow = style === "curtain";
      const seed = isWindow ? "#a8d4f0" : style === "film" ? "#535a7c" : "#fff5db";
      round(c, x, y, w, h, 18, seed, "#fff", 2);
      if (isWindow) {
        circle(c, 450, 143, 42, "#fff4b5");
        circle(c, 246, 297, 94, "#8ac3a7");
        circle(c, 498, 315, 109, "#70ad92");
        glyph(c, "🐦", 416, 172, 51);
        line(c, [{x: 360, y: y + 4}, {x: 360, y: y + h - 4}], "#fffdf6", 9);
      } else glyph(c, mark, 360, 198, style === "letter" ? 73 : 108);
      if (amount < 1) {
        if (up) {
          const bottom = y + h;
          const lifted = h * (1 - amount);
          round(c, x + 4, bottom - lifted, w - 8, lifted, 15, shade, "#fffb", 2);
          round(c, 332, bottom - lifted - 12, 56, 36, 11, "#fff4df", "#fff", 2);
          word(c, "↑", 360, bottom - lifted + 6, 23, dark);
        } else {
          const start = x + w * amount;
          const exposed = x + w - start;
          round(c, start, y, exposed, h, 16, style === "film" ? "#d9e9efdb" : shade, "#fff", 2);
          if (isWindow) {
            for (let i = start + 16; i < x + w; i += 22) {
              line(c, [{x: i, y: y + 8}, {x: i, y: y + h - 8}], i % 2 ? "#fff4" : "#4d315C33", 7);
            }
          }
          round(c, start, y + h - 50, 45, 48, 16, base, "#fff", 2);
          word(c, "→", start + 22, y + h - 26, 26, accent);
        }
      }
      if (style === "letter" && g.finished) word(c, message, 360, 281, 20, dark);
      if (style === "film" && g.finished) word(c, "✦", 486, 135, 30, "#fdf1b0");
    }
  };
};

function route(name) {
  const explicit = {
    triangle: [[359,89],[438,187],[503,284],[364,294],[217,284],[293,173],[359,89]],
    zig: [[136,265],[213,171],[302,244],[379,154],[461,220],[545,152],[592,126]],
    perforation: [[131,212],[198,211],[266,209],[335,207],[404,205],[472,205],[541,203],[590,201]],
    knot: [[145,276],[218,208],[304,132],[399,129],[466,194],[398,267],[299,227],[335,155],[451,230],[548,169]],
    cat: [[259,256],[225,194],[211,115],[281,154],[385,154],[470,115],[483,199],[455,263],[357,298],[259,256]],
    maze: [[144,293],[257,293],[257,213],[208,213],[208,131],[366,131],[366,240],[481,240],[481,142],[576,142]],
    lace: [[225,284],[485,284],[225,223],[485,223],[225,160],[485,160],[225,102],[485,102]],
    weave: [[153,118],[240,118],[326,118],[411,118],[498,118],[566,188],[480,188],[393,188],[307,188],[221,188],[154,260],[241,260],[328,260],[412,260],[500,260]],
    vine: [[369,304],[444,278],[275,249],[444,220],[275,190],[444,156],[275,129],[370,95]],
    umbrella: [[181,126],[245,178],[304,133],[359,201],[417,133],[478,178],[539,126],[357,278]],
    curve: [[145,285],[204,278],[278,250],[329,208],[384,161],[449,136],[522,133],[577,133]]
  };
  if (explicit[name]) return explicit[name].map(([x, y]) => ({x, y}));
  if (name === "stripes") return Array.from({length: 15}, (_, i) => {
    const row = Math.floor(i / 5);
    const col = row % 2 ? 4 - i % 5 : i % 5;
    return {x: 158 + col * 101, y: 128 + row * 71};
  });
  if (name === "loops" || name === "scoops") {
    return [190, 360, 530].flatMap(x => Array.from({length: 6}, (_, i) =>
      ({x: x + Math.cos(i * Math.PI / 3) * 49, y: 213 + Math.sin(i * Math.PI / 3) * 49})));
  }
  return Array.from({length: name === "spiral" ? 15 : 11}, (_, i) => {
    const t = i / 10 * Math.PI * 2;
    if (name === "heart") return {
      x: 360 + 10 * 16 * Math.sin(t) ** 3,
      y: 209 - 10 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * .76
    };
    if (name === "arc") return {x: 360 + 192 * Math.cos(t / 2), y: 260 - 130 * Math.sin(t / 2)};
    return {x: 360 + (22 + i * 14) * Math.cos(t), y: 215 + (16 + i * 8) * Math.sin(t)};
  });
}

scenes.trace = (g, [style, name, result]) => {
  const pts = route(name);
  let n = 0;
  function step() {
    if (n >= pts.length) return;
    const p = pts[n++];
    g.sparkle(p.x, p.y, 4);
    effects.hit(style, n);
    g.say("なぞった点　" + n + " / " + pts.length, n / pts.length);
    if (n === pts.length) g.clear("きれいにできた！");
  }
  function at(p) {
    if (pts[n] && length(pts[n], p) < 33) step();
  }
  g.button("次の点", step);
  g.say("大きく光る点から、順番になぞろう。", 0);
  return {
    down: at,
    move(p, prev) { sample(prev, p, 9).forEach(at); },
    key(k) { if (k === " " || k === "Enter") step(); },
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      const ground = style === "latte" ? "#b68160" : style === "rake" ? "#e8cc91" :
        ["lace", "lacing", "knit"].includes(style) ? "#d8e4d4" : "#fffb";
      slab(c, 99, 65, 522, 277, ground);
      c.save();
      c.globalAlpha = .22;
      glyph(c, g.game.icon, 360, 202, 166);
      c.restore();
      if (name === "stripes") {
        for (let row = 0; row < 3; row++) {
          round(c, 133, 111 + row * 71, 449, 34, 9,
            n >= (row + 1) * 5 ? paints[row] : base, "#fff8", 2);
        }
      }
      if (style === "vine") {
        line(c, [{x: 360, y: 83}, {x: 360, y: 319}], "#bd9971", 15);
      }
      if (style === "maze") {
        for (const [i, p] of sketchGrid(4, 2, 109, 82, 488, 246).entries()) {
          if (i % 3 === 1) glyph(c, "🏠", p.x - 10, p.y - 18, 38);
        }
      }
      line(c, pts, style === "latte" ? "#eec8a0" : "#705a9648", 4, true);
      line(c, pts.slice(0, n), style === "latte" ? "#fff5e5" : accent, style === "lacing" ? 10 : 8);
      pts.forEach((p, i) => {
        const active = i === n;
        if (active) marble(c, p.x, p.y, 19, shade);
        else circle(c, p.x, p.y, i < n ? 5 : 8, i < n ? accent : "#fff", style === "latte" ? "#f3d5b3" : shade, 1.5);
        if (active || style === "connect") word(c, String(i + 1), p.x, active ? p.y : p.y - 18, active ? 15 : 12, dark);
      });
      if (g.finished) {
        circle(c, 360, 388, 23, "#fffaf4", shade, 2);
        glyph(c, result, 360, 388, result.length > 3 ? 20 : 29);
      }
    }
  };
};

scenes.fold = (g, [style, steps, reward]) => {
  let index = 0;
  let start = null;
  const edges = {
    "左の角": {x: 176, y: 211}, "右の角": {x: 544, y: 211},
    "下の端": {x: 360, y: 302}, "上の端": {x: 360, y: 116},
    "下の角": {x: 360, y: 302}, "上の角": {x: 360, y: 116}
  };
  const verb = style === "sheets" ? "を引く" : "を折る";
  const button = g.button(steps[0] + verb, step, true);
  function step() {
    const p = edges[steps[index++]];
    effects.hit("cloth", index);
    g.sparkle(p.x, p.y, 10);
    if (index === steps.length) g.clear(style === "sheets" ? "しわが伸びた！" : "ぴしっと折れた！");
    else {
      button.textContent = steps[index] + verb;
      g.say(steps[index] + "が光っているよ。 " + index + " / " + steps.length, index / steps.length);
    }
  }
  g.say(steps[0] + "に触れて動かそう。", 0);
  return {
    down(p) { start = length(p, edges[steps[index]] ?? {x: -1000, y: -1000}) < 62 ? p : null; },
    up() {
      if (start) step();
      start = null;
    },
    cancel() { start = null; },
    key(k) { if (k === "Enter" || k === " ") step(); },
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      slab(c, 114, 69, 492, 281);
      const panelWidth = style === "receipt" ? 162 : 310;
      const fold = index / steps.length;
      const width = style === "sheets" ? 240 + fold * 130 : panelWidth - fold * 72;
      const height = style === "sheets" ? 140 + fold * 67 : 191 - fold * 48;
      round(c, 360 - width / 2, 211 - height / 2, width, height, 12, base, shade, 3);
      if (style === "receipt") {
        for (let i = 1; i < 6; i++) line(c, [
          {x: 318, y: 150 + i * 14}, {x: 402 - i * 4, y: 150 + i * 14}
        ], "#52436955", 4);
      }
      if (style === "sheets") {
        for (let i = 0; i < steps.length - index; i++) {
          line(c, [{x: 286 + i * 34, y: 139}, {x: 302 + i * 36, y: 268}], "#59426934", 3, true);
        }
      }
      for (const side of steps.slice(0, index)) {
        const p = edges[side];
        line(c, [{x: lerp(360, p.x, .54), y: lerp(211, p.y, .54)}, {x: 360, y: 211}], shade, 3, true);
      }
      glyph(c, g.finished ? reward : g.game.icon, 360, 211, 66);
      if (!g.finished) {
        const p = edges[steps[index]];
        line(c, [p, {x: lerp(p.x, 360, .58), y: lerp(p.y, 211, .58)}], accent, 4, true);
        marble(c, p.x, p.y, start ? 22 : 17, shade);
        word(c, steps[index], p.x, p.y + (p.y < 150 ? -32 : 34), 17, dark);
      }
    }
  };
};

scenes.quiz = (g, [style, clue, options, answer, reward]) => {
  let shown = false;
  let wrong = -1;
  const pos = choices(options.length, 293, 190, 530);
  let answerButtons;
  const actionLabels = {
    pouch: "少し開ける", parcel: "箱を振る", bud: "つぼみを見る",
    footstep: "足音を聞く", telephone: "糸を張る"
  };
  function show() {
    shown = true;
    if (style === "telephone") narration.stop();
    else if (style === "footstep") [0, .26].forEach(t => effects.rustle(670, .24, .13, t));
    else if (style === "parcel") [0, .12, .31].forEach(t => effects.tone(720, .15, .075, t, "triangle", 260));
    else effects.hit(style);
    answerButtons.forEach(button => button.disabled = false);
    g.say(clue + (style === "telephone" ? " 聞こえないときは「字幕を見る」。" : ""), .4);
    if (style === "telephone") narration.speak(options[answer], reason => g.say(reason + "字幕「" + options[answer] + "」", .4));
  }
  function pick(i) {
    if (!shown) return;
    if (i !== answer) {
      wrong = i;
      g.say("もう少しよく確かめてみよう。 " + clue, .4);
      return;
    }
    if (style === "telephone") narration.stop();
    g.clear(style === "telephone" ? "合言葉が伝わった！" : "正解。中身が分かった！");
  }
  g.button(actionLabels[style] ?? "ヒントを確かめる", show, true);
  answerButtons = options.map((opt, i) => g.button(opt, () => pick(i)));
  answerButtons.forEach(b => b.disabled = true);
  if (style === "telephone") g.button("字幕を見る", () => {
    narration.stop(); shown = true;
    answerButtons.forEach(b => b.disabled = false);
    g.say("字幕「" + options[answer] + "」を選んで返そう。", .4);
  });
  g.say("気になるものを調べてみよう。", 0);
  return {
    down(p) {
      if (p.y < 245) show();
      else {
        const i = pos.findIndex(q => within(p, q.x, q.y, 156, 66));
        if (i >= 0) pick(i);
      }
    },
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      slab(c, 87, 59, 546, 293);
      circle(c, 360, 158, 74, base, "#fff", 4);
      glyph(c, g.finished ? reward : g.game.icon, 360, 158, 84);
      if (shown && !g.finished) word(c, style === "pouch" ? "◯━━⌁" : style === "telephone" ? "♪ ♪ ♪" : "✧　✧", 473, 143, 24, accent);
      if (shown) {
        pos.forEach((p, i) => chip(c, options[i], p.x, p.y, wrong === i ? "#b09dac" : shade,
          g.finished && i === answer, 151));
      } else {
        chip(c, actionLabels[style] ?? "調べる", 360, 289, accent, false, 180);
      }
      if (g.finished) word(c, "✓", 467, 153, 33, dark);
    }
  };
};

scenes.browse = (g, [style, mark, frames, answers]) => {
  let current = 0;
  const found = new Set();
  const announce = () => {
    const message = "次は、" + frames[current] + "です。";
    g.say("車内放送：" + message + " お題は「" + mark + "」。", found.size / answers.length);
    narration.speak(message, reason => g.say(reason + "字幕「" + frames[current] + "」 お題は「" + mark + "」。", found.size / answers.length));
  };
  const next = d => {
    current = (current + d + frames.length) % frames.length;
    effects.hit(style, current);
    g.say((current + 1) + " / " + frames.length + "　見つけた数 " + found.size + " / " + answers.length, found.size / answers.length);
    if (style === "bus") announce();
  };
  function choose() {
    if (!answers.includes(current)) {
      g.say("印は「" + mark + "」。次も見てみよう。", found.size / answers.length);
      return;
    }
    if (style === "bus") narration.stop();
    found.add(current);
    g.sparkle(360, 177, 18);
    effects.hit("notes", found.size);
    g.say("見つけた！ " + found.size + " / " + answers.length, found.size / answers.length);
    if (found.size === answers.length) g.clear("お目当ての印がそろった！");
  }
  g.button("← 前へ", () => next(-1));
  g.button(style === "bus" ? "降車ボタン" : "ここで決定", choose, true);
  g.button("次へ →", () => next(1));
  if (style === "bus") g.button("車内放送を聞く・もう一度", announce);
  g.say(style === "bus" ? "お題は「" + mark + "」。車内放送を聞くボタンで出発。音OFFでも表示の字幕で遊べます。" : "探す印　" + mark, 0);
  return {
    down(p) {
      if (p.x < 205) next(-1);
      else if (p.x > 515) next(1);
      else choose();
    },
    key(key) {
      if (key === "ArrowLeft") next(-1);
      if (key === "ArrowRight") next(1);
      if (key === " " || key === "Enter") choose();
    },
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      slab(c, 149, 62, 422, 282, style === "channel" ? "#4c3e58" : "#fff5df");
      round(c, 186, 87, 348, 167, 24, base, shade, 3);
      glyph(c, g.game.icon, 360, 137, 47);
      word(c, frames[current], 360, 195, 37, dark);
      word(c, found.has(current) ? "✓" : (current + 1) + " / " + frames.length,
        360, 232, 17, dark);
      circle(c, 176, 289, 23, shade, "#fff", 2);
      circle(c, 544, 289, 23, shade, "#fff", 2);
      word(c, "‹", 176, 287, 29, dark);
      word(c, "›", 544, 287, 29, dark);
      chip(c, "探す印　" + mark, 360, 290, accent, true, 210);
    }
  };
};

scenes.aim = (g, [style, targets, label]) => {
  let aim = .50;
  let cleared = 0;
  let flight = null;
  const lo = 128;
  const hi = 592;
  const icon = ({bounce: "⚪", bean: "🟢", ice: "🧊", bubble: "🫧", paper: "⚪", dandelion: "✺"})[style] ?? g.game.icon;
  let trigger;
  const guide = g.range("着地点", aim, value => { if (!flight) aim = value; });
  function move(value) {
    if (flight) return;
    aim = clamp(value);
    guide.value = Math.round(aim * 100);
  }
  function launch() {
    if (flight || cleared >= targets.length) return;
    flight = {time: 0, to: aim};
    trigger.disabled = true;
    effects.hit(style);
  }
  trigger = g.button(label, launch, true);
  g.say("着地点を合わせてみよう。 0 / " + targets.length, 0);
  return {
    motion: true,
    down(p) { move((p.x - lo) / (hi - lo)); },
    move(p) { move((p.x - lo) / (hi - lo)); },
    key(k) {
      if (k === "ArrowLeft" || k === "ArrowRight") move(aim + (k === "ArrowRight" ? .025 : -.025));
      if (k === " " || k === "Enter") launch();
    },
    update(dt) {
      if (!flight) return;
      flight.time += dt / (reduceMotion ? .38 : .82);
      if (flight.time < 1) return;
      const x = lerp(lo, hi, flight.to);
      const ok = Math.abs(flight.to - targets[cleared]) <= .083;
      flight = null;
      trigger.disabled = false;
      if (!ok) {
        g.say("惜しい。着地点のしるしを輪の中に合わせよう。", cleared / targets.length);
        effects.rustle(900, .14, .08);
        return;
      }
      cleared++;
      g.sparkle(x, 274, 16);
      effects.hit(style === "ice" ? "ice" : "bubble", cleared);
      g.say("入った！ " + cleared + " / " + targets.length, cleared / targets.length);
      if (cleared === targets.length) g.clear("狙いどおり！");
    },
    draw(c) {
      const [,shade,accent,dark] = g.colors;
      const panColor = ["skipstone", "bubble", "ice"].includes(style) ? "#c9e9f7" : "#fff6e5";
      slab(c, 89, 72, 542, 273, panColor);
      const target = lerp(lo, hi, targets[Math.min(cleared, targets.length - 1)]);
      c.fillStyle = "#4e355317";
      c.beginPath();
      c.ellipse(target, 274, 54, 19, 0, 0, 2 * Math.PI);
      c.fill();
      c.beginPath();
      c.ellipse(target, 265, 52, style === "bubble" ? 37 : 20, 0, 0, 2 * Math.PI);
      c.fillStyle = style === "paper" ? "#baabc9" : "#fffced";
      c.fill();
      c.lineWidth = 6;
      c.strokeStyle = shade;
      c.stroke();
      if (style === "dandelion") glyph(c, "🌷", target, 259, 37);
      word(c, g.finished ? "✓" : "◎", target, 264, 22, accent);
      const projected = lerp(lo, hi, aim);
      line(c, [{x: lo, y: 326}, {x: hi, y: 326}], "#47305928", 9);
      line(c, [{x: projected, y: 296}, {x: projected, y: 320}], shade, 2, true);
      marble(c, projected, 326, 12, accent);
      if (!flight) {
        glyph(c, icon, g.finished ? target : 360, g.finished ? 253 : 146, 57);
      } else {
        const t = clamp(flight.time);
        const x = lerp(360, lerp(lo, hi, flight.to), t);
        const lift = style === "skipstone" || style === "bounce" ? Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t) * 63 :
          Math.sin(t * Math.PI) * 117;
        let y = lerp(146, 258, t) - lift;
        if (style === "skipstone") y = 243 - lift;
        c.save();
        c.translate(x, y);
        if (style === "flip" && !reduceMotion) c.rotate(t * 2 * Math.PI);
        glyph(c, icon, 0, 0, style === "bubble" ? 45 + t * 25 : 54);
        c.restore();
      }
      word(c, label, 360, 385, 21, dark);
    }
  };
};

scenes.dial = (g, [style, targets, label]) => {
  let amount = .14;
  let index = 0;
  let soundTick = -1;
  const whisper = style === "radio";
  function set(n) {
    amount = clamp(n);
    slider.value = Math.round(amount * 100);
    const tick = Math.floor(amount * 18);
    if (tick === soundTick) return;
    soundTick = tick;
    const close = Math.abs(amount - targets[index]) < .085;
    if (whisper) {
      if (close) effects.tone(412 + index * 70, .13, .065, 0, "sine", 412 + index * 70);
      else effects.rustle(1950, .11, .11);
    } else effects.hit(style, tick);
    g.say(whisper ? (close ? "曲が聞こえる！" : "もう少し回してみよう。") :
      "目印に合わせて「" + label + "」。", index / targets.length);
  }
  const slider = g.range(style === "measure" ? "長さ" : "回す量", amount, set);
  function apply() {
    if (Math.abs(amount - targets[index]) > .084) {
      g.say(whisper ? "音が澄むところを探そう。" : "目印にもう少し近づけてみよう。");
      return;
    }
    g.sparkle(480, 181, 19);
    effects.hit(whisper ? "notes" : style, index);
    index++;
    if (index === targets.length) {
      g.clear(style === "measure" ? "ぴったり。シュルッ！" : "ぴったり合った！");
    } else {
      g.say("合った！ 次の目印へ。 " + index + " / " + targets.length, index / targets.length);
    }
  }
  g.button(label, apply, true);
  g.say(whisper ? "少しずつ回して、音を探そう。" : "しるしを動かして、目印の色の帯に合わせよう。", 0);
  return {
    down(p) {
      if (p.y > 253) set((p.x - 133) / 454);
    },
    move(p, prev) {
      if (p.y > 253 && prev.y > 253) set((p.x - 133) / 454);
      else set(amount + (p.x - prev.x - (p.y - prev.y) * .5) / 381);
    },
    key(k) {
      if (k === "ArrowLeft" || k === "ArrowRight") set(amount + (k === "ArrowRight" ? .025 : -.025));
      if (k === " " || k === "Enter") apply();
    },
    draw(c) {
      const [base,shade,accent,dark] = g.colors;
      slab(c, 92, 68, 536, 275);
      marble(c, 241, 173, 74, shade);
      const angle = lerp(-2.34, 2.34, amount);
      line(c, [
        {x: 241 + Math.sin(angle) * 18, y: 173 - Math.cos(angle) * 18},
        {x: 241 + Math.sin(angle) * 55, y: 173 - Math.cos(angle) * 55}
      ], dark, 10);
      const target = targets[Math.min(index, targets.length - 1)];
      if (style === "barcode") {
        for (let i = 0; i < 17; i++) {
          const x = 406 + i * 9;
          line(c, [{x, y: 121},{x, y: 204}], "#493448", i % 3 + 1.5);
        }
        line(c, [{x: 394, y: 129 + amount * 67},{x: 572, y: 129 + amount * 67}], "#de6d89", 3);
      } else if (style === "measure" || style === "pencil") {
        round(c, 357, 150, Math.max(20, 230 * amount), 30, 5, style === "measure" ? "#f7d883" : "#eeb774", shade, 2);
        for (let i = 0; i < amount * 13; i++) line(c, [
          {x: 369 + i * 16, y: 153}, {x: 369 + i * 16, y: 163 + (i % 2) * 5}
        ], dark, 2);
      } else if (style === "cotton") {
        let r = 21 + amount * 54;
        line(c, [{x: 465,y: 176},{x: 483,y: 232}], "#bd976e", 10);
        for (let i = 0; i < 7; i++) {
          marble(c, 465 + Math.cos(i) * r * .48, 149 + Math.sin(i) * r * .42, r * .65, "#e9a8c8", true);
        }
      } else if (style === "radio") {
        const strength = clamp(1 - Math.abs(amount - target) * 6);
        line(c, Array.from({length: 54}, (_, i) => ({
          x: 371 + 4 * i, y: 175 + Math.sin(i * (strength > .55 ? .57 : 2.73)) * (17 + strength * 21)
        })), accent, 3);
      } else {
        c.save();
        c.translate(style === "windup" ? 385 + amount * 145 : 468, 177);
        if (["capsule", "label"].includes(style)) c.rotate((amount - .5) * 1.35);
        glyph(c, g.finished && style === "rainbow" ? "🌈" : g.game.icon, 0, 0, 80);
        c.restore();
      }
      const left = 133, right = 587, y = 286;
      line(c, [{x:left,y},{x:right,y}], "#49305227", 11);
      const x = lerp(left, right, target);
      if (!whisper) round(c, x - 35, y - 16, 70, 32, 13, "#d6efd6", "#fff", 2);
      else {
        for (let i = 0; i <= 8; i++) circle(c, lerp(left, right, i / 8), y, 4, shade);
      }
      marble(c, lerp(left, right, amount), y, 14, accent);
      word(c, g.finished ? "✓" : label, 360, 380, 23, dark);
    }
  };
};

scenes.meter = (g, [style, targets, label]) => {
  let index = 0;
  let amount = 0;
  let held = false;
  let nextSound = .1;
  const test = () => {
    if (!held) return;
    held = false;
    if (Math.abs(amount - targets[index]) > .088) {
      amount = 0;
      nextSound = .1;
      g.say("色のついた目印で、そっと指を離そう。", index / targets.length);
      return;
    }
    effects.hit(style, index);
    g.sparkle(360, 130, 15);
    index++;
    if (index === targets.length) g.clear("目印ぴったり！");
    else {
      amount = style === "jelly" ? targets[0] : 0;
      nextSound = amount + .1;
      g.say("いい感じ。つづけて次の目印へ。", index / targets.length);
    }
  };
  function start() { held = true; }
  function cancel() { held = false; }
  g.hold(label + "（長押し）", start, test, cancel);
  g.say("長押しして、目印の色の帯で離そう。", 0);
  return {
    motion: true,
    down: start,
    up: test,
    cancel,
    suspend: cancel,
    update(dt) {
      if (!held || g.finished) return;
      amount = Math.min(1, amount + dt * (style === "snowball" ? .36 : .53));
      if (amount >= nextSound) {
        effects.hit(style, Math.floor(nextSound * 10));
        nextSound += .14;
      }
    },
    draw(c) {
      const [base,shade,accent,dark] = g.colors;
      const target = targets[Math.min(index, targets.length - 1)];
      slab(c, 109, 58, 502, 298);
      const y = 306 - amount * 212;
      const targetY = 306 - target * 212;
      if (style === "snowball") {
        if (index > 0) marble(c, 251, 239, 55, "#a5ccdd");
        marble(c, 421, 236, 23 + 61 * amount, "#b8dae7");
        word(c, index === 0 ? "頭" : "体", 372, 102, 23, dark);
      } else {
        round(c, 235, 86, 244, 229, 24, "#f7fcff", "#d2bdce", 4);
        c.save();
        round(c, 244, 96, 226, 209, 17);
        c.clip();
        const liq = style === "tea" ? "#d99c62" : style === "jelly" ? "#d499ca" : "#eab476";
        c.fillStyle = liq;
        c.fillRect(241, y, 232, 310 - y);
        if (style === "jelly" && index > 0) {
          const y1 = 306 - targets[0] * 212;
          c.fillStyle = "#8ec6b0";
          c.fillRect(241, y1, 232, 311 - y1);
        }
        if (amount > .03) {
          for (let i = 0; i < 8; i++) circle(c, 256 + i * 30, y + (i % 3) * 4, 7, "#fff8");
        }
        if (style === "tea") {
          line(c, [{x: 376,y: 92}, {x: 368,y: 169}], "#916b5a", 2);
          round(c, 347, 159, 41, 42, 5, "#b18355", "#e7b682", 2);
        }
        c.restore();
      }
      round(c, 510, 94, 27, 212, 12, base, "#fff", 2);
      round(c, 499, targetY - 16, 50, 32, 10, "#d5ead0", "#fff", 2);
      line(c, [{x: 501, y}, {x: 547, y}], accent, 5);
      word(c, g.finished ? "✓" : label, 360, 383, 23, dark);
    }
  };
};

scenes.catch = (g, [style, goal, icon]) => {
  let x = 360;
  let got = 0;
  let time = 0;
  let next = 0;
  let playing = false;
  let serial = 0;
  let drops = [];
  const slots = [330, 456, 278, 491, 249, 408, 371, 519, 181];
  const tubY = 299;
  function move(n) {
    x = clamp(n, 121, 599);
    position.value = Math.round((x - 121) / 478 * 100);
  }
  function begin() {
    if (playing) return;
    playing = true;
    next = time;
    start.hidden = true;
    g.say("落ちてくるものの真下へ。", got / goal);
  }
  const position = g.range("受け皿を動かす", .5, v => { move(121 + 478 * v); });
  const start = g.button("はじめる", begin, true);
  g.say("用意できたら、はじめよう。", 0);
  return {
    motion: true,
    down(p) { begin(); move(p.x); },
    move(p) { move(p.x); },
    key(key) {
      if (key === " " || key === "Enter") begin();
      if (key === "ArrowLeft") move(x - 28);
      if (key === "ArrowRight") move(x + 28);
    },
    update(dt) {
      if (!playing || g.finished) return;
      time += dt;
      if (time >= next) {
        drops.push({x: slots[serial++ % slots.length], y: 64, tap: true});
        next += 1.25;
      }
      for (const drop of drops) {
        drop.y += dt * (style === "drops" ? 124 : 139);
        if (drop.tap && drop.y >= tubY - 15) {
          drop.tap = false;
          if (Math.abs(drop.x - x) <= 66) {
            drop.y = 430;
            got++;
            effects.hit(style === "drops" ? "drop" : "popit", got);
            g.sparkle(x, tubY - 14, 12);
            g.say("キャッチ！ " + got + " / " + goal, got / goal);
            if (got === goal) {
              g.clear("全部キャッチできた！");
              break;
            }
          }
        }
      }
      drops = drops.filter(d => d.y < 417);
    },
    draw(c) {
      const [,shade,accent,dark] = g.colors;
      slab(c, 90, 51, 540, 309, style === "drops" ? "#d7edf6" : "#fff7e6");
      for (const d of drops) glyph(c, style === "popcorn" ? "✿" : icon, d.x, d.y, 35);
      const bowl = c.createLinearGradient(0, tubY, 0, tubY + 48);
      bowl.addColorStop(0, shade);
      bowl.addColorStop(1, accent);
      round(c, x - 66, tubY, 132, 45, 18, bowl, "#fff8", 3);
      line(c, [{x: x - 61,y: tubY + 5}, {x: x + 61,y: tubY + 5}], "#faf4f0", 8);
      glyph(c, g.game.icon, 360, 102, 54);
      word(c, got + " / " + goal, 360, 383, 23, dark);
    }
  };
};

scenes.sort = (g, [style, items, labels, marks]) => {
  const order = shuffle(items.map((_, i) => i));
  const src = choices(items.length, 295, 150, 570);
  const dst = choices(items.length, 153, 150, 570);
  const placed = new Set();
  const loose = style === "sweep";
  let selected = -1;
  let cursor = null;
  let dragging = false;
  const sourceButtons = [];
  const slotButtons = [];
  const idAt = (p, list, width, height) => list.findIndex(q => within(p, q.x, q.y, width, height));
  function choose(id) {
    if (placed.has(id)) return;
    selected = id;
    sourceButtons.forEach((button, i) => {
      button.setAttribute("aria-pressed", String(i === selected));
    });
    g.say("「" + items[id] + "」の行き先を選ぼう。", placed.size / items.length);
  }
  function place(slot) {
    if (selected < 0 || slot < 0) return;
    if (!loose && slot !== selected) {
      g.say("形や印をよく見て、もう一か所試してみよう。", placed.size / items.length);
      return;
    }
    placed.add(selected);
    sourceButtons[selected].disabled = true;
    if (!loose) slotButtons[selected].disabled = true;
    sourceButtons[selected].setAttribute("aria-pressed", "false");
    g.sparkle(dst[selected].x, dst[selected].y, 12);
    effects.hit(style, selected);
    selected = -1;
    g.say("ぴたりとはまった！ " + placed.size + " / " + items.length, placed.size / items.length);
    if (placed.size === items.length) g.clear("きれいにそろった！");
  }
  items.forEach((item, i) => {
    sourceButtons.push(g.button(item + (loose ? " " + (i + 1) : ""), () => choose(i)));
  });
  labels.forEach((label, i) => {
    if (!loose || i === 0) slotButtons.push(g.button(label + "へ", () => place(i), true));
  });
  g.say("下のものを選んで、上の入れ物へ。", 0);
  return {
    down(p) {
      const sourceIndex = idAt(p, src, 126, 81);
      if (sourceIndex >= 0 && !placed.has(order[sourceIndex])) {
        choose(order[sourceIndex]);
        dragging = true;
        cursor = p;
      } else {
        place(idAt(p, dst, 132, 108));
      }
    },
    move(p) { if (dragging) cursor = p; },
    up(p) {
      if (dragging) place(idAt(p, dst, 132, 108));
      dragging = false;
      cursor = null;
    },
    cancel() { dragging = false; cursor = null; },
    draw(c) {
      const [base,shade,accent,dark] = g.colors;
      slab(c, 76, 69, 568, 285, style === "pond" ? "#d4eef6" : "#fffaf0");
      dst.forEach((p, i) => {
        if (style === "pond") circle(c, p.x, p.y, 48, "#c7e7ef", paints[i], 9);
        else round(c, p.x - 62, p.y - 47, 124, 95, 17, placed.has(i) ? "#eaf5de" : base, shade, 2);
        const ink = placed.has(i) ? "#4d7d60" : dark;
        word(c, placed.has(i) ? "✓" : (marks?.[i] ?? labels[i]), p.x, p.y - 15, 20, ink);
        glyph(c, placed.has(i) ? items[i] : "", p.x, p.y + 15, 30);
      });
      word(c, "↑", 360, 226, 30, dark);
      src.forEach((p, at) => {
        const id = order[at];
        if (placed.has(id) || (dragging && id === selected)) return;
        round(c, p.x - 58, p.y - 34, 116, 68, 17, selected === id ? shade : "#fffcf2", shade, 2.5);
        glyph(c, marks ? items[id] + " " + marks[id] : items[id], p.x, p.y, Array.from(items[id]).length >= 3 ? 22 : 33);
      });
      if (cursor && selected >= 0) {
        round(c, cursor.x - 53, cursor.y - 32, 106, 64, 15, "#fffdf4", accent, 3);
        glyph(c, marks ? items[selected] + " " + marks[selected] : items[selected], cursor.x, cursor.y, 28);
      }
    }
  };
};

scenes.find = (g, [style, target, items, answers]) => {
  const pos = sketchGrid(4, 2, 120, 117, 480, 208);
  const found = new Set();
  const controls = [];
  function choose(i) {
    if (i < 0 || found.has(i)) return;
    if (!answers.includes(i)) {
      g.say("探すものは「" + target + "」。", found.size / answers.length);
      return;
    }
    found.add(i);
    controls[i].disabled = true;
    effects.hit(style, i);
    g.sparkle(pos[i].x, pos[i].y, 9);
    g.say("見つけた！ " + found.size + " / " + answers.length, found.size / answers.length);
    if (found.size === answers.length) g.clear("全部見つけた！");
  }
  items.forEach((icon, i) => controls.push(g.button((i + 1) + " " + icon, () => choose(i))));
  g.say("探すもの　" + target, 0);
  return {
    down(p) { choose(pos.findIndex(q => within(p, q.x, q.y, 103, 87))); },
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      const vessel = style === "soup" ? "#ecc38c" : style === "boba" ? "#dec098" :
        ["leaves","berries"].includes(style) ? "#d5e8ca" : "#fff8";
      slab(c, 97, 61, 526, 293, vessel);
      word(c, target, 360, 90, 25, dark);
      if (style === "soup" || style === "boba") round(c, 118, 116, 484, 201, 70, vessel, "#fff7", 6);
      pos.forEach((p, i) => {
        if (found.has(i)) {
          circle(c, p.x, p.y, 21, "#fff6");
          word(c, "✓", p.x, p.y, 23, accent);
          return;
        }
        const card = style === "notifications";
        const fill = card && items[i] === "♥" ? "#f6dbe7" : "#fff9";
        round(c, p.x - 43, p.y - 33, 86, 66, card ? 11 : 25, fill, "#fff8", 2);
        glyph(c, items[i], p.x, p.y - 3, 41);
        word(c, String(i + 1), p.x + 29, p.y + 21, 12, dark);
      });
      if (g.finished) word(c, "✓", 360, 381, 29, shade);
    }
  };
};

scenes.pairs = (g, [style, patterns]) => {
  const items = shuffle(patterns.flatMap((_, i) => [i, i]));
  const pos = sketchGrid(4, 2, 97, 79, 526, 256);
  const paired = new Set();
  let last = -1;
  let previous = [];
  let flashUntil = 0;
  const marks = ["▥", "⠿", "★", "✿"];
  const labels = [];
  function choose(i) {
    if (i < 0 || paired.has(i)) return;
    if (last === i) { last = -1; return; }
    if (last < 0) {
      last = i;
      g.say("「" + patterns[items[i]] + "」と同じ柄を探そう。", paired.size / items.length);
      effects.hit(style, i);
      return;
    }
    if (items[last] === items[i]) {
      for (const k of [last, i]) {
        paired.add(k);
        labels[k].disabled = true;
        g.sparkle(pos[k].x, pos[k].y, 10);
      }
      effects.hit("notes", paired.size / 2);
      g.say("そろった柄　" + paired.size / 2 + " / " + patterns.length, paired.size / items.length);
      if (paired.size === items.length) g.clear("靴下が全部ペアになった！");
    } else {
      previous = [last, i];
      flashUntil = g.now + .38;
      g.say("違う柄だったよ。もう一組探そう。");
    }
    last = -1;
  }
  items.forEach((p, i) => labels.push(g.button((i + 1) + " " + patterns[p], () => choose(i))));
  g.say("同じ柄の2枚を選ぼう。", 0);
  return {
    motion: true,
    down(p) { choose(pos.findIndex(q => within(p, q.x, q.y, q.dx - 8, q.dy - 8))); },
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      slab(c, 75, 59, 570, 293, "#fbf1e6");
      items.forEach((id, i) => {
        const p = pos[i];
        const color = paints[id];
        const active = last === i;
        const miss = g.now < flashUntil && previous.includes(i);
        round(c, p.x - 50, p.y - 49, 100, 98, 15, paired.has(i) ? base : miss ? "#f3d7d6" : "#fffdfa", active ? accent : shade, active ? 4 : 2);
        glyph(c, paired.has(i) ? "✓" : "🧦", p.x, p.y - 11, 41);
        word(c, marks[id] + "  " + patterns[id], p.x, p.y + 26, 16, dark);
        circle(c, p.x - 30, p.y - 29, 7, color);
      });
    }
  };
};

scenes.brush = (g, [style, prize, quota]) => {
  const m = 11, n = 6;
  const pts = sketchGrid(m, n, 109, 87, 502, 241);
  const active = new Set();
  let last = null;
  let marks = 0;
  const required = Math.ceil(pts.length * quota);
  const brushRadius = ["carwash", "window", "frost"].includes(style) ? 53 : 47;
  function paint(p) {
    if (g.finished) return;
    last = p;
    const before = active.size;
    pts.forEach((q, i) => {
      if (length(p, q) <= brushRadius) active.add(i);
    });
    if (before === active.size) return;
    if (marks++ % 3 === 0) {
      effects.hit(style === "lint" ? "bag" : style === "foam" ? "bubble" : "cloth", marks);
      g.sparkle(p.x, p.y, 5);
    }
    g.say("できたところ　" + Math.min(100, Math.floor(active.size * 100 / required)) + "%", active.size / required);
    if (active.size >= required) {
      g.clear(style === "foam" ? "もこもこの泡ができた！" :
        style === "ink" ? "インクの花が咲いた！" : "すっきり、できあがり！");
    }
  }
  function next() {
    const i = pts.findIndex((_, k) => !active.has(k));
    if (i >= 0) paint(pts[i]);
  }
  g.button("少しずつなぞる", next);
  g.say("指を滑らせていろんなところをなぞろう。", 0);
  return {
    down: paint,
    move(p, prev) { sample(prev, p, 16).forEach(paint); },
    up() { last = null; },
    cancel() { last = null; },
    key(k) { if (k === " " || k === "Enter") next(); },
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      slab(c, 85, 59, 550, 292);
      const erasing = ["carwash", "window", "frost", "lint", "leaf", "plush", "magnet"].includes(style);
      const tint = style === "toast" ? "#cf985c" : style === "soil" ? "#b79577" :
        style === "window" ? "#abd3e8" : style === "foam" ? "#d9e8ee" : base;
      round(c, 109, 87, 502, 241, 21, tint, shade, 2);
      c.save();
      round(c, 110, 88, 500, 239, 19);
      c.clip();
      if (style === "window") {
        circle(c, 490, 134, 41, "#fff2bd");
        circle(c, 204, 385, 141, "#85b8a0");
        circle(c, 521, 386, 133, "#69a791");
        glyph(c, "🏡", 360, 233, 118);
      } else if (style === "leaf") {
        glyph(c, "🍃", 360, 210, 214);
        line(c, [{x:281,y:262},{x:430,y:142}], "#fff6", 3);
      } else if (erasing) {
        glyph(c, prize, 360, 202, style === "magnet" ? 81 : 156);
      }
      pts.forEach((p, i) => {
        const done = active.has(i) || g.finished;
        if (erasing && !done) {
          c.fillStyle = style === "lint" ? "#cfb07bba" : "#dbe6eddf";
          c.fillRect(p.x - p.dx / 2, p.y - p.dy / 2, p.dx + 1, p.dy + 1);
          if (style === "magnet") glyph(c, "📎", p.x, p.y, 24);
          else if (style === "lint") {
            line(c, [{x:p.x - 10,y:p.y - 5},{x:p.x + 15,y:p.y + 8}], "#795e5c79", 2.5);
          } else if (style === "carwash") {
            for (let j = 0; j < 3; j++) circle(c, p.x + (j - 1) * 13, p.y + (i % 3 - 1) * 7, 12 - j, "#fff9");
          } else circle(c, p.x + (i % 3 - 1) * 9, p.y - 7, 4 + i % 3, "#fff7");
        } else if (!erasing && done) {
          if (style === "foam") {
            marble(c, p.x, p.y, 14 + i % 4, "#edf7fb", true);
            marble(c, p.x - 12, p.y + 7, 10, "#d4e7ee", true);
          } else {
            const fill = style === "toast" ? "#ffe69cbe" : style === "soil" ? "#806044ba" : paints[i % paints.length] + "ce";
            circle(c, p.x, p.y, style === "ink" ? 27 : 35, fill);
          }
        } else if (!erasing) circle(c, p.x, p.y, 3.2, shade);
      });
      if (style === "window") line(c, [{x:360,y:87},{x:360,y:327}], "#fff8", 8);
      c.restore();
      if (last && !g.finished) {
        circle(c, last.x, last.y, brushRadius * .59, "#fff2", "#fff", 2.5);
      }
      if (g.finished && !erasing) glyph(c, prize, 360, 201, 83);
      word(c, g.finished ? "✓" : Math.min(100, Math.floor(active.size / required * 100)) + "%", 360, 380, 24, dark);
    }
  };
};

scenes.design = (g, [style, options, goal, cols, rows]) => {
  const pts = sketchGrid(cols, rows, 126, 91, 468, 232);
  const pieces = new Map();
  let active = 0;
  const selectors = [];
  function select(i) {
    active = i;
    selectors.forEach((button, k) => button.setAttribute("aria-pressed", String(k === i)));
    effects.hit(style, i);
  }
  function allowed(index, value) {
    if (style !== "glass") return true;
    const neighbors = [index - cols, index + cols];
    if (index % cols > 0) neighbors.push(index - 1);
    if (index % cols < cols - 1) neighbors.push(index + 1);
    return neighbors.every(i => pieces.get(i) !== value);
  }
  function put(i) {
    if (i < 0 || g.finished || pieces.get(i) === active) return;
    if (!allowed(i, active)) {
      g.say("隣と違う色を選んでみよう。", pieces.size / goal);
      return;
    }
    pieces.set(i, active);
    effects.hit(style, active);
    g.sparkle(pts[i].x, pts[i].y, 8);
    g.say("置いた数　" + pieces.size + " / " + goal, pieces.size / goal);
    if (pieces.size === goal) {
      const message = {sand: "波が来たら、また描けるよ。", seeds: "小さな芽が出た！", glass: "窓に光が差した！"};
      g.clear(message[style] ?? "できあがり！");
    }
  }
  options.forEach((symbol, i) => {
    const label = style === "pebbles" ? ["むらさき", "もも色", "みどり"][i] :
      style === "glass" ? ["むらさき ●", "もも色 ▲", "みどり ■", "黄色 ◆"][i] : symbol;
    selectors.push(g.button(label, () => select(i)));
  });
  selectors.forEach((el, k) => el.setAttribute("aria-pressed", String(k === 0)));
  g.button("置く", () => put(pts.findIndex((_, k) => !pieces.has(k) && allowed(k, active))), true);
  g.say("形や色を選んで、好きな場所に置こう。", 0);
  function at(p) { put(pts.findIndex(q => within(p, q.x, q.y, q.dx - 2, q.dy - 2))); }
  return {
    down: at,
    draw(c) {
      const [base, shade, accent, dark] = g.colors;
      const ground = ["sand", "cookie"].includes(style) ? "#e8c990" :
        ["seeds", "pebbles"].includes(style) ? "#cea883" : style === "glass" ? "#675582" : "#fff8";
      slab(c, 102, 65, 516, 286, ground);
      pts.forEach((p, i) => {
        const has = pieces.has(i);
        const brush = pieces.get(i);
        const symbol = options[brush];
        if (style === "glass") {
          round(c, p.x - p.dx / 2 + 3, p.y - p.dy / 2 + 3, p.dx - 6, p.dy - 6,
            8, has ? paints[brush] : "#ede3f1");
          if (has) word(c, symbol, p.x, p.y, 23, "#47314a");
        } else if (has) {
          if (style === "pebbles") marble(c, p.x, p.y, Math.min(p.dx, p.dy) * .33, paints[brush]);
          else if (style === "seeds" && !g.finished) circle(c, p.x, p.y, 7, "#795c40");
          else glyph(c, symbol, p.x, p.y, Math.min(p.dx, p.dy) * .55);
        } else circle(c, p.x, p.y, 3.5, style === "snowflake" ? "#9484b4" : "#72563865");
      });
      if (g.finished && style === "snowflake") {
        for (const [i, brush] of pieces) {
          const p = pts[i];
          glyph(c, options[brush], W - p.x + 3, H - p.y + 4, 28);
        }
      } else if (g.finished && style === "sand") {
        c.save();
        c.globalAlpha = reduceMotion ? .50 : .63;
        circle(c, 360, 590, 310, "#d6e9e7", "#fff8", 5);
        c.restore();
      }
      if (!g.finished) {
        chip(c, options[active], 360, 385, paints[active], false, 82);
      } else word(c, "✓", 360, 384, 31, accent);
    }
  };
};

scenes.align = (g, [style, positions, label]) => {
  let index = 0;
  let a = .31, b = .68;
  const targets = positions.map(([x, y]) => ({x: x * W, y: y * H}));
  const xSlide = g.range("左右", a, value => { a = lerp(.15, .85, value); });
  const ySlide = g.range("上下", b, value => { b = lerp(.22, .78, value); });
  function set(x, y) {
    a = clamp(x / W, .15, .85);
    b = clamp(y / H, .22, .78);
    xSlide.value = Math.round((a - .15) / .70 * 100);
    ySlide.value = Math.round((b - .22) / .56 * 100);
  }
  set(a * W, b * H);
  function ready() {
    const p = targets[Math.min(index, targets.length - 1)];
    return length(p, {x: a * W, y: b * H}) < (style === "needle" ? 33 : 44);
  }
  function apply() {
    if (!ready()) {
      g.say("まだ少しずれとるよ。点線の真ん中へ。", index / targets.length);
      return;
    }
    const p = targets[index];
    set(p.x, p.y);
    g.sparkle(p.x, p.y, 18);
    effects.hit(style === "gate" ? "notes" : style, index);
    index++;
    g.say("ぴったり！ " + index + " / " + targets.length, index / targets.length);
    if (index === targets.length) g.clear("ぴったり！");
  }
  g.button(label, apply, true);
  g.say("動かして、点線の真ん中に合わせよう。", 0);
  return {
    down(p) { set(p.x, p.y); },
    move(p) { set(p.x, p.y); },
    key(k) {
      if (k === "ArrowLeft") set(a * W - 14, b * H);
      if (k === "ArrowRight") set(a * W + 14, b * H);
      if (k === "ArrowUp") set(a * W, b * H - 14);
      if (k === "ArrowDown") set(a * W, b * H + 14);
      if (k === " " || k === "Enter") apply();
    },
    draw(c) {
      const [base,shade,accent,dark] = g.colors;
      const p = targets[Math.min(index, targets.length - 1)];
      slab(c, 89, 63, 542, 288, style === "parking" ? "#77788f" : "#fffc");
      if (style === "sunpot") {
        for (let r = 61; r >= 20; r -= 14) circle(c, p.x, p.y, r, "#f8db8b4f");
      } else if (style === "parking") {
        const border = "#fff9";
        line(c, [{x:p.x - 49,y:p.y - 78},{x:p.x - 49,y:p.y + 78}], border, 5);
        line(c, [{x:p.x + 49,y:p.y - 78},{x:p.x + 49,y:p.y + 78}], border, 5);
      } else if (style === "sponge") {
        glyph(c, "⚙️", p.x, p.y + 62, 54);
        line(c, [{x:a * W,y:b * H},{x:a * W,y:b * H + 80}], "#6aa8d67a", 5, true);
      } else if (style === "needle") {
        line(c, [{x:p.x,y:p.y},{x:p.x + 124,y:p.y - 72}], "#ad9dbb", 8);
        line(c, [{x:a * W,y:b * H},{x:a * W - 74,y:b * H + 25}], "#de91ad", 5);
      }
      c.save();
      c.setLineDash([6, 7]);
      circle(c, p.x, p.y, 48, ready() ? "#bce7d17a" : "#fff7", ready() ? "#53866b" : accent, 3);
      c.restore();
      if (!g.finished && !ready()) word(c, "+", p.x, p.y, 26, accent);
      for (const placed of targets.slice(0, index)) {
        circle(c, placed.x, placed.y, 11, "#b8e5cb", "#fff9", 2);
      }
      const position = {x: a * W, y: b * H};
      c.fillStyle = "#4d3a6133";
      c.beginPath();
      c.ellipse(position.x, position.y + 30, 40, 11, 0, 0, 2 * Math.PI);
      c.fill();
      glyph(c, g.game.icon, position.x, position.y, 66);
      if (ready()) chip(c, g.finished ? "✓" : "いい位置", 360, 382, dark, true, 130);
      else word(c, label, 360, 381, 23, dark);
    }
  };
};

scenes.merge = (g, [style, count, icon]) => {
  const parts = sketchGrid(3, 3, 150, 85, 420, 245).slice(0, count)
    .map((p, i) => ({id: i, x: p.x + (i % 2 ? -17 : 14), y: p.y, mass: 1}));
  const size = part => 19 + 9 * Math.sqrt(part.mass);
  let grabbed = null;
  function merge(a, b) {
    a.x = (a.x * a.mass + b.x * b.mass) / (a.mass + b.mass);
    a.y = (a.y * a.mass + b.y * b.mass) / (a.mass + b.mass);
    a.mass += b.mass;
    parts.splice(parts.indexOf(b), 1);
    g.sparkle(a.x, a.y, 13);
    effects.hit(style, parts.length);
    const amount = (count - parts.length) / (count - 1);
    g.say("残り　" + parts.length + " つ", amount);
    if (parts.length === 1) g.clear(style === "drop" ? "大きな一粒になった！" : "一本につながった！");
  }
  const assist = () => { if (parts.length > 1) merge(parts[0], parts[1]); };
  g.button("ひとつ寄せる", assist);
  g.say("つまんで近くの粒へ寄せよう。残り " + count + " つ。", 0);
  function move(p) {
    if (!grabbed) return;
    grabbed.x = clamp(p.x, 125, 595);
    grabbed.y = clamp(p.y, 95, 326);
    const match = parts.find(q => q !== grabbed && length(q, grabbed) < size(q) + size(grabbed) - 4);
    if (match) merge(grabbed, match);
  }
  return {
    down(p) { grabbed = parts.find(q => length(p, q) <= size(q) + 14) ?? null; },
    move,
    up(p) { move(p); grabbed = null; },
    cancel() { grabbed = null; },
    draw(c) {
      const [base,shade,accent] = g.colors;
      slab(c, 94, 62, 532, 292, style === "drop" ? "#cbe5f6" : "#f7ead5");
      for (const part of parts) {
        const r = size(part);
        if (style === "drop") marble(c, part.x, part.y, r, "#66acd1");
        else {
          round(c, part.x - r - part.mass * 4, part.y - 9, (r + part.mass * 4) * 2, 18, 9, "#737486", "#adaaba", 2);
          for (let i = 0; i < part.mass; i++) circle(c, part.x + (i - (part.mass - 1) / 2) * 11, part.y - 2, 3, "#fff8");
        }
        if (part === grabbed && !g.finished) circle(c, part.x, part.y, r + 6, null, "#fff9", 3);
      }
      if (g.finished) glyph(c, icon, 360, 384, 37);
      else word(c, String(parts.length), 360, 380, 23, accent);
    }
  };
};

scenes.sound = (g, [style, names, type]) => {
  const loop = type === "loop";
  const mix = type === "mix";
  const notes = [];
  const volumes = names.map(() => 0);
  const positions = choices(names.length, 202, 172, 548);
  const lamps = names.map(() => 0);
  let playAt = 0;
  let playIndex = 0;
  let playing = false;
  const styles = {
    drum: ["calc", "coins", "cloth"], steps: ["drop", "bubble", "popit"],
    chime: ["notes","chime","coins"]
  };
  function note(i) {
    effects.hit(styles[style]?.[i] ?? style, i);
    lamps[i] = g.now + .28;
    g.sparkle(positions[i].x, 186, 7);
  }
  function record(i) {
    if (playing || notes.length === 12) return;
    const at = notes.length === 0 ? 0 : notes.at(-1).at + clamp(g.now - notes.at(-1).wall, .11, .68);
    notes.push({i, at, wall: g.now});
    note(i);
    g.say("録った音　" + notes.length + " つ", notes.length / 4);
    finish.disabled = notes.length < 4;
  }
  function change(i, amount) {
    volumes[i] = amount;
    if (style === "chime") {
      effects.tone([622, 835, 1047][i], .52, Math.max(.002, amount * .12), 0, "sine", [622, 835, 1047][i]);
      lamps[i] = g.now + .43;
    } else {
      effects.mix(style, volumes);
    }
    const set = volumes.filter(n => n > .07).length;
    finish.disabled = set === 0;
    g.say(set ? "鳴っている音　" + set + " 種類" : "音量を上げて試そう。", set / names.length);
  }
  function listen() {
    if (playing) {
      playing = false;
      replay.textContent = "リズムを再生";
    } else if (notes.length) {
      playAt = g.now;
      playIndex = 0;
      playing = true;
      replay.textContent = "再生を止める";
    }
  }
  function complete() {
    if (loop && notes.length < 4) return;
    if (mix && volumes.every(v => v <= .07)) return;
    g.clear(loop ? "リズムができた！「リズムを再生」で聴けるよ。" : "好きな音ができた！");
    if (loop) replay.disabled = false;
  }
  const sliders = [];
  if (loop) names.forEach((name, i) => g.button(name, () => record(i)));
  else names.forEach((name, i) => sliders.push(g.range(name, 0, value => change(i, value))));
  const finish = g.button(loop ? "このリズムで完成" : "この音で完成", complete, true);
  finish.disabled = true;
  const replay = loop ? g.button("リズムを再生", listen) : null;
  if (replay) {
    replay.dataset.afterClear = "yes";
    replay.disabled = true;
  }
  g.say(loop ? "好きな間隔で、4つ以上音を鳴らしてみよう。" : "音量を上げて、好きな音を重ねよう。", 0);
  return {
    motion: true,
    suspend() {
      playing = false;
      if (replay) replay.textContent = "リズムを再生";
    },
    soundChange(on) {
      if (on && mix && style !== "chime") effects.mix(style, volumes);
    },
    down(p) {
      const i = positions.findIndex(q => within(p, q.x, q.y, 144, 220));
      if (i < 0) return;
      if (loop) record(i);
      else {
        const value = style === "chime" ? .65 : clamp((293 - p.y) / 193);
        sliders[i].value = Math.round(value * 100);
        change(i, value);
      }
    },
    update() {
      if (!playing) return;
      const elapsed = g.now - playAt;
      if (playIndex < notes.length && elapsed >= notes[playIndex].at) note(notes[playIndex++].i);
      if (playIndex >= notes.length && elapsed > notes.at(-1).at + .65) {
        playIndex = 0;
        playAt = g.now;
      }
    },
    draw(c) {
      const [base,shade,accent,dark] = g.colors;
      slab(c, 82, 61, 556, 293);
      positions.forEach((p, i) => {
        const on = g.now < lamps[i];
        const color = paints[i + 2];
        round(c, p.x - 64, 105, 128, 200, 23, on ? color : base, shade, 2);
        if (loop) {
          marble(c, p.x, 190, on ? 35 : 40, color);
          word(c, "♪", p.x, 192, 37, dark);
        } else {
          round(c, p.x - 13, 130, 26, 112, 10, "#fff9", shade, 1.5);
          round(c, p.x - 12, 242 - Math.max(3, volumes[i] * 111), 24, Math.max(3, volumes[i] * 111), 9, color);
        }
        word(c, names[i], p.x, 272, 22, dark);
      });
      if (loop) notes.forEach(({i}, n) => circle(c, 360 + (n - (notes.length - 1) / 2) * 25, 383, 7, paints[i + 2]));
      else word(c, g.finished ? "✓" : "♪", 360, 383, 24, accent);
    }
  };
};

scenes.camera = (g, [style, targets]) => {
  let index = 0;
  const frame = {x: 360, y: 219};
  const saves = [];
  const point = () => ({
    x: (!index ? 278 : 448) + (reduceMotion || g.finished ? 0 : Math.sin(g.now * .55) * 65),
    y: 176 + (index % 2 ? 25 : -13)
  });
  function move(p) {
    frame.x = clamp(p.x, 150, 570);
    frame.y = clamp(p.y, 109, 293);
  }
  function capture() {
    if (length(frame, point()) >= 65) {
      g.say("雲の形をカメラ枠の真ん中に入れよう。", index / targets.length);
      return;
    }
    saves.push(targets[index]);
    g.sparkle(frame.x, frame.y, 22);
    effects.hit("camera");
    index++;
    g.say("撮れた！ " + index + " / " + targets.length, index / targets.length);
    if (index === targets.length) g.clear("雲の写真がそろった！");
  }
  g.button("シャッター", capture, true);
  g.say("画面をなぞって、カメラの枠を動かそう。", 0);
  return {
    motion: true,
    down: move,
    move,
    key(k) {
      if (k === "ArrowLeft") move({x: frame.x - 16, y: frame.y});
      if (k === "ArrowRight") move({x: frame.x + 16, y: frame.y});
      if (k === "ArrowUp") move({x: frame.x, y: frame.y - 16});
      if (k === "ArrowDown") move({x: frame.x, y: frame.y + 16});
      if (k === " " || k === "Enter") capture();
    },
    draw(c) {
      const [,shade,accent,dark] = g.colors;
      slab(c, 83, 59, 554, 287, "#a9d1e7", "#eff9ff");
      circle(c, 535, 128, 44, "#fff4bf");
      glyph(c, "☁️", 151, 120, 76);
      glyph(c, "☁️", 560, 228, 85);
      const p = point();
      if (!g.finished) {
        circle(c, p.x - 33, p.y + 5, 25, "#fff9");
        circle(c, p.x + 30, p.y + 10, 29, "#fff9");
        circle(c, p.x, p.y - 8, 35, "#fff9");
        glyph(c, targets[index], p.x, p.y, 50);
        c.save();
        c.setLineDash([16, 8]);
        round(c, frame.x - 68, frame.y - 51, 136, 102, 15, null,
          length(frame, p) < 65 ? "#ffed95" : "#fff", 5);
        c.restore();
        word(c, "+", frame.x, frame.y, 18, dark);
      }
      saves.forEach((emoji, i) => {
        const x = 360 + (i - (saves.length - 1) / 2) * 91;
        round(c, x - 36, 307, 72, 86, 9, "#fffaf3", shade, 2);
        round(c, x - 29, 313, 58, 58, 5, "#c2e1ed");
        glyph(c, emoji, x, 341, 34);
      });
      if (!saves.length) word(c, "シャッター", 360, 378, 22, accent);
    }
  };
};
