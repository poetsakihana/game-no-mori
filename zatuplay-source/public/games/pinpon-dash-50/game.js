"use strict";

const districts = [
  ["夕焼け通り", "#a387f1"], ["月明かりの小道", "#7e9df3"],
  ["ランタン横丁", "#ff9c8d"], ["銀杏通り", "#c8b177"],
  ["星見ヶ丘", "#afa2ee"], ["真夜中の住宅街", "#8ab6dc"],
  ["運河沿い", "#62b6b4"], ["風見町", "#ba93bf"],
  ["明けの明星通り", "#f3a597"], ["夜明け前の坂道", "#d3a0e4"]
];

const layouts = [
  [128, 400, 672, 128, 400, 672],
  [145, 365, 650, 118, 433, 684],
  [112, 362, 640, 162, 400, 673],
  [156, 420, 686, 113, 366, 621],
  [116, 416, 671, 147, 382, 645]
];

const stages = districts.flatMap(([district, tint], districtIndex) =>
  layouts.map((_, block) => {
    const index = districtIndex * layouts.length + block;
    const vacant = (3 + index * 5 + Math.floor(index / 6)) % 6;
    return {
      name: `${district} ${block + 1}区画`,
      tint,
      layout: layouts[(block + districtIndex) % layouts.length],
      goal: 1 + Math.floor(index / 9),
      vacant: index < 18 ? [vacant, (vacant + 2) % 6] : [vacant],
      exit: index < 25 ? "both" : index % 2 === 0 ? "right" : "left",
      reaction: 2.15 - index * .026,
      chasePace: 132 + index * 1.5,
      chaseDuration: 4.8 + index * .053,
      dashCost: 29 + index * .1,
      dashRecovery: 24 - index * .13
    };
  })
);

const width = 800;
const height = 520;
const mid = 260;
const colors = [
  ["#ad7185", "#d49e8c", "#ffd8a1"],
  ["#776ba7", "#b09bbf", "#ffe7b9"],
  ["#548a98", "#99b9ac", "#ffda8c"],
  ["#8174ac", "#b2a7c4", "#f4c395"],
  ["#a86c76", "#c08d8b", "#ffd5a1"],
  ["#597f9e", "#89a5b7", "#ffe2a1"]
];

const ids = [
  "map", "sound", "pause", "stage-number", "stage-name", "goal", "veil",
  "panel-kicker", "panel-title", "panel-text", "seats", "results",
  "main-action", "menu-action", "game-status", "stamina", "runner", "alive",
  "total", "rings", "houses", "speed", "top-speed", "breaks", "door-name",
  "damage-number", "damage", "door-note", "ring"
];
const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const ctx = ui.map.getContext("2d");
const keys = new Set();
const held = new Map();
const min = Math.min;
const max = Math.max;
const clamp = (number, low, high) => max(low, min(high, number));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

let mode = "title";
let partySize = 1;
let stageIndex = 0;
let turn = 0;
let team = [];
let stageStartTeam = [];
let houses = [];
let player;
let stageVisits = 0;
let nextRing = 0;
let message = "";
let messageUntil = 0;
let time = 0;
let visualTime = 0;
let sound = false;
let audio;
let particles = [];

function makeHouses() {
  const stage = stages[stageIndex];
  return stage.layout.map((x, index) => {
    const top = index < 3;
    return {
      x, y: top ? 168 : 352, index, top, buildingY: top ? 35 : 372,
      damage: 0, alert: 0, pursuit: null, flash: 0,
      vacant: stage.vacant.includes(index)
    };
  });
}

function setText(id, value) {
  if (ui[id].textContent !== String(value)) ui[id].textContent = value;
}

function signal(text, seconds = 1.6) {
  message = text;
  messageUntil = time + seconds;
}

function clearControls() {
  keys.clear();
  held.clear();
}

function setupTurn() {
  houses = makeHouses();
  player = { x: 400, y: mid, stamina: 100, speed: 0, stride: 0, facing: 1 };
  stageVisits = 0;
  nextRing = 0;
  time = 0;
  message = "";
  messageUntil = 0;
  particles = [];
  clearControls();
}

