import { apart, bounce, clamp, cursor, grid, ground, lanes, mark, mistake, move, point, pulse, rand, wrap } from "./board.js";

const fall = [18, 38, 57, 76, 92];

const catcher = {
  setup: () => ({ lane: 2, target: 2, phase: 0, beat: 0, turn: 0, lid: 0, mark: 0, symbol: 0, hazard: -1 }),
  update(s, dt) {
    const { d, stage } = s;
    d.lid = Math.max(0, d.lid - dt);
    pulse(s, dt, [.38, .33, .42, .35][stage.variant], () => {
      d.phase += 1;
      if (d.phase < fall.length) return;
      const hasLid = stage.variant !== 2 || d.lid > 0;
      const matches = stage.variant !== 3 || d.mark === d.symbol;
      if (d.lane === d.target && hasLid && matches) point(s);
      else mistake(s);
      d.phase = 0;
      d.turn += 1;
      d.target = apart(s, d.target);
      d.hazard = stage.variant === 1 && d.turn % 2 === 1 ? apart(s, d.target) : -1;
      d.symbol = rand(s, 2);
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") d.lane = move(d.lane, key);
    else if (stage.variant === 2) d.lid = .63;
    else if (stage.variant === 3) d.mark = 1 - d.mark;
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    const icon = stage.variant === 3 && d.symbol === 1 ? "gem" : stage.icon;
    grid(p);
    ground(p, 106);
    p.sprite("tree", 34, 62, 4, .28);
    p.sprite("tree", 289, 74, 3, .18);
    for (const [x, y] of [[60, 44], [24, 56], [81, 64], [302, 66]]) p.sprite(stage.icon, x, y, 1, .31);
    for (const x of lanes) {
      p.sprite("basket", x, 98, 2, .17);
      for (const y of fall.slice(0, -1)) p.sprite(stage.icon, x, y, 1, .07);
    }
    const phase = preview ? 2 : d.phase;
    p.sprite(icon, lanes[d.target], fall[phase], 2.4);
    p.dots(lanes[d.target], 8, lanes[d.target], fall[phase] - 12, .46);
    if (d.hazard >= 0) p.sprite("bug", lanes[d.hazard], fall[phase], 2.3);
    p.sprite("basket", lanes[d.lane], 99, 3);
    if (stage.variant === 2 && d.lid === 0) p.rect(lanes[d.lane] - 15, 89, 30, 2);
    if (stage.variant === 3) p.sprite(d.mark ? "gem" : "star", lanes[d.lane], 83, 1);
    p.sprite("grass", 81, 113, 1, .32);
    p.sprite("grass", 246, 113, 1, .32);
  }
};

const rowY = [107, 80, 54, 28, 10];

function safeCrossing(s, row, lane) {
  const { d, stage } = s;
  const direction = row % 2 === 0 ? -1 : 1;
  const position = wrap(lane - d.phase * direction - (row - 1) * 2, 5);
  if (stage.variant === 1) return position !== 0 && position !== 1;
  if (stage.variant === 3) return position === 1 || position === 3 || position === 0 && d.phase % 3 === 0;
  return position === 0 || position === 2 || position === 3;
}

const crossing = {
  setup: s => ({ lane: 2, row: 0, phase: 0, beat: 0, middle: s.stage.variant < 2 ? 2 : 3 }),
  update(s, dt) {
    pulse(s, dt, [.69, .61, .68, .57][s.stage.variant], () => {
      const { d, stage } = s;
      d.phase = (d.phase + 1) % 15;
      if (stage.variant === 2 && d.row > 0 && d.phase % 2 === 0) {
        d.lane = clamp(d.lane + (d.row % 2 === 0 ? -1 : 1), 0, 4);
      }
    });
  },
  input(s, key) {
    const { d } = s;
    if (key !== "action") {
      d.lane = move(d.lane, key);
      return;
    }
    const next = d.row + 1;
    if (next > d.middle) {
      point(s);
      d.row = s.outcome ? next : 0;
    } else if (safeCrossing(s, next, d.lane)) {
      d.row = next;
    } else {
      mistake(s);
      d.row = 0;
    }
  },
  draw(s, p) {
    const { d, stage } = s;
    const roadway = stage.variant === 1;
    const yTop = rowY[d.middle + 1];
    p.rect(11, yTop + 8, 298, 90 - yTop, .1);
    p.rect(12, yTop + 5, 296, 2, .5);
    p.rect(12, 96, 296, 2, .5);
    p.sprite("flag", 296, yTop, 1.5, .8);
    for (let row = 1; row <= d.middle; row += 1) {
      const y = rowY[row];
      p.dots(12, y + 11, 305, y + 11, .24);
      lanes.forEach((x, lane) => {
        const safe = safeCrossing(s, row, lane);
        if (roadway && !safe) p.sprite("car", x, y, 2.4);
        if (!roadway) p.sprite(stage.variant === 3 ? "rock" : "log", x, y, 2.6, safe ? .91 : .11);
        if (row === d.row + 1 && lane === d.lane) cursor(p, x, y, 45, 22);
      });
    }
    p.sprite(roadway ? "person" : "frog", lanes[d.lane], rowY[d.row] + 1, 2, 1);
  }
};

const dodger = {
  setup: () => ({ lane: 2, target: 1, phase: 0, beat: 0, turn: 0, shield: 1, guarding: false, jump: 0 }),
  update(s, dt) {
    const { stage, d } = s;
    d.jump = Math.max(0, d.jump - dt);
    pulse(s, dt, [.31, .27, .29, .32][stage.variant], () => {
      d.phase += 1;
      if (d.phase < fall.length) return;
      const wide = stage.variant === 3 && d.turn % 3 === 1;
      const pair = stage.variant === 1 && d.lane === wrap(d.target + 2, 5);
      const safe = wide ? d.jump > 0 : d.lane !== d.target && !pair;
      if (safe || d.guarding) point(s);
      else mistake(s);
      d.phase = 0;
      d.turn += 1;
      d.target = apart(s, d.target);
      d.guarding = false;
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") d.lane = move(d.lane, key);
    else if (stage.variant === 1 && d.shield > 0) {
      d.shield -= 1;
      d.guarding = true;
    } else if (stage.variant === 3 && !d.jump) {
      d.jump = .61;
    }
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    grid(p);
    ground(p);
    const phase = preview ? 2 : d.phase;
    const wide = stage.variant === 3 && d.turn % 3 === 1;
    if (wide) {
      for (let x = 22; x < 305; x += 23) p.sprite("paper", x, fall[phase], 1.4, .87);
      p.dots(12, fall[phase] + 11, 305, fall[phase] + 11, .5);
    } else {
      const y = fall[phase];
      const shiftInAir = stage.variant === 2 ? (4 - phase) * (d.turn % 2 === 0 ? 9 : -9) : 0;
      p.sprite(stage.icon, lanes[d.target] + shiftInAir, y, 2.5);
      if (stage.variant === 1) p.sprite(stage.icon, lanes[wrap(d.target + 2, 5)], y, 2.4);
      p.text("×", lanes[d.target], 116, 13, .8);
    }
    for (const x of lanes) p.sprite("person", x, 94, 2, .14);
    p.sprite("person", lanes[d.lane], d.jump > 0 ? 70 : 94, 2.25);
    if (d.shield > 0 && stage.variant === 1) p.sprite("shield", 15, 13, 1, .8);
    if (d.guarding) p.sprite("shield", lanes[d.lane], 94, 3.1, .58);
  }
};

function holes(s) {
  const { d, stage } = s;
  if (stage.variant === 2) {
    const start = rand(s, 4);
    d.hits = [start, start + 1];
  } else {
    d.hits = [apart(s, d.last)];
  }
  d.last = d.hits[0];
  d.trap = stage.variant === 1 ? apart(s, d.last) : -1;
  d.beat = 0;
}

const whacker = {
  setup: s => ({ lane: 2, hits: s.stage.variant === 2 ? [2, 3] : [2], beat: 0, last: 2, trap: s.stage.variant === 1 ? 1 : -1 }),
  update(s, dt) {
    pulse(s, dt, [1.75, 1.65, 2.55, 1.48][s.stage.variant], () => holes(s));
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") {
      d.lane = move(d.lane, key);
      return;
    }
    if (!d.hits.includes(d.lane) || stage.variant === 3 && d.beat < .46) {
      mistake(s);
      return;
    }
    d.hits = d.hits.filter(slot => slot !== d.lane);
    if (d.hits.length === 0) {
      point(s);
      holes(s);
    }
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    grid(p);
    lanes.forEach((x, lane) => {
      p.outline(x - 20, 83, 40, 9, .62, 2);
      p.rect(x - 16, 87, 32, 4, .57);
      const active = d.hits.includes(lane);
      const ghost = stage.variant === 3 && d.beat < .46 && !preview;
      p.sprite(stage.icon, x, 61, 2.7, active && !ghost ? 1 : .16);
      if (d.trap === lane) p.sprite("gem", x, 62, 2.3, .72);
      if (lane === d.lane) cursor(p, x, 72, 43, 47);
    });
    p.rect(16, 104, 288, 2, .35);
    mark(p, lanes[d.lane], 107, 35);
  }
};

const relay = {
  setup: () => ({ lane: 2, position: 0, direction: 1, beat: 0, target: 2, pair: false }),
  update(s, dt) {
    pulse(s, dt, [.48, .43, .42, .39][s.stage.variant], () => {
      const { d } = s;
      [d.position, d.direction] = bounce(d.position, d.direction);
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") {
      if (stage.variant === 1) d.lane = move(d.lane, key);
      return;
    }
    const correctDirection = stage.variant !== 3 || d.direction === 1;
    const aligned = stage.variant !== 1 || d.lane === d.target;
    if (!correctDirection || !aligned || d.position !== d.target) {
      mistake(s);
      return;
    }
    if (stage.variant === 2 && !d.pair) {
      d.pair = true;
      d.target = d.target > 2 ? 1 : 3;
      return;
    }
    point(s);
    d.pair = false;
    d.target = 1 + apart(s, d.target - 1, 3);
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    grid(p);
    const x = lanes[preview ? 1 : d.position];
    p.rect(15, 70, 290, 3, .64);
    p.rect(15, 78, 290, 2, .55);
    for (let wheel = 27; wheel < 306; wheel += 17) p.outline(wheel, 73, 5, 5, .45);
    p.sprite(stage.icon, x, 57, 2.7);
    p.text(d.direction > 0 ? ">>" : "<<", x, 35, 12, .74);
    for (const laneX of lanes) p.outline(laneX - 17, 88, 34, 18, .35);
    p.outline(lanes[d.target] - 20, 85, 40, 24, .9, 2);
    p.sprite("flag", lanes[d.target], 94, 1, .8);
    if (stage.variant === 1) mark(p, lanes[d.lane], 111, 31);
    if (stage.variant === 2) p.text(d.pair ? "2 / 2" : "1 / 2", 160, 16, 11, .72);
  }
};

const runner = {
  setup: () => ({ x: 291, air: 0, jumps: 0, duck: 0, beat: 0, turn: 0, failed: false }),
  update(s, dt) {
    const { d, stage } = s;
    d.air = Math.max(0, d.air - dt);
    d.duck = Math.max(0, d.duck - dt);
    if (!d.air) d.jumps = 0;
    pulse(s, dt, [.33, .33, .31, .30][stage.variant], () => {
      d.x -= 40;
      const roof = stage.variant === 2 && d.turn % 2 === 1;
      const high = stage.variant === 3 && d.turn % 2 === 1;
      if (d.x === 51 || stage.variant === 1 && d.x === 11) {
        const safe = roof ? d.duck > 0 && d.air === 0 : d.air > 0 && (!high || d.jumps === 2);
        if (!safe && !d.failed) {
          mistake(s);
          d.failed = true;
        }
      }
      if (d.x < -10) {
        if (!d.failed) point(s);
        d.x = 291;
        d.turn += 1;
        d.failed = false;
      }
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (key === "left" && stage.variant === 2 && !d.air) {
      d.duck = .72;
    } else if (key === "action" && (d.jumps === 0 || d.jumps === 1 && stage.variant === 3)) {
      d.air = [.69, .92, .7, .88][stage.variant];
      d.duck = 0;
      d.jumps += 1;
    }
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    ground(p);
    grid(p);
    const x = preview ? 182 : d.x;
    if (stage.variant === 1) {
      p.rect(x - 22, 104, 44, 4);
      p.dots(x - 19, 101, x + 20, 101, .28);
    } else if (stage.variant === 2 && d.turn % 2 === 1) {
      p.rect(x - 17, 76, 34, 4);
      p.rect(x + 18, 76, 2, 30, .62);
    } else {
      p.sprite("hurdle", x, 96, 3, .94);
      if (stage.variant === 3 && d.turn % 2 === 1) p.sprite("hurdle", x, 81, 3, .94);
    }
    const y = d.air ? 61 - (d.jumps - 1) * 24 : d.duck ? 100 : 94;
    p.sprite("runner", 48, 94, 2.4, .16);
    p.sprite(d.duck ? "closed" : "runner", 48, y, 2.4);
    if (stage.variant === 3) p.text(d.jumps + " / 2", 50, 17, 12, .68);
  }
};

function strike(s, lane) {
  const { d, stage } = s;
  d.flash = .20;
  const obscured = stage.variant === 2 && d.turn % 3 === 0;
  const index = d.targets.findIndex(item => item.x === lane);
  if (index < 0 || obscured) {
    mistake(s);
    return;
  }
  d.targets.splice(index, 1);
  point(s);
  if (d.targets.length === 0) {
    d.targets.push({ x: rand(s, 5), dx: 1 });
    if (stage.variant === 3) d.targets.push({ x: apart(s, d.targets[0].x), dx: -1 });
  }
}

const shooter = {
  setup: s => ({
    lane: 2, targets: s.stage.variant === 3 ? [{ x: 2, dx: 1 }, { x: 4, dx: -1 }] : [{ x: 2, dx: 1 }],
    turn: 0, beat: 0, fire: 0, fireLane: 2, flash: 0
  }),
  update(s, dt) {
    const { d, stage } = s;
    d.flash = Math.max(0, d.flash - dt);
    pulse(s, dt, [.56, .54, .52, .54][stage.variant], () => {
      d.turn += 1;
      for (const target of d.targets) [target.x, target.dx] = bounce(target.x, target.dx);
    });
    if (d.fire > 0) {
      d.fire -= dt;
      if (d.fire <= 0) strike(s, d.fireLane);
    }
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") d.lane = move(d.lane, key);
    else if (stage.variant !== 1) {
      d.fireLane = d.lane;
      strike(s, d.lane);
    } else if (d.fire <= 0) {
      d.fireLane = d.lane;
      d.fire = .36;
    }
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    grid(p);
    ground(p);
    lanes.forEach(x => p.sprite(stage.icon, x, 27, 2, .12));
    d.targets.forEach((target, index) => {
      const ghost = stage.variant === 2 && d.turn % 3 === 0 && !preview;
      p.sprite(stage.icon, lanes[target.x], 28 + index * 19, 2.65, ghost ? .3 : 1);
    });
    p.sprite("target", lanes[d.lane], 89, 2.35);
    p.dots(lanes[d.lane], 45, lanes[d.lane], 74, .52);
    if (d.fire > 0 || d.flash > 0) {
      const y = d.fire > 0 ? 31 + d.fire / .36 * 45 : 32;
      p.rect(lanes[d.fireLane] - 1, y, 3, 6, .95);
    }
  }
};

function resetBall(s, ball) {
  if (s.stage.variant === 1) {
    const target = s.d.bricks.findIndex(Boolean);
    const starts = [];
    for (let start = 0; start < lanes.length; start += 1) {
      for (const direction of [-1, 1]) {
        let [finish, dx] = [start, direction];
        for (let step = 0; step < 6; step += 1) [finish, dx] = bounce(finish, dx);
        if (finish === target) starts.push([start, direction]);
      }
    }
    [ball.x, ball.dx] = starts.length ? starts[rand(s, starts.length)] : [2, 1];
  } else {
    ball.x = rand(s, 5);
    ball.dx = rand(s, 2) === 0 ? -1 : 1;
  }
  ball.y = 0;
  ball.dy = 1;
}

function flyBall(s, ball) {
  const { d, stage } = s;
  [ball.x, ball.dx] = bounce(ball.x, ball.dx);
  ball.y += ball.dy;
  if (ball.y === 3) {
    if (ball.x !== d.lane) {
      mistake(s);
      resetBall(s, ball);
      return;
    }
    ball.dy = -1;
    if (d.spin) {
      ball.dx *= -1;
      d.spin = false;
    }
    if (stage.variant !== 1) point(s);
  } else if (ball.y === 0) {
    ball.dy = 1;
    if (stage.variant === 1 && d.bricks[ball.x]) {
      d.bricks[ball.x] = false;
      point(s);
      if (!s.outcome) resetBall(s, ball);
    }
  }
}

const pong = {
  setup: s => ({
    lane: 2, spin: false, bricks: [true, true, true, true, true],
    balls: s.stage.variant === 3
      ? [{ x: 1, y: 0, dx: 1, dy: 1, clock: 0 }, { x: 3, y: 1, dx: -1, dy: -1, clock: 0 }]
      : [{ x: 1, y: 0, dx: 1, dy: 1, clock: 0 }]
  }),
  update(s, dt) {
    const period = [.53, .42, .47, .53][s.stage.variant];
    for (const ball of s.d.balls) {
      ball.clock += dt;
      while (!s.outcome && ball.clock >= period) {
        ball.clock -= period;
        flyBall(s, ball);
      }
    }
  },
  input(s, key) {
    if (key !== "action") s.d.lane = move(s.d.lane, key);
    else if (s.stage.variant === 2) s.d.spin = true;
  },
  draw(s, p) {
    const { d, stage } = s;
    grid(p);
    p.outline(13, 12, 294, 88, .4);
    if (stage.variant === 1) {
      d.bricks.forEach((present, i) => p.outline(lanes[i] - 17, 15, 34, 9, present ? .95 : .2, 2));
    }
    for (const ball of d.balls) {
      const x = lanes[ball.x];
      p.rect(x - 3, 28 + ball.y * 19, 7, 7);
      let [land, direction] = [ball.x, ball.dx];
      for (let i = ball.y; i < 3; i += 1) [land, direction] = bounce(land, direction);
      if (ball.dy > 0) p.text("▼", lanes[land], 99, 10, .66);
    }
    p.rect(lanes[d.lane] - 16, 109, 32, 5);
    if (d.spin) mark(p, lanes[d.lane], 117, 27);
  }
};

function nextClimb(s) {
  const { d, stage } = s;
  d.target = apart(s, d.target);
  d.trap = apart(s, d.target);
  d.phase = 0;
  d.hover = false;
  d.saved = false;
  d.anchor = false;
  d.wind = rand(s, 2) ? 1 : -1;
  if (stage.variant === 2) d.origin = apart(s, d.target);
}

const climb = {
  setup: () => ({ lane: 2, target: 2, origin: 1, trap: 3, phase: 0, beat: 0, hover: false, saved: false, anchor: false, wind: 1 }),
  update(s, dt) {
    const { d, stage } = s;
    pulse(s, dt, [.39, .38, .37, .37][stage.variant], () => {
      if (d.hover) {
        d.hover = false;
        return;
      }
      d.phase += 1;
      if (stage.variant === 3 && d.phase === 2 && !d.anchor) d.lane = clamp(d.lane + d.wind, 0, 4);
      if (d.phase < 4) return;
      if (d.lane === d.target) point(s);
      else mistake(s);
      nextClimb(s);
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") d.lane = move(d.lane, key);
    else if (stage.variant === 1 && !d.saved) {
      d.hover = true;
      d.saved = true;
    } else if (stage.variant === 3) d.anchor = true;
  },
  draw(s, p, preview) {
    const { d, stage } = s;
    grid(p);
    p.sprite("cloud", 35, 38, 2, .24);
    p.sprite("cloud", 285, 59, 2, .22);
    p.sprite("cloud", 120, 112, 2, .2);
    const x = lanes[stage.variant === 2 && d.phase < 2 ? d.origin : d.target];
    const y = preview ? 78 : 100;
    if (stage.variant === 0) p.sprite("cloud", x, y, 3.8);
    else p.rect(x - 23, y, 46, 5);
    if (stage.variant === 1) p.dots(lanes[d.trap] - 22, y + 2, lanes[d.trap] + 22, y + 2, .55);
    if (stage.variant === 2) p.text("▲", lanes[d.target], 116, 12, .73);
    if (stage.variant === 3) p.text(d.anchor ? "HOLD" : d.wind < 0 ? "<< WIND" : "WIND >>", 160, 13, 11, .78);
    p.sprite("person", lanes[d.lane], [51, 36, 51, 77][preview ? 1 : d.phase], 2.3);
  }
};

export const arcade = {
  catch: catcher, cross: crossing, dodge: dodger, whack: whacker,
  relay, jump: runner, shot: shooter, pong, climb
};
