import { apart, bounce, clamp, grid, ground, keys, lanes, mark, mistake, move, pads, point, pulse, rand, wrap } from "./board.js";

const beatLength = [1.08, .98, .92, .79];
const beatWindow = [.25, .23, .22, .2];

function nextNote(s) {
  const { d, stage } = s;
  d.turn += 1;
  d.age = stage.variant === 3 && d.turn % 3 === 0 ? -.48 : 0;
  if (stage.variant !== 1 || d.turn % 2 === 0) d.target = apart(s, d.target, 3);
}

const rhythm = {
  setup: () => ({ turn: 0, target: 1, age: 0 }),
  update(s, dt) {
    const { d, stage } = s;
    d.age += dt;
    if (d.age <= beatLength[stage.variant] + beatWindow[stage.variant]) return;
    if (stage.variant !== 2 || d.turn % 3 !== 1) mistake(s);
    nextNote(s);
  },
  input(s, key) {
    const { d, stage } = s;
    const ghost = stage.variant === 2 && d.turn % 3 === 1;
    const aligned = Math.abs(d.age - beatLength[stage.variant]) <= beatWindow[stage.variant];
    if (!ghost && aligned && keys[d.target] === key) point(s);
    else mistake(s);
    nextNote(s);
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    grid(p, pads);
    const ghost = stage.variant === 2 && d.turn % 3 === 1;
    const atTarget = Math.abs(d.age - beatLength[stage.variant]) <= beatWindow[stage.variant];
    pads.forEach((x, index) => {
      p.outline(x - 24, 77, 48, 28, atTarget && index === d.target && !ghost ? .97 : .48, 2);
      p.text(["<", "A", ">"][index], x, 115, 10, .76);
    });
    if (d.age >= 0) {
      const step = clamp(Math.floor(d.age / beatLength[stage.variant] * 6), 0, 6);
      const y = preview ? 57 : atTarget ? 91 : [18, 30, 42, 54, 66, 77, 91][step];
      p.sprite("note", pads[d.target], y, 2.8, ghost ? .28 : 1);
    }
    if (stage.variant === 3) p.text((d.turn % 3 + 1) + " / 3", 288, 13, 10, .63);
  }
};

function tideLow(s) {
  return s.stage.variant !== 1 || s.d.turn % 5 >= 2;
}