function startRun() {
  if(PortSave.stopped)return;
  if(PortSave.data?.team.length){if(!confirm("新しいランを始めますか？現在の進行・クリア記録を置き換えます。変更前データを退避します。"))return;PortSave.preserve();}
  document.getElementById("resume-save").hidden = true;
  team = Array.from({ length: partySize }, (_, i) => ({
    id: i + 1, rings: 0, visited: 0, maxSpeed: 0, breaks: 0,
    cleared: 0, caught: false
  }));
  stageIndex = 0;
  startStage();
}

function startStage() {
  PortSave.write({version:1, partySize, stageIndex, team, sound});
  stageStartTeam = team.map(runner => ({ ...runner }));
  turn = team.findIndex(runner => !runner.caught);
  startTurn();
}

function retryStage() {
  team = stageStartTeam.map(runner => ({ ...runner }));
  startStage();
}

function startTurn() {
  setupTurn();
  mode = "playing";
  setPanel();
}

function surviving() {
  return team.filter(runner => !runner.caught).length;
}

function finishTurn(escaped) {
  clearControls();
  player.speed = 0;
  const runner = team[turn];
  if (escaped) runner.cleared++;
  else runner.caught = true;
  mode = escaped ? "escaped" : "caught";
  tone(escaped ? [523, 659, 784] : [220, 147, 110]);
  setPanel();
}

function advanceTurn() {
  const sameStage = team.findIndex((runner, index) => index > turn && !runner.caught);
  if (sameStage !== -1) {
    turn = sameStage;
    startTurn();
    return;
  }
  if (!surviving()) {
    mode = "results";
  } else if (stageIndex === stages.length - 1) {
    PortSave.write({version:1,partySize,stageIndex,team,sound,completed:true});
    document.getElementById("replay-ending").hidden=false;
    mode = "ending";
    tone([523, 659, 784, 880, 1047], .038);
  } else {
    stageIndex++;
    startStage();
    return;
  }
  setPanel();
}

function toTitle() {
  mode = "title";
  team = [];
  stageStartTeam = [];
  stageIndex = 0;
  turn = 0;
  setupTurn();
  setPanel();
}

function renderResults() {
  ui.results.replaceChildren();
  for (const runner of team) {
    const row = document.createElement("div");
    const name = document.createElement("strong");
    const record = document.createElement("span");
    row.className = "result-row";
    name.textContent = `P${runner.id}  ${runner.caught ? `ST ${runner.cleared + 1} で捕まった` : "全ステージ脱出"}`;
    record.textContent = `${runner.rings}回 / ${runner.visited}軒 / ${runner.maxSpeed} km/h`;
    row.append(name, record);
    ui.results.append(row);
  }
}

function setPanel() {
  const playing = mode === "playing";
  const nextPlayer = team.findIndex((runner, index) => index > turn && !runner.caught);
  const remaining = surviving();
  const panels = {
    title: [`全${stages.length}ステージ`, "何人、逃げ切れる？", "必要な軒数を回って、開いた出口へ。呼び鈴を鳴らしても、誰も出てこない家があるよ。", "ゲームスタート"],
    paused: ["一時停止", "ひと休み", "その場から再開できるよ。", "ゲームに戻る"],
    escaped: [`PLAYER ${turn + 1}`, "逃げ切った！", `生き残り ${surviving()} / ${team.length}人`, "次へ"],
    caught: [`PLAYER ${turn + 1}`, "捕まった！", `生き残り ${surviving()} / ${team.length}人`, "次へ"],
    ending: [`全${stages.length}ステージクリア`, "夜明けのチャイム", `空が白み、追いかけっこの足音が消えた。最後まで走り抜けた${remaining}人は、朝焼けの向こうへ帰っていった。`, "記録を見る"],
    results: ["リザルト", `生き残り ${remaining} / ${team.length}人`, "プレイヤーごとの記録", remaining ? "もう一度" : "このステージを再挑戦"]
  };

  ui.veil.hidden = playing;
  ui.veil.dataset.mode = mode;
  ui.pause.disabled = !playing && mode !== "paused";
  setText("pause", mode === "paused" ? "再開" : "一時停止");
  ui.seats.hidden = mode !== "title";
  ui.results.hidden = mode !== "results";
  ui["menu-action"].hidden = mode !== "paused" && mode !== "results";
  if (playing) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    return;
  }

  const [kicker, title, description, label] = panels[mode];
  let action = label;
  if (mode === "escaped" || mode === "caught") {
    if (nextPlayer !== -1) action = `PLAYER ${nextPlayer + 1} に交代`;
    else if (!remaining) action = "結果を見る";
    else if (stageIndex === stages.length - 1) action = "エンディングへ";
    else action = "次のステージへ";
  }
  setText("panel-kicker", kicker);
  setText("panel-title", title);
  setText("panel-text", description);
  ui["main-action"].textContent = action + " ↗";
  if (mode === "results") renderResults();
  if (mode !== "title") ui["main-action"].focus({ preventScroll: true });
}

