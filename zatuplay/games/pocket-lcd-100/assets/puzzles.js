import { apart, clamp, cursor, grid, keys, lanes, mark, mistake, move, pads, point, pulse, rand, shift, shuffled, wrap } from "./board.js";

function sequence(s) {
  const size = (s.stage.variant === 2 ? 4 : 2) + Math.floor(s.score / 2);
  const values = Array.from({ length: size }, () => rand(s, 3));
  const answer = s.stage.variant === 1 ? [...values].reverse()
    : s.stage.variant === 3 ? values.map(value => 2 - value)
    : values;
  return { values, answer, showing: true, beat: 0, index: 0 };
}

const memory = {
  setup: sequence,
  update(s, dt) {
    if (!s.d.showing) return;
    const { d } = s;
    d.beat += dt;
    while (d.beat >= .69 && d.showing) {
      d.beat -= .69;
      d.index += 1;
      if (d.index === d.values.length) {
        d.showing = false;
        d.index = 0;
      }
    }
  },
  input(s, key) {
    const { d } = s;
    if (d.showing) return;
    if (keys[d.answer[d.index]] !== key) {
      mistake(s);
      s.d = sequence(s);
      return;
    }
    d.index += 1;
    if (d.index < d.answer.length) return;
    point(s);
    s.d = sequence(s);
  },
  draw(s, p, preview) {
    const { d } = s;
    grid(p, pads);
    p.text(d.showing ? "WATCH" : "PLAY", 160, 16, 12, .8);
    pads.forEach((x, index) => {
      p.outline(x - 26, 37, 52, 54, .62, 2);
      const active = preview ? index === 1 : d.showing && d.beat < .45 && d.values[d.index] === index;
      p.sprite("bulb", x, 59, 3.15, active ? 1 : .23);
      p.text(["<", "A", ">"][index], x, 82, 12, active ? 1 : .47);
    });
    for (let index = 0; index < d.values.length; index += 1) {
      const x = 160 - (d.values.length - 1) * 7 + index * 14;
      p.outline(x - 4, 103, 8, 8, .57);
      if (index < d.index) p.rect(x - 2, 105, 4, 4, .86);
    }
  }
};

function turnPipe(board, variant, slot) {
  const last = board.length;
  const affected = variant === 3 ? [wrap(slot - 1, last), slot, wrap(slot + 1, last)]
    : variant === 2 && slot < last - 1 ? [slot, slot + 1]
    : [slot];
  const possibilities = [3, 4, 2, 2][variant];
  for (const index of affected) board[index] = (board[index] + 1) % possibilities;
}

function setPipes(s) {
  const variant = s.stage.variant;
  const size = [3, 4, 4, 5][variant];
  const target = Array.from({ length: size }, () => variant % 2 === 0 ? 0 : rand(s, variant === 1 ? 4 : 2));
  const board = [...target];
  const turns = 2 + variant + s.score;
  for (let step = 0; step < turns; step += 1) turnPipe(board, variant, rand(s, size));
  if (board.every((value, index) => value === target[index])) turnPipe(board, variant, 0);
  return { board, target, slot: Math.floor(size / 2) };
}

function paintPipe(p, x, y, value, elbow, size, opacity) {
  p.outline(x - size, y - size, 2 * size, 2 * size, opacity * .45);
  const deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const directions = elbow ? [value, (value + 1) % 4] : value === 0 ? [0, 2] : value === 1 ? [1, 3] : [1, 2];
  for (const index of directions) {
    const [dx, dy] = deltas[index];
    p.line(x, y, x + dx * size, y + dy * size, opacity, size > 13 ? 5 : 3);
  }
}

const pipes = {
  setup: setPipes,
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") {
      d.slot = move(d.slot, key, d.board.length - 1);
    } else {
      turnPipe(d.board, stage.variant, d.slot);
      if (d.board.every((value, index) => value === d.target[index])) {
        point(s);
        if (!s.outcome) s.d = setPipes(s);
      }
    }
  },
  draw(s, p) {
    const { d, stage } = s;
    p.text(stage.variant % 2 ? "MATCH" : "FLOW ↓", 160, 14, 11, .83);
    d.board.forEach((value, index) => {
      const x = 160 - (d.board.length - 1) * 26 + index * 52;
      paintPipe(p, x, 55, value, stage.variant === 1, 18, .93);
      if (stage.variant % 2) paintPipe(p, x, 103, d.target[index], stage.variant === 1, 9, .68);
      else p.dots(x, 83, x, 105, .4);
      if (d.slot === index) cursor(p, x, 55, 44, 44);
    });
  }
};

