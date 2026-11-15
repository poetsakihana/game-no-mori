import { arcade } from "./arcade.js";
import { puzzles } from "./puzzles.js";
import { timing } from "./timing.js";

const games = { ...arcade, ...puzzles, ...timing };

export function sessionFor(stage, random = Math.random) {
  const game = games[stage.kind];
  const session = {
    stage, game, random, score: 0, misses: 0, time: stage.seconds,
    outcome: null, signal: 0, lastSignal: null
  };
  session.d = game.setup(session);
  return session;
}

export function updateSession(session, seconds) {
  if (session.outcome) return;
  const dt = Math.min(seconds, session.time);
  session.time = Math.max(0, session.time - seconds);
  session.game.update?.(session, dt);
  if (!session.outcome && session.time <= 0) session.outcome = "time";
}

export function inputSession(session, key) {
  if (!session.outcome) session.game.input(session, key);
}

export function drawSession(session, display, preview = false) {
  display.clear();
  session.game.draw(session, display, preview);
}