function togglePause() {
  if (mode === "playing" || mode === "paused") {
    mode = mode === "playing" ? "paused" : "playing";
    clearControls();
    player.speed = 0;
    setPanel();
  }
}

function nearbyHouse(radius = 49) {
  let closest;
  let best = radius;
  for (const house of houses) {
    const gap = distance(player, house);
    if (gap < best) {
      best = gap;
      closest = house;
    }
  }
  return closest;
}

function unlockAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!sound || !Audio) return;
  audio ??= new Audio();
  if (audio.state === "suspended") audio.resume().catch(() => {});
}

function tone(notes, volume = .045) {
  if (!sound || !audio || audio.state !== "running") return;
  notes.forEach((frequency, index) => {
    const t = audio.currentTime + index * .095;
    const voice = audio.createOscillator();
    const gain = audio.createGain();
    voice.type = "triangle";
    voice.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, t + .15);
    voice.connect(gain).connect(audio.destination);
    voice.start(t);
    voice.stop(t + .16);
  });
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 22 + Math.random() * 65;
    particles.push({ x, y, color, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, life: .35 + Math.random() * .25 });
  }
}

function exitDirection(stage) {
  if (stage.exit === "both") return "左右どちらかの出口";
  return stage.exit === "left" ? "左の出口" : "右の出口";
}

function ring() {
  if (mode !== "playing" || time < nextRing) return;
  unlockAudio();
  const house = nearbyHouse();
  nextRing = time + .07;
  if (!house) {
    signal("家の前の呼び鈴に近づいてね。", .9);
    return;
  }
  if (house.damage === 100) {
    signal("この呼び鈴は壊れているよ。", .9);
    return;
  }

  const stage = stages[stageIndex];
  const runner = team[turn];
  const firstVisit = house.damage === 0;
  runner.rings++;
  if (firstVisit) {
    runner.visited++;
    stageVisits++;
  }
  house.damage = min(100, house.damage + 16);
  house.flash = .36;
  if (!house.vacant && !house.alert && !house.pursuit) house.alert = time + stage.reaction;
  if (house.damage === 100) {
    runner.breaks++;
    if (house.alert) house.alert = min(house.alert, time + .62);
    if (house.pursuit) {
      house.pursuit.angry = true;
      house.pursuit.end = max(house.pursuit.end, time + 5.3);
    }
    tone([196, 131], .07);
    burst(house.x, house.y, "#ff9ba9", 20);
    signal(house.vacant ? "呼び鈴が壊れた。留守のようだ。" : "呼び鈴が壊れた！ 家主がピコピコハンマーを取り出した！");
    return;
  }
  tone([740, 587]);
  burst(house.x, house.y, "#e7ff86", 5);
  if (firstVisit && stageVisits === stage.goal) {
    signal(`出口が開いた！ ${exitDirection(stage)}へ。`, 1.5);
  } else if (firstVisit && house.vacant) {
    signal("この家は留守のようだ。", 1.3);
  }
}

function blocked(x, y) {
  return houses.some(house => Math.abs(x - house.x) < 87 && y > house.buildingY - 11 && y < house.buildingY + 118);
}

