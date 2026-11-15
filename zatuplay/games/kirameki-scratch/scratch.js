import { WIDTH, HEIGHT } from "./catalog.js";

export const CELL = 8;
export const COLUMNS = WIDTH / CELL;
export const ROWS = HEIGHT / CELL;
const BYTE_COUNT = (COLUMNS * ROWS) / 8;
const FINISH_RATIO = 0.94;

export function decodeMask(encoded) {
  const bytes = new Uint8Array(BYTE_COUNT);
  if (!encoded) return bytes;
  try {
    const raw = atob(encoded);
    if (raw.length === bytes.length) {
      for (let i = 0; i < bytes.length; i++) bytes[i] = raw.charCodeAt(i);
    }
  } catch {
    return bytes;
  }
  return bytes;
}

export function encodeMask(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

export function hasCell(bytes, index) {
  return (bytes[index >> 3] & (1 << (index & 7))) !== 0;
}

export function trace(bytes, from, to, radius) {
  const minX = Math.max(0, Math.floor((Math.min(from.x, to.x) - radius) / CELL));
  const maxX = Math.min(COLUMNS - 1, Math.floor((Math.max(from.x, to.x) + radius) / CELL));
  const minY = Math.max(0, Math.floor((Math.min(from.y, to.y) - radius) / CELL));
  const maxY = Math.min(ROWS - 1, Math.floor((Math.max(from.y, to.y) + radius) / CELL));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const radiusSquared = radius * radius;
  let changed = false;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const relativeX = (x + 0.5) * CELL - from.x;
      const relativeY = (y + 0.5) * CELL - from.y;
      const t = length ? Math.min(1, Math.max(0, (relativeX * dx + relativeY * dy) / length)) : 0;
      const distanceX = relativeX - t * dx;
      const distanceY = relativeY - t * dy;
      if (distanceX * distanceX + distanceY * distanceY > radiusSquared) continue;
      const index = y * COLUMNS + x;
      if (hasCell(bytes, index)) continue;
      bytes[index >> 3] |= 1 << (index & 7);
      changed = true;
    }
  }
  return changed;
}

export function mergeMasks(bytes, encoded) {
  const existing = decodeMask(encoded);
  let changed = false;
  for (let i = 0; i < bytes.length; i++) {
    const merged = bytes[i] | existing[i];
    if (merged !== bytes[i]) {
      bytes[i] = merged;
      changed = true;
    }
  }
  return changed;
}

export function score(bytes, targets) {
  let hit = 0;
  for (const index of targets) if (hasCell(bytes, index)) hit++;
  const fraction = targets.length ? hit / targets.length : 0;
  return fraction >= FINISH_RATIO ? 100 : Math.floor(fraction / FINISH_RATIO * 100);
}

export function restoreScratch(context, bytes) {
  context.save();
  context.globalCompositeOperation = "destination-out";
  for (let y = 0; y < ROWS; y++) {
    let start = -1;
    for (let x = 0; x <= COLUMNS; x++) {
      const scratched = x < COLUMNS && hasCell(bytes, y * COLUMNS + x);
      if (scratched && start < 0) start = x;
      if (!scratched && start >= 0) {
        context.fillRect(start * CELL, y * CELL, (x - start) * CELL, CELL);
        start = -1;
      }
    }
  }
  context.restore();
}

export function erase(context, from, to, radius, opacity = 1) {
  context.save();
  context.globalAlpha = opacity;
  context.globalCompositeOperation = "destination-out";
  context.lineWidth = radius * 2;
  context.lineCap = "round";
  context.beginPath();
  if (from.x === to.x && from.y === to.y) {
    context.arc(to.x, to.y, radius, 0, Math.PI * 2);
    context.fill();
  } else {
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }
  context.restore();
}