const balance = {
  setup: () => ({ pos: 0, wind: 1, beat: 0, guard: false, placed: false }),
  update(s, dt) {
    const { d, stage } = s;
    pulse(s, dt, [1.02, 1.18, 1.05, 1.11][stage.variant], () => {
      const steady = Math.abs(d.pos) <= (stage.variant === 3 ? 0 : 1);
      if (steady && stage.variant !== 2) point(s);
      if (!d.guard) d.pos += d.wind * (stage.variant === 3 ? 2 : 1);
      if (Math.abs(d.pos) > 2) {
        mistake(s);
        d.pos = 0;
      }
      d.wind = rand(s, 2) === 0 ? -1 : 1;
      d.placed = false;
      d.guard = false;
    });
  },
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") d.pos = clamp(d.pos + shift(key), -2, 2);
    else if (stage.variant === 1) d.guard = true;
    else if (stage.variant === 2 && !d.placed) {
      if (Math.abs(d.pos) <= 1) {
        d.placed = true;
        point(s);
      } else mistake(s);
    }
  },
  draw(s, p) {
    const { d, stage } = s;
    const slope = d.pos * 7;
    p.text(d.guard ? "SAIL DOWN" : d.wind < 0 ? "<< WIND" : "WIND >>", 160, 14, 13, .78);
    p.line(45, 75 - slope, 275, 75 + slope, .72, 2);
    p.line(45, 80 - slope, 275, 80 + slope, .28, 1);
    if (stage.variant === 2) {
      for (let i = 0; i <= Math.min(4, s.score); i += 1) {
        p.outline(142 + d.pos * 13, 67 - i * 6, 36, 7, .85, 2);
      }
    } else p.sprite(stage.variant === 1 ? "sail" : "person", 160 + d.pos * 28, 56, 3.1, 1);
    for (const x of lanes) p.outline(x - 13, 99, 26, 11, .41);
    p.rect(147, 99, 26, 11, .15);
    p.rect(lanes[d.pos + 2] - 10, 102, 20, 5);
    p.text("•", 160, 117, 12, .65);
  }
};

const mazeColumns = 5;
const mazeRows = 4;
const mazeDirections = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function mazeNeighbor(cell, direction) {
  const [dx, dy] = mazeDirections[direction];
  const x = cell % mazeColumns + dx;
  const y = Math.floor(cell / mazeColumns) + dy;
  return x >= 0 && x < mazeColumns && y >= 0 && y < mazeRows ? y * mazeColumns + x : -1;
}

function buildMaze(s) {
  const start = 15;
  const walls = Array(mazeColumns * mazeRows).fill(15);
  const visited = new Set([start]);
  const path = [start];
  while (path.length) {
    const cell = path.at(-1);
    const choices = mazeDirections.map((_, dir) => ({ dir, next: mazeNeighbor(cell, dir) }))
      .filter(({ next }) => next >= 0 && !visited.has(next));
    if (!choices.length) {
      path.pop();
      continue;
    }
    const { dir, next } = choices[rand(s, choices.length)];
    walls[cell] &= ~(1 << dir);
    walls[next] &= ~(1 << wrap(dir + 2, 4));
    visited.add(next);
    path.push(next);
  }
  return { cell: start, walls, seen: new Set([start]), heading: 0, exit: 4, key: 12, unlocked: s.stage.variant !== 2 };
}

function mirrorTile(cell) {
  return (cell % mazeColumns + Math.floor(cell / mazeColumns)) % 2 === 0;
}

const maze = {
  setup: buildMaze,
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") {
      const sign = stage.variant === 3 && mirrorTile(d.cell) ? -1 : 1;
      d.heading = wrap(d.heading + sign * shift(key), 4);
      return;
    }
    if (d.walls[d.cell] & 1 << d.heading) return;
    d.cell = mazeNeighbor(d.cell, d.heading);
    d.seen.add(d.cell);
    if (d.cell === d.key) d.unlocked = true;
    if (d.cell === d.exit && d.unlocked) point(s);
  },
  draw(s, p) {
    const { d, stage } = s;
    for (let cell = 0; cell < d.walls.length; cell += 1) {
      const x = 58 + cell % mazeColumns * 40;
      const y = 10 + Math.floor(cell / mazeColumns) * 26;
      const fog = stage.variant === 1 && !d.seen.has(cell);
      p.outline(x, y, 41, 27, .13);
      if (fog) p.rect(x + 3, y + 3, 35, 21, .12);
      if (stage.variant === 3 && mirrorTile(cell)) {
        for (let diagonal = 7; diagonal <= 30; diagonal += 7) p.line(x + diagonal, y + 21, x + diagonal + 5, y + 16, .25);
      }
      if (!fog && d.walls[cell] & 1) p.rect(x, y, 41, 2, .84);
      if (!fog && d.walls[cell] & 2) p.rect(x + 39, y, 2, 26, .84);
      if (!fog && d.walls[cell] & 4) p.rect(x, y + 25, 41, 2, .84);
      if (!fog && d.walls[cell] & 8) p.rect(x, y, 2, 26, .84);
      if (cell === d.exit) p.sprite("flag", x + 21, y + 13, 1.5, d.unlocked ? 1 : .4);
      if (cell === d.key && !d.unlocked) p.sprite("key", x + 21, y + 13, 1.7, .95);
      if (d.cell === cell) {
        p.rect(x + 12, y + 5, 16, 16, .27);
        p.text(["▲", "▶", "▼", "◀"][d.heading], x + 20, y + 13, 15, 1);
      }
    }
  }
};