function move(actor, dx, dy, edge = 12) {
  const x = clamp(actor.x + dx, edge, width - edge);
  const y = clamp(actor.y + dy, 15, height - 15);
  if (!blocked(x, actor.y)) actor.x = x;
  if (!blocked(actor.x, y)) actor.y = y;
}

const bindings = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  ShiftLeft: "dash", ShiftRight: "dash"
};
function isDown(action) {
  return [...keys].some(code => bindings[code] === action) || [...held.values()].includes(action);
}

function tick(dt) {
  time += dt;
  const dx = Number(isDown("right")) - Number(isDown("left"));
  const dy = Number(isDown("down")) - Number(isDown("up"));
  const length = Math.hypot(dx, dy);
  const stage = stages[stageIndex];
  const runner = team[turn];
  const sprinting = length > 0 && isDown("dash") && player.stamina > 0;
  if (sprinting) player.stamina = max(0, player.stamina - stage.dashCost * dt);
  else if (!isDown("dash")) player.stamina = min(100, player.stamina + stage.dashRecovery * dt);

  if (length) {
    const visitBonus = 6 * Math.log2(1 + runner.visited) + stageVisits * 3;
    const pace = 143 + visitBonus + (sprinting ? 102 : 0);
    const oldX = player.x;
    const oldY = player.y;
    move(player, dx / length * pace * dt, dy / length * pace * dt);
    const moved = Math.hypot(player.x - oldX, player.y - oldY);
    player.speed = Math.round(moved / dt * .19);
    player.stride += moved / 8;
    runner.maxSpeed = max(runner.maxSpeed, player.speed);
    if (dx) player.facing = dx;
    if (sprinting && Math.random() < dt * 21) burst(oldX - player.facing * 5, oldY + 8, "#c3a4ed", 1);
  } else {
    player.speed = 0;
  }

  const atOpenExit = (stage.exit !== "right" && player.x <= 25) ||
    (stage.exit !== "left" && player.x >= 775);
  if (stageVisits >= stage.goal && Math.abs(player.y - mid) < 35 && atOpenExit) {
    finishTurn(true);
    return;
  }

  for (const house of houses) {
    house.flash = max(0, house.flash - dt);
    if (house.alert && time >= house.alert) {
      const angry = house.damage === 100;
      house.alert = 0;
      house.pursuit = {
        x: house.x + (house.top ? 19 : -19),
        y: house.y + (house.top ? -8 : 8),
        end: time + stage.chaseDuration + (angry ? 1.2 : 0),
        facing: 1, stride: 0, angry
      };
      if (angry) tone([157, 185, 147], .06);
    }
    const chaser = house.pursuit;
    if (!chaser) continue;
    if (time >= chaser.end) {
      house.pursuit = null;
      continue;
    }
    const gap = distance(player, chaser);
    if (gap < (chaser.angry ? 18 : 15)) {
      burst(player.x, player.y, "#ff9ba9", 24);
      finishTurn(false);
      return;
    }
    const towardX = (player.x - chaser.x) / gap;
    const towardY = (player.y - chaser.y) / gap;
    const pace = stage.chasePace + (chaser.angry ? 72 : 0);
    move(chaser, towardX * pace * dt, towardY * pace * dt);
    chaser.facing = towardX < 0 ? -1 : 1;
    chaser.stride += pace * dt / 8;
  }
}

