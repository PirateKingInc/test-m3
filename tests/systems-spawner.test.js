import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state.js';
import * as spawner from '../src/systems/spawner.js';

function runFor(state, seconds, dt = 1 / 60) {
  const ticks = Math.round(seconds / dt);
  for (let i = 0; i < ticks; i++) {
    state.time += dt;
    spawner.step(state, dt);
  }
  return state;
}

test('spawner: higher heat measurably increases enemy count over a fixed window', () => {
  const cold = createInitialState(1);
  cold.heat = 0;
  runFor(cold, 60);

  const hot = createInitialState(1);
  hot.heat = 95;
  runFor(hot, 60);

  assert.ok(
    hot.enemies.length > cold.enemies.length,
    `expected hot(${hot.enemies.length}) > cold(${cold.enemies.length})`,
  );
});

test('spawner: wave escalates with elapsed time', () => {
  const state = createInitialState(1);
  runFor(state, 55); // WAVE_INTERVAL is 25s, so two escalations expected
  assert.ok(state.wave >= 2, `expected wave >= 2, got ${state.wave}`);
});

test('spawner: spawns at least one enemy over a full run-length window', () => {
  const state = createInitialState(1);
  runFor(state, 30);
  assert.ok(state.enemies.length > 0);
});