const shapes = ["apple", "ball", "gem"];

function newParcel(s, d) {
  d.target = apart(s, d.target, 3);
  d.number = rand(s, 3);
  if (s.stage.variant === 2) d.order.push(d.order.shift());
  if (s.stage.variant === 3) {
    d.byNumber = !d.byNumber;
    d.numbers = shuffled(s, [0, 1, 2]);
  }
}

const sorter = {
  setup: s => ({ position: 1, target: 1, number: 1, order: [0, 1, 2], numbers: shuffled(s, [0, 1, 2]), byNumber: false }),
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") {
      d.position = move(d.position, key, 2);
      return;
    }
    const matches = stage.variant === 3 && d.byNumber
      ? d.numbers[d.position] === d.number
      : d.order[d.position] === d.target;
    if (matches) {
      point(s);
      newParcel(s, d);
    } else mistake(s);
  },
  draw(s, p) {
    const { d, stage } = s;
    grid(p, pads);
    p.outline(129, 16, 62, 42, .62, 2);
    if (stage.variant === 1) p.text("ABC"[d.target], 160, 36, 26, .94);
    else p.sprite(shapes[d.target], stage.variant === 3 ? 151 : 160, 37, 2.3);
    if (stage.variant === 3) {
      p.text(d.number + 1, 176, 36, 15);
      p.text(d.byNumber ? "NUM" : "SHAPE", 240, 35, 12);
    }
    pads.forEach((x, i) => {
      p.outline(x - 23, 73, 46, 28, .71, 2);
      if (stage.variant === 1) p.text("ABC"[d.order[i]], x, 88, 17);
      else p.sprite(shapes[d.order[i]], stage.variant === 3 ? x - 8 : x, 87, 1.75);
      if (stage.variant === 3) p.text(d.numbers[i] + 1, x + 12, 87, 13);
    });
    mark(p, pads[d.position], 107, 37);
  }
};

function toggle(lamps, variant, lane) {
  const related = variant === 2 ? [lane, wrap(lane + 2, 5)]
    : variant === 1 ? [wrap(lane - 1, 5), lane, wrap(lane + 1, 5)]
    : [lane - 1, lane, lane + 1].filter(index => index >= 0 && index <= 4);
  for (const index of related) lamps[index] = !lamps[index];
}

function lampPuzzle(s) {
  const target = s.stage.variant === 3;
  const lamps = Array(5).fill(target);
  for (let moves = 0; moves < 2 + s.stage.variant + s.score; moves += 1) {
    toggle(lamps, s.stage.variant, rand(s, 5));
  }
  if (lamps.every(lamp => lamp === target)) toggle(lamps, s.stage.variant, 2);
  return { lamps, target, slot: 2 };
}

const lights = {
  setup: lampPuzzle,
  input(s, key) {
    const { d, stage } = s;
    if (key !== "action") {
      d.slot = move(d.slot, key);
    } else {
      toggle(d.lamps, stage.variant, d.slot);
      if (d.lamps.every(lamp => lamp === d.target)) {
        point(s);
        if (!s.outcome) s.d = lampPuzzle(s);
      }
    }
  },
  draw(s, p) {
    const { d, stage } = s;
    p.text(d.target ? "ALL ON" : "ALL OFF", 160, 16, 13, .8);
    p.line(44, 84, 276, 84, .32);
    d.lamps.forEach((on, index) => {
      const x = lanes[index];
      p.outline(x - 20, 35, 40, 45, .48, 2);
      p.sprite("lamp", x, 57, 2.8, on ? 1 : .2);
    });
    cursor(p, lanes[d.slot], 57, 47, 55);
    const diameter = stage.variant === 2 ? 2 : 1;
    for (const index of [d.slot, d.slot + diameter, ...(stage.variant === 2 ? [] : [d.slot - 1])]) {
      const slot = stage.variant === 1 || stage.variant === 2 ? wrap(index, 5) : index;
      if (slot >= 0 && slot < 5) mark(p, lanes[slot], 99, 23, slot === d.slot ? 1 : .4);
    }
  }
};