function updateHUD() {
  const stage = stages[stageIndex];
  const runner = team[turn];
  const house = nearbyHouse();
  const anyChase = houses.some(current => current.pursuit);
  const open = stageVisits >= stage.goal;
  setText("stage-number", `STAGE ${String(stageIndex + 1).padStart(2, "0")} / ${stages.length}`);
  setText("stage-name", stage.name);
  setText("goal", open ? `出口オープン · ${stageVisits}軒` : `目標 ${stageVisits} / ${stage.goal}軒`);
  setText("runner", `PLAYER ${turn + 1}`);
  setText("alive", team.length ? surviving() : partySize);
  setText("total", ` / ${partySize}人`);
  setText("rings", runner?.rings ?? 0);
  setText("houses", runner?.visited ?? 0);
  setText("speed", player.speed);
  setText("top-speed", runner?.maxSpeed ?? 0);
  setText("breaks", runner?.breaks ?? 0);
  ui.stamina.value = player.stamina;
  ui.damage.value = house?.damage ?? 0;
  setText("door-name", house ? `${house.index + 1}番地の破壊率` : "呼び鈴の破壊率");
  setText("damage-number", house ? `${house.damage}%` : "—");
  const notes = [];
  if (house?.vacant && house.damage > 0) notes.push("留守");
  if (house?.damage === 100) notes.push("破壊済み");
  setText("door-note", notes.join("・") || "同じ家に戻ってもダメージは残る。");
  let status = "青い呼び鈴に近づくと鳴らせるよ。";
  if (house?.damage < 100) status = "スペースキーか「ピンポン」で鳴らせるよ。";
  if (open) status = `${exitDirection(stage)}へ！`;
  if (anyChase) status = open ? `家主が追ってきた！ ${exitDirection(stage)}へ！` : "家主が追ってきた！ ダッシュで逃げよう。";
  if (messageUntil > time) status = message;
  setText("game-status", status);
}

function box(x, y, w, h, color, radius = 0) {
  ctx.fillStyle = color;
  if (!radius) ctx.fillRect(x, y, w, h);
  else {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  }
}

