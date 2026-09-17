import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSimulation } from '../src/core/simulate.js';
import { POLICIES } from '../tools/simulate.js';
import { RUN_DURATION } from '../src/core/constants.js';

// Proof the game is winnable start to finish: drives the exact same
// core/simulate.js the browser build and the headless simulator use,
// with a scripted policy and a fixed seed known (from BALANCE.md's
// 1000-run batch) to be a win.
test('bot playthrough: a competent scripted policy can survive a full run', () => {
  const state = runSimulation(1, POLICIES.balanced(), 1 / 60, 50_000);

  assert.equal(state.gameOver, 'win');
  assert.ok(state.time >= RUN_DURATION);
  assert.ok(state.coreHP > 0);
  assert.ok(state.score > 0);
});

test('bot playthrough: a heat-blind policy reliably fails (sanity check on the loss conditions)', () => {
  const state = runSimulation(1, POLICIES['turret-heavy'](), 1 / 60, 50_000);

  assert.notEqual(state.gameOver, null);
  assert.notEqual(state.gameOver, 'win');
});