const code = {
  setup(s) {
    const values = Array.from({ length: s.stage.goal }, () => rand(s, 10));
    const variant = s.stage.variant;
    let clues = [...values];
    if (variant === 1) clues.reverse();
    if (variant === 2) clues = values.map(value => {
      const first = rand(s, value + 1);
      return first + "+" + (value - first);
    });
    if (variant === 3) clues = values.map(value => 10 - value);
    return { values, clues, dial: 0 };
  },
  input(s, key) {
    const { d } = s;
    if (key !== "action") d.dial = wrap(d.dial + shift(key), 10);
    else if (d.dial === d.values[s.score]) point(s);
    else mistake(s);
  },
  draw(s, p) {
    const { d, stage } = s;
    const current = stage.variant === 1 ? d.clues.length - 1 - s.score : s.score;
    d.clues.forEach((clue, index) => {
      const x = 160 - (d.clues.length - 1) * 22 + 44 * index;
      const done = stage.variant === 1 ? index > current : index < current;
      p.outline(x - 19, 18, 38, 29, .58);
      p.text(clue, x, 32, 15, done ? .38 : .95);
      if (current === index) mark(p, x, 52, 29);
    });
    p.outline(134, 68, 52, 42, .91, 2);
    p.text(d.dial, 160, 88, 28);
    p.text("< " + wrap(d.dial - 1, 10), 108, 88, 12, .67);
    p.text(wrap(d.dial + 1, 10) + " >", 212, 88, 12, .67);
  }
};

function equation(s) {
  const mode = s.stage.variant;
  const a = mode === 2 ? 1 + rand(s, 9) : rand(s, 10);
  const b = mode === 2 ? 1 + rand(s, 9) : rand(s, 10);
  if (mode === 1) return { label: a + "+" + b, value: a + b };
  if (mode === 2) return { label: a + "×" + b, value: a * b };
  if (mode === 3) return { label: a + "−" + b, value: a - b };
  return { label: String(a), value: a };
}

function question(s) {
  const left = equation(s);
  const right = rand(s, 5) === 0 ? left : equation(s);
  return { left, right };
}

const math = {
  setup: question,
  input(s, key) {
    const { d } = s;
    if (shift(key) === Math.sign(d.left.value - d.right.value)) point(s);
    else mistake(s);
    s.d = question(s);
  },
  draw(s, p) {
    const { d } = s;
    p.outline(37, 22, 103, 46, .56, 2);
    p.outline(180, 22, 103, 46, .56, 2);
    p.text(d.left.label, 89, 44, 23);
    p.text(d.right.label, 231, 44, 23);
    p.text("?", 160, 44, 15, .7);
    pads.forEach((x, index) => {
      p.outline(x - 20, 85, 40, 23, .59);
      p.text(["<", "=", ">"][index], x, 96, 15);
    });
  }
};

function rank(value, mode) {
  if (mode === 1) return -value;
  if (mode === 2) return (value % 2 === 0 ? 10 : 0) + value;
  if (mode === 3) return value % 10;
  return value;
}

function arranged(s, values) {
  return values.every((value, index) => !index || rank(values[index - 1], s.stage.variant) < rank(value, s.stage.variant));
}

function orderPuzzle(s) {
  const values = shuffled(s, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5)
    .map(value => s.stage.variant === 3 ? value + 10 * (1 + rand(s, 9)) : value);
  if (arranged(s, values)) [values[0], values[1]] = [values[1], values[0]];
  return { values, slot: 1 };
}

const order = {
  setup: orderPuzzle,
  input(s, key) {
    const { d } = s;
    if (key !== "action") {
      d.slot = move(d.slot, key, 3);
      return;
    }
    const { slot, values } = d;
    [values[slot], values[slot + 1]] = [values[slot + 1], values[slot]];
    if (arranged(s, values)) {
      point(s);
      if (!s.outcome) s.d = orderPuzzle(s);
    }
  },
  draw(s, p) {
    const { d, stage } = s;
    p.text(["SMALL → BIG", "BIG → SMALL", "ODD → EVEN", "ONES DIGIT"][stage.variant], 160, 20, 13, .8);
    d.values.forEach((value, index) => {
      const x = lanes[index];
      p.outline(x - 22, 39, 44, 42, .72, 2);
      p.text(value, x, 60, 22);
    });
    const x = (lanes[d.slot] + lanes[d.slot + 1]) / 2;
    p.outline(x - 54, 34, 108, 52, .8, 2);
    p.text("< SWAP >", x, 103, 11, .8);
  }
};

export const puzzles = { memory, pipes, balance, maze, sort: sorter, lights, code, math, order };
