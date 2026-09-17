import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, step, runSimulation } from '../src/core/simulate.js';

test('createInitialState: shape and determinism-relevant fields', () => {
  const state = createInitialState(42);
  assert.equal(state.time, 0);
  assert.equal(state.heat, 0);
  assert.equal(state.gameOver, null);
  assert.equal(state.turrets.length, 6);
  assert.equal(typeof state.rng, 'function');
});

test('step: same seed and same actions produce identical state after N ticks', () => {
  const s1 = createInitialState(7);
  const s2 = createInitialState(7);
  for (let i = 0; i < 300; i++) {
    step(s1, 1 / 60);
    step(s2, 1 / 60);
  }
  assert.equal(s1.time, s2.time);
  assert.equal(s1.heat, s2.heat);
  assert.equal(s1.energy, s2.energy);
  assert.deepEqual(
    s1.enemies.map((e) => e.id),
    s2.enemies.map((e) => e.id),
  );
});

test('step: different seeds are independent RNG streams', () => {
  const a = createInitialState(1);
  const b = createInitialState(2);
  const drawsA = [a.rng(), a.rng(), a.rng()];
  const drawsB = [b.rng(), b.rng(), b.rng()];
  assert.notDeepEqual(drawsA, drawsB);
});

test('step: does nothing once gameOver is set', () => {
  const state = createInitialState(1);
  state.gameOver = 'meltdown';
  const before = state.time;
  step(state, 1 / 60);
  assert.equal(state.time, before);
});

test('step: time advances by dt each tick', () => {
  const state = createInitialState(1);
  step(state, 1 / 60);
  assert.ok(Math.abs(state.time - 1 / 60) < 1e-9);
});

test('runSimulation: a no-op policy eventually ends the run (win, since nothing threatens the core yet)', () => {
  const state = runSimulation(1, () => [], 1 / 60, 50000);
  assert.ok(state.gameOver !== null);
});