function oval(x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function shape(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fill();
}

function line(x1, y1, x2, y2, color, weight = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function label(text, x, y, color, size = 12) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ui-monospace, monospace`;
  ctx.fillText(text, x, y);
}

function tree(x, y, size, alternate) {
  oval(x + 3, y + 6, size + 5, size * .43, "#191b2e92");
  box(x - 2, y - 4, 4, 14, "#665266", 1);
  oval(x, y - size * .48, size, size * .86, alternate ? "#355e63" : "#3a5d64");
  oval(x - size * .24, y - size * .86, size * .68, size * .53, alternate ? "#507d74" : "#456d75");
  oval(x - size * .43, y - size * 1.05, size * .26, size * .14, "#a0aa795c");
}

function lamp(x, y, color) {
  const halo = ctx.createRadialGradient(x, y, 2, x, y, 29);
  halo.addColorStop(0, "#ffe5ac6b");
  halo.addColorStop(1, "#ffde8a00");
  oval(x, y, 29, 29, halo);
  oval(x + 3, y + 33, 9, 3, "#1b1d2c");
  line(x, y + 1, x, y + 31, "#8d8094", 3);
  box(x - 6, y - 3, 12, 7, color, 2);
}

function setting(stage) {
  box(0, 0, width, height, "#252639");
  const light = ctx.createRadialGradient(400, 110, 14, 400, 205, 500);
  light.addColorStop(0, stage.tint + "55");
  light.addColorStop(1, "#13172500");
  box(0, 0, width, height, light);

  for (let i = 0; i < 235; i++) {
    const x = (i * 79 + 13) % width;
    const y = (i * 61 + 47) % height;
    if (y > 199 && y < 322) continue;
    box(x, y, i % 3 + 1, 1, i % 4 ? "#ada3c427" : "#ffd79842");
  }
  box(0, 212, width, 96, "#3a3950");
  box(0, 222, width, 76, "#242738");
  box(0, 222, width, 3, "#505169");
  box(0, 295, width, 3, "#4a4b61");
  line(0, 212, width, 212, "#b395af65");
  line(0, 308, width, 308, "#121722");
  for (let x = 8; x < width; x += 35) {
    line(x, 217, x, 222, "#252637");
    line(x - 8, 298, x - 8, 308, "#29273a");
  }
  for (let x = 47; x < 745; x += 44) box(x, mid - 1, 19, 2, "#77748b65", 1);

  const plants = [
    [25, 60, 15], [30, 178, 18], [237, 45, 19], [256, 115, 16],
    [275, 155, 23], [520, 74, 20], [550, 143, 19], [775, 181, 17],
    [769, 52, 21], [38, 390, 23], [20, 478, 15], [238, 397, 23],
    [278, 472, 20], [522, 398, 20], [560, 472, 23], [773, 389, 20],
    [774, 491, 15]
  ];
  plants.forEach(([x, y, size], i) => tree(x, y, size, i % 2));
  lamp(70, 191, "#ffdfa9");
  lamp(320, 190, "#ffdfa9");
  lamp(580, 306, "#ffdfa9");
  lamp(743, 306, "#ffdfa9");
}

function drawHouse(house, nearest) {
  const { x, y, index, top, buildingY } = house;
  const [roof, wall, windowLight] = colors[index];
  const knownVacant = house.vacant && house.damage > 0;
  const pathY = top ? y : 308;
  box(x - 22, pathY, 44, top ? 44 : y - 308 + 26, "#8b809b6b", 3);
  for (let row = pathY + 10; row < (top ? 210 : y + 21); row += 11) {
    line(x - 20, row, x + 20, row, "#b8a6b42d");
  }

  const by = buildingY + (top ? 0 : 3);
  oval(x + 7, by + 100, 93, 24, "#1416258f");
  box(x - 75, by + 33, 150, 67, "#202135", 5);
  box(x - 69, by + 26, 138, 67, wall, 3);
  box(x - 69, by + 49, 138, 8, "#211a3444");
  const roofBase = top ? 48 : 44;
  shape([[x - 81, by + roofBase], [x - 55, by + 2], [x + 55, by + 2], [x + 81, by + roofBase]], roof);
  shape([[x - 81, by + roofBase], [x, by + 24], [x + 81, by + roofBase]], "#22172e45");
  line(x - 81, by + roofBase, x + 81, by + roofBase, "#2e223c", 4);
  line(x - 53, by + 4, x + 53, by + 4, "#f0c2c662", 2);
  for (let offset = -44; offset <= 44; offset += 16) line(x + offset, by + 9, x + offset * 1.28, by + 28, "#211c3433");
  box(x + 36, by - 3, 14, 17, "#494052", 2);
  box(x + 34, by - 6, 18, 5, "#6c5969", 2);
  for (const wx of [x - 53, x + 28]) {
    box(wx - 2, by + 59, 28, 20, "#4a394c", 2);
    box(wx, by + 61, 24, 16, knownVacant ? "#37334b" : windowLight, 2);
    line(wx + 12, by + 61, wx + 12, by + 77, "#6e5062", 2);
    line(wx, by + 69, wx + 24, by + 69, "#6e5062", 1);
  }
  box(x - 14, by + 57, 28, 37, "#4a3c52", 3);
  box(x - 10, by + 62, 20, 32, "#664957", 2);
  oval(x + 5, by + 79, 1.8, 1.8, windowLight);
  box(x - 16, by + 92, 32, 4, "#d3a79a", 2);
  for (const dx of [-105, 104]) tree(x + dx, top ? y - 10 : y + 14, 12, index % 2);

  const broken = house.damage === 100;
  const highlight = nearest === house;
  const chase = house.alert || house.pursuit;
  const paint = broken ? "#ff8f9a" : knownVacant ? "#a2e7cc" : highlight ? "#eeff9b" : "#a8d7ff";
  if (highlight || house.flash || chase) {
    ctx.strokeStyle = paint;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = highlight ? .75 : .4;
    ctx.beginPath();
    ctx.arc(x, y, house.flash ? 18 + (1 - house.flash / .36) * 13 : 17, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  box(x - 13, y - 11, 26, 22, "#252238", 5);
  box(x - 10, y - 8, 20, 16, paint, 4);
  if (broken) {
    line(x - 4, y - 4, x + 4, y + 4, "#4b233a", 2);
    line(x + 4, y - 4, x - 4, y + 4, "#4b233a", 2);
  } else {
    oval(x, y, 3.8, 3.8, "#34304c");
    oval(x - 1, y - 1, 1.2, 1.2, "#efffff");
  }
  if (house.damage > 0) {
    box(x - 15, y + 15, 30, 3, "#191725", 1);
    box(x - 15, y + 15, 30 * house.damage / 100, 3, paint, 1);
  }
  if (knownVacant) label("留守", x + 32, y, "#a2e7cc", 12);
  else if (highlight) label(broken ? "100%" : `${index + 1}`, x + 29, y, paint, 12);
}

function exitGate(x, nudge, open) {
  const color = open ? "#e7ff86" : "#807894";
  box(x, mid - 35, 24, 70, open ? "#b5d07544" : "#51465d55", 3);
  for (let y = mid - 25; y <= mid + 26; y += 17) {
    const center = x + 12;
    line(center - 4 * nudge, y - 4, center + 2 * nudge, y, color, 2.5);
    line(center + 2 * nudge, y, center - 4 * nudge, y + 4, color, 2.5);
  }
  label(open ? "EXIT" : "LOCK", x + 12, mid - 46, color, 11);
}

function drawActor(actor, chaser = false) {
  const { x, y, facing, angry, stride } = actor;
  const moveFrame = Math.sin(stride);
  const hue = chaser ? angry ? "#ff818f" : "#f2aa86" : "#e7ff86";
  const step = moveFrame * 4;
  const fy = y - Math.abs(moveFrame) * 1.5;
  oval(x, y + 10, 13, 5, "#100f206f");
  if (!chaser) {
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 15, 7, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#e7ff8680";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (angry) {
    oval(x, y, 18, 18, "#ff73883a");
    line(x - facing * 13, fy + 3, x - facing * 20, fy - 10, "#f6cd90", 3);
    box(x - facing * 20 - 6, fy - 15, 12, 8, "#e88eed", 2);
    line(x - facing * 20 - 3, fy - 15, x - facing * 20 - 3, fy - 8, "#ffe3fb8a");
  }
  box(x - 7, fy + 1, 5, 9 + step, "#29233c", 2);
  box(x + 2, fy + 1, 5, 9 - step, "#29233c", 2);
  box(x - 9, fy - 8, 18, 13, "#1d1b31", 5);
  box(x - 7, fy - 8, 14, 10, hue, 4);
  box(x - 6, fy - 18, 12, 11, "#ffcfaa", 4);
  box(x - 8, fy - 19, 15, 6, chaser ? "#544363" : "#b8cb60", 3);
  box(x + facing * 3, fy - 14, 2, 3, "#372c45", 1);
  if (chaser) label("!", x, fy - 28, angry ? "#ff8c9d" : "#ffd998", angry ? 19 : 14);
}

function drawEnding() {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#39315b");
  sky.addColorStop(.55, "#dd8b94");
  sky.addColorStop(1, "#ffe4a6");
  box(0, 0, width, height, sky);

  const glow = ctx.createRadialGradient(400, 330, 35, 400, 330, 209);
  glow.addColorStop(0, "#fff1aeae");
  glow.addColorStop(1, "#ffd58500");
  oval(400, 330, 209, 209, glow);
  oval(400, 330, 58, 58, "#ffe6a4");
  shape([[0, 393], [135, 325], [225, 359], [340, 343], [490, 393], [670, 343], [800, 378], [800, 520], [0, 520]], "#75546f");
  shape([[0, 426], [193, 394], [341, 427], [497, 403], [627, 422], [800, 388], [800, 520], [0, 520]], "#48385b");
  box(0, 453, width, 67, "#232239");
  line(0, 454, width, 454, "#f2b3ab", 2);
  for (let x = 20; x < width; x += 48) box(x, 473, 23, 2, "#a88b9e75");
  for (let n = 0; n < surviving(); n++) {
    drawActor({ x: 400 + (n - (surviving() - 1) / 2) * 28, y: 455, facing: 1, stride: .6 });
  }
}

function draw() {
  if (mode === "ending") {
    drawEnding();
    return;
  }
  const stage = stages[stageIndex];
  const open = stageVisits >= stage.goal;
  setting(stage);
  exitGate(5, -1, open && stage.exit !== "right");
  exitGate(771, 1, open && stage.exit !== "left");
  const nearest = mode === "playing" ? nearbyHouse() : null;
  for (const house of houses) drawHouse(house, nearest);
  const actors = houses.filter(house => house.pursuit).map(house => house.pursuit);
  actors.push(player);
  actors.sort((a, b) => a.y - b.y).forEach(actor => drawActor(actor, actor !== player));
  for (const dot of particles) {
    ctx.globalAlpha = clamp(dot.life * 2.5, 0, 1);
    box(dot.x, dot.y, 3, 3, dot.color, 1);
  }
  ctx.globalAlpha = 1;
  if (mode === "title") {
    label("●", 400, mid - 26 + Math.sin(visualTime * 4) * 3, "#e7ff86", 9);
  }
}

function frame(now) {
  if(PortSave.stopped){clearControls();requestAnimationFrame(frame);return;}
  const delta = visualTime ? clamp(now / 1000 - visualTime, 0, .04) : 0;
  visualTime = now / 1000;
  if (mode === "playing" && delta) tick(delta);
  if (mode !== "paused") {
    for (const dot of particles) {
      dot.x += dot.dx * delta;
      dot.y += dot.dy * delta;
      dot.life -= delta;
    }
    particles = particles.filter(dot => dot.life > 0);
  }
  updateHUD();
  draw();
  requestAnimationFrame(frame);
}

for (const button of ui.seats.querySelectorAll("button")) {
  button.addEventListener("click", () => {
    partySize = Number(button.dataset.count);
    for (const seat of ui.seats.querySelectorAll("button")) seat.setAttribute("aria-pressed", seat === button);
  });
}

ui["main-action"].addEventListener("click", () => {
  unlockAudio();
  if (mode === "title") startRun();
  else if (mode === "results") {
    if (surviving()) startRun();
    else retryStage();
  } else if (mode === "ending") {
    mode = "results";
    setPanel();
  } else if (mode === "paused") togglePause();
  else if (mode === "escaped" || mode === "caught") advanceTurn();
});
ui["menu-action"].addEventListener("click", toTitle);
ui.pause.addEventListener("click", togglePause);
ui.sound.addEventListener("click", () => {
  sound = !sound;
  PortSave.settings(sound);
  ui.sound.setAttribute("aria-pressed", sound);
  setText("sound", sound ? "音 ON" : "音 OFF");
  if (sound) {
    unlockAudio();
    tone([620]);
  }
});
ui.ring.addEventListener("click", ring);
for (const button of document.querySelectorAll("[data-hold]")) {
  button.addEventListener("pointerdown", event => {
    if (mode !== "playing" || event.button !== 0) return;
    event.preventDefault();
    held.set(event.pointerId, button.dataset.hold);
    button.setPointerCapture(event.pointerId);
  });
  for (const event of ["lostpointercapture", "pointerup", "pointercancel"]) {
    button.addEventListener(event, pointer => held.delete(pointer.pointerId));
  }
}

window.addEventListener("keydown", event => {
  if (event.code === "Escape" && (mode === "playing" || mode === "paused")) {
    event.preventDefault();
    if (!event.repeat) togglePause();
    return;
  }
  if (mode !== "playing") return;
  if (event.code === "Space" && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault();
    ring();
    return;
  }
  if (bindings[event.code]) {
    event.preventDefault();
    keys.add(event.code);
  }
});
window.addEventListener("keyup", event => keys.delete(event.code));
window.addEventListener("blur", () => { clearControls(); if (mode === "playing") togglePause(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "playing") togglePause(); });

toTitle();
sound = PortSave.data?.sound ?? false;
ui.sound.setAttribute("aria-pressed", sound);
setText("sound", sound ? "音 ON" : "音 OFF");
const resume = document.getElementById("resume-save");
resume.hidden = !PortSave.data?.team.length || !!PortSave.data?.completed;
resume.onclick = () => {
  const data = PortSave.data;
  partySize = data.partySize; stageIndex = data.stageIndex;
  team = data.team.map(runner => ({...runner}));
  startStage(); resume.hidden = true;
};
requestAnimationFrame(frame);

window.PinponSuspend=()=>{clearControls();if(mode==='playing')togglePause();audio?.suspend?.();};
window.PinponSnapshot=()=>PortSave.data;
const replayEnding=document.getElementById('replay-ending');
replayEnding.hidden=!PortSave.data?.completed;
replayEnding.onclick=()=>{if(PortSave.stopped||!PortSave.data?.completed)return;const d=PortSave.data;partySize=d.partySize;stageIndex=d.stageIndex;team=d.team.map(r=>({...r}));clearControls();mode='ending';setPanel();};