const fishing = {
  setup: () => ({ lane: 2, x: 2, direction: 1, turn: 0, beat: 0, hook: false, splash: 0 }),
  update(s, dt) {
    const { d, stage } = s;
    d.splash = Math.max(0, d.splash - dt);
    pulse(s, dt, [.58, .56, .49, .54][stage.variant], () => {
      d.turn += 1;
      [d.x, d.direction] = bounce(d.x, d.direction);
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") {
      if (!d.hook) d.lane = move(d.lane, key);
      return;
    }
    if (stage.variant === 2 && !d.hook) {
      d.hook = true;
      return;
    }
    d.hook = false;
    d.splash = .31;
    if (d.lane === d.x && tideLow(s)) {
      point(s);
      d.x = apart(s, d.x);
    } else mistake(s);
  },
  draw(s, p) {
    const { d, stage } = s;
    grid(p);
    const water = tideLow(s) ? 42 : 30;
    p.rect(13, water + 1, 294, 75 - (water - 30), .11);
    p.dots(14, water, 305, water, .58);
    p.dots(15, 112, 304, 112, .28);
    for (let x = 22; x < 297; x += 42) p.sprite("grass", x, 102, 1, .2);
    const x = lanes[d.lane];
    const depth = d.hook || d.splash > 0 ? 81 : 39;
    p.line(x, 9, x, depth, .75);
    p.line(x, depth, x + 5, depth + 4, .85, 2);
    p.line(x + 5, depth + 4, x + 8, depth - 1, .85, 2);
    p.rect(x - 10, 8, 22, 3, .8);
    if (stage.variant === 3) {
      p.sprite("fish", lanes[wrap(d.x + 2, 5)], 65, 2.3, .74);
      p.sprite("fish", lanes[wrap(d.x - 2, 5)], 92, 2.25, .75);
    }
    p.sprite(stage.icon, lanes[d.x], 80, 2.7, tideLow(s) ? 1 : .24);
    if (d.splash > 0) p.sprite("starburst", x, water, 1, .72);
  }
};

function plant(s, age = 0, weed = false) {
  return { age, ripe: 1.85 + rand(s, 8) * .12, watered: s.stage.variant !== 1, weed };
}

function oldestPlant(garden) {
  let oldest = -1;
  for (let index = 0; index < garden.length; index += 1) {
    const plot = garden[index];
    if (plot.age >= plot.ripe && (oldest < 0 || plot.age - plot.ripe > garden[oldest].age - garden[oldest].ripe)) {
      oldest = index;
    }
  }
  return oldest;
}

const harvest = {
  setup: s => ({ lane: 2, garden: [0, .42, 1.95, .9, 1.15].map((age, index) => plant(s, age, s.stage.variant === 2 && index === 3)) }),
  update(s, dt) {
    const { d, stage } = s;
    d.garden.forEach((plot, index) => {
      plot.age = Math.min(plot.age + dt, plot.watered ? 9 : .9);
      if (plot.age > plot.ripe + (stage.variant === 3 ? 2.1 : 3.25)) {
        d.garden[index] = plant(s, 0, stage.variant === 2 && rand(s, 4) === 0);
      }
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") {
      d.lane = move(d.lane, key);
      return;
    }
    const plot = d.garden[d.lane];
    if (!plot.watered && plot.age >= .89) {
      plot.watered = true;
    } else if (plot.age >= plot.ripe && !plot.weed && (stage.variant !== 3 || d.lane === oldestPlant(d.garden))) {
      point(s);
      d.garden[d.lane] = plant(s, 0, stage.variant === 2 && rand(s, 4) === 0);
    } else {
      mistake(s);
      if (plot.weed) d.garden[d.lane] = plant(s);
    }
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    grid(p);
    d.garden.forEach((plot, index) => {
      const x = lanes[index];
      p.outline(x - 21, 89, 42, 12, .6, 2);
      p.sprite("sprout", x, 80, 1.4, .53);
      const ripe = plot.age >= plot.ripe || preview && index === 2;
      const fruit = plot.weed ? "bug" : stage.variant === 2 ? "flower" : "apple";
      if (ripe) p.sprite(fruit, x, 57, 2.8, .95);
      else if (!plot.watered && plot.age >= .89) p.sprite("drop", x, 61, 2, .88);
      else p.sprite("sprout", x, 70, 1.75, .54);
      if (stage.variant === 3 && index === oldestPlant(d.garden)) p.outline(x - 19, 41, 38, 34, .76, 2);
    });
    mark(p, lanes[d.lane], 109, 33);
  }
};

function setCargo(s) {
  const { d } = s;
  d.source = apart(s, d.lane);
  d.dest = apart(s, d.source);
  d.other = [0, 1, 2, 3, 4].find(value => value !== d.source && value !== d.dest);
  d.symbol = rand(s, 2);
}

const crane = {
  setup: () => ({ lane: 2, source: 1, dest: 3, other: 4, symbol: 0, carrying: false, lock: 0, beat: 0, wind: 1 }),
  update(s, dt) {
    const { d, stage } = s;
    d.lock = Math.max(0, d.lock - dt);
    if (stage.variant === 3) pulse(s, dt, .76, () => {
      if (d.carrying) d.lane = clamp(d.lane + d.wind, 0, 4);
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (d.lock > 0) return;
    if (key !== "action") {
      d.lane = move(d.lane, key);
    } else if (!d.carrying && d.lane === d.source) {
      d.carrying = true;
      d.wind = rand(s, 2) ? 1 : -1;
      d.beat = 0;
      if (stage.variant === 1) d.lock = .61;
    } else if (d.carrying && d.lane === d.dest) {
      d.carrying = false;
      point(s);
      setCargo(s);
      if (stage.variant === 1) d.lock = .61;
    } else mistake(s);
  },
  draw(s, p) {
    const { d, stage } = s;
    grid(p);
    ground(p);
    p.rect(13, 15, 294, 5, .78);
    const x = lanes[d.lane];
    p.rect(x - 13, 17, 26, 9, .9);
    p.line(x, 26, x, 61, .76);
    p.line(x, 61, x - 5, 66, .86, 2);
    const symbols = ["star", "gem"];
    const crateX = d.carrying ? x : lanes[d.source];
    const crateY = d.carrying ? 76 : 92;
    p.sprite("parcel", crateX, crateY, 3);
    if (stage.variant === 2) {
      p.rect(crateX - 7, crateY - 5, 14, 10, .54);
      p.sprite(symbols[d.symbol], crateX + 19, crateY - 7, 1.3);
      p.sprite(symbols[d.symbol], lanes[d.dest], 94, 1.85);
      p.sprite(symbols[1 - d.symbol], lanes[d.other], 94, 1.85);
    } else {
      p.sprite("flag", lanes[d.dest], 93, 2.5, .8);
    }
    mark(p, lanes[d.dest], 108, 37);
    if (d.lock > 0) {
      p.dots(x - 19, 39, x + 19, 39, .66);
      p.rect(x - 19, 42, 38 * (1 - d.lock / .61), 3, .7);
    }
    if (stage.variant === 3) p.text(d.wind < 0 ? "<< WIND" : "WIND >>", 160, 39, 11, .68);
  }
};

function kick(s, lane) {
  const { d, stage } = s;
  const occupied = d.keepers.some(keeper => keeper.x === lane);
  if (occupied || stage.variant === 2 && lane !== d.corner) {
    mistake(s);
  } else {
    point(s);
    if (stage.variant === 2) d.corner = 4 - d.corner;
  }
}

const goal = {
  setup: s => ({
    lane: 2, keepers: s.stage.variant === 1 ? [{ x: 2, dx: 1 }, { x: 1, dx: -1 }] : [{ x: 2, dx: 1 }],
    corner: 0, beat: 0, cooldown: 0, flight: 0, ball: 2
  }),
  update(s, dt) {
    const { d, stage } = s;
    d.cooldown = Math.max(0, d.cooldown - dt);
    pulse(s, dt, [.62, .56, .55, .57][stage.variant], () => {
      for (const keeper of d.keepers) [keeper.x, keeper.dx] = bounce(keeper.x, keeper.dx);
    });
    if (d.flight > 0) {
      d.flight -= dt;
      if (d.flight <= 0) kick(s, d.ball);
    }
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") d.lane = move(d.lane, key);
    else if (!d.cooldown && d.flight <= 0) {
      d.cooldown = .47;
      d.ball = d.lane;
      if (stage.variant === 3) d.flight = .43;
      else kick(s, d.lane);
    }
  },
  draw(s, p) {
    const { d, stage } = s;
    grid(p);
    p.outline(19, 17, 282, 43, .74, 3);
    for (let y = 25; y < 58; y += 8) p.dots(21, y, 298, y, .18);
    for (const x of lanes) p.dots(x - 28, 17, x - 28, 62, .33);
    ground(p);
    d.keepers.forEach((keeper, index) => p.sprite("person", lanes[keeper.x], 47 - index * 5, 2.5));
    if (stage.variant === 2) p.sprite("flag", lanes[d.corner], 28, 1.7, .85);
    const y = d.flight > 0 ? 51 + 42 * d.flight / .43 : d.cooldown > .31 ? 60 : 94;
    p.sprite("ball", lanes[d.cooldown > .31 || d.flight > 0 ? d.ball : d.lane], y, 2.3);
    p.dots(lanes[d.lane], 65, lanes[d.lane], 78, .55);
    mark(p, lanes[d.lane], 110, 30);
  }
};

function resetCue(s, second = false) {
  const { d } = s;
  if (!second) d.round += 1;
  d.part = second ? 1 : 0;
  d.wait = (second ? .44 : .73) + rand(s, 8) * .085;
  d.phase = "wait";
  d.elapsed = 0;
  d.decoyed = false;
  d.lane = apart(s, d.lane, 3);
}

const reaction = {
  setup: () => ({ lane: 1, phase: "wait", wait: 1.03, elapsed: 0, decoyed: false, round: 0, part: 0 }),
  update(s, dt) {
    const { d, stage } = s;
    d.elapsed += dt;
    if (d.phase === "wait" && d.elapsed >= d.wait) {
      d.elapsed = 0;
      d.phase = stage.variant === 1 && d.round % 2 === 1 && !d.decoyed ? "decoy" : "cue";
    } else if (d.phase === "decoy" && d.elapsed >= .49) {
      d.decoyed = true;
      d.wait = .41;
      d.elapsed = 0;
      d.lane = apart(s, d.lane, 3);
      d.phase = "wait";
    } else if (d.phase === "cue" && d.elapsed >= [.96, .86, .9, .92][stage.variant]) {
      mistake(s);
      resetCue(s);
    }
  },
  input(s, key) {
    const { d, stage } = s;
    const expected = stage.variant === 2 ? 2 - d.lane : d.lane;
    if (d.phase !== "cue" || key !== keys[expected]) {
      mistake(s);
      resetCue(s);
    } else if (stage.variant === 3 && d.part === 0) {
      resetCue(s, true);
    } else {
      point(s);
      resetCue(s);
    }
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    grid(p, pads);
    const cue = preview || d.phase === "cue";
    p.text(cue ? "GO!" : "WAIT", 160, 17, 14, cue ? 1 : .6);
    pads.forEach((x, i) => {
      const active = i === d.lane && cue;
      const decoy = i === d.lane && d.phase === "decoy";
      p.outline(x - 24, 42, 48, 44, decoy ? .98 : .45, decoy ? 2 : 1);
      p.sprite("bell", x, 63, 3, active ? 1 : .18);
      p.text(["<", "A", ">"][i], x, 101, 12, .76);
    });
    if (stage.variant === 3) p.text(d.part + 1 + " / 2", 282, 19, 10, .72);
  }
};

function watcher(time, second = false) {
  return (time + (second ? .56 : 0)) % 2.5 < .88;
}

function seen(s) {
  return watcher(s.d.beat) || s.stage.variant === 1 && watcher(s.d.beat, true);
}

const stealth = {
  setup: () => ({ beat: 0, cooldown: 0, hidden: false, exposed: false, picked: false }),
  update(s, dt) {
    const { d } = s;
    const wasSeen = seen(s);
    d.beat = (d.beat + dt) % 2.5;
    d.cooldown = Math.max(0, d.cooldown - dt);
    if (!wasSeen && seen(s) && d.exposed) {
      if (!d.hidden) mistake(s);
      d.exposed = false;
    }
  },
  input(s, key) {
    const { d, stage } = s;
    if (key === "left") d.hidden = true;
    else if (key === "right") d.hidden = false;
    else if (!d.hidden) {
      if (seen(s) || stage.variant === 3 && d.cooldown > 0) {
        mistake(s);
        d.exposed = false;
      } else if (d.cooldown === 0) {
        if (stage.variant === 2 && s.score === 4 && !d.picked) d.picked = true;
        else point(s);
        d.cooldown = stage.variant === 3 ? .61 : .25;
        d.exposed = true;
      }
    }
  },
  draw(s, p) {
    const { d, stage } = s;
    grid(p);
    ground(p);
    const cameras = stage.variant === 1 ? [false, true] : [false];
    cameras.forEach(second => {
      const x = cameras.length === 1 ? 160 : second ? 225 : 95;
      const watching = watcher(d.beat, second);
      p.sprite(watching ? "eye" : "closed", x, 30, 3, watching ? .98 : .58);
      if (watching) {
        p.line(x, 46, x - 66, 82, .21);
        p.line(x, 46, x + 66, 82, .21);
      }
    });
    const x = lanes[s.score % 5];
    if (d.hidden) p.sprite("parcel", x, 96, 3);
    else p.sprite("person", x, 92, 2.7);
    if (stage.variant === 2 && !d.picked) p.sprite("key", lanes[4], 80, 1.6, .94);
    if (stage.variant === 3 && d.cooldown > 0) p.sprite("note", x + 16, 75, 1, .87);
    p.sprite("flag", 300, 93, 2.3, .83);
    if (!seen(s)) p.dots(13, 53, 306, 53, .22);
  }
};

export const timing = { rhythm, fish: fishing, harvest, crane, goal, reaction, stealth };
