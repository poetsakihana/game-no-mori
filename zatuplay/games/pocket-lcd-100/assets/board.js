export const lanes = [44, 102, 160, 218, 276];
export const pads = [80, 160, 240];
export const keys = ["left", "action", "right"];

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const wrap = (value, max) => (value % max + max) % max;
export const shift = key => key === "left" ? -1 : key === "right" ? 1 : 0;
export const move = (lane, key, last = 4) => clamp(lane + shift(key), 0, last);
export const rand = (session, max) => Math.floor(session.random() * max);
export const apart = (session, current, count = 5) => wrap(current + 1 + rand(session, count - 1), count);

export function shuffled(session, list) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = rand(session, index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function point(session) {
  if (session.outcome) return;
  session.score += 1;
  session.signal += 1;
  session.lastSignal = "point";
  if (session.score >= session.stage.goal) session.outcome = "clear";
}

export function mistake(session) {
  if (session.outcome) return;
  session.misses += 1;
  session.signal += 1;
  session.lastSignal = "miss";
  if (session.misses >= 3) session.outcome = "miss";
}

export function pulse(session, dt, period, next) {
  session.d.beat += dt;
  while (!session.outcome && session.d.beat >= period) {
    session.d.beat -= period;
    next();
  }
}

export function grid(screen, positions = lanes) {
  for (const x of positions) screen.dots(x, 7, x, 105, .16);
}

export function ground(screen, height = 107) {
  screen.rect(13, height, 294, 2, .65);
  for (let x = 16; x < 304; x += 16) screen.line(x, height + 6, x + 6, height + 3, .32);
}

export function mark(screen, x, y, width = 32, alpha = .85) {
  screen.rect(x - width / 2, y, width, 2, alpha);
  screen.rect(x - width / 2 + 4, y + 4, width - 8, 1, alpha);
}

export function cursor(screen, x, y, width = 36, height = 31) {
  const l = x - width / 2;
  const r = x + width / 2 - 1;
  const t = y - height / 2;
  const b = y + height / 2 - 1;
  for (const [left, top, dx, dy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]]) {
    screen.line(left, top, left + dx * 5, top, .8, 2);
    screen.line(left, top, left, top + dy * 5, .8, 2);
  }
}

export function bounce(x, direction, last = 4) {
  if (x + direction < 0 || x + direction > last) direction *= -1;
  return [x + direction, direction];
}
