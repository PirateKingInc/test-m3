import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state.js';
import * as heat from '../src/systems/heat.js';
import { HEAT_MAX, COOLANT_COST } from '../src/core/constants.js';

test('heat: decays passively toward zero with no input', () => {
  const state = createInitialState(1);
  state.heat = 50;
  for (let i = 0; i < 60; i++) heat.step(state, 1 / 60);
  assert.ok(state.heat < 50, `expected heat to have decayed, got ${state.heat}`);

  for (let i = 0; i < 6000; i++) heat.step(state, 1 / 60);
  assert.equal(state.heat, 0);
});

test('heat: meltdown fires exactly at the threshold, not before', () => {
  const below = createInitialState(1);
  below.heat = HEAT_MAX - 0.01;
  heat.step(below, 0); // dt=0 so passive decay doesn't pull it under
  assert.equal(below.gameOver, null);

  const at = createInitialState(1);
  at.heat = HEAT_MAX;
  heat.step(at, 0);
  assert.equal(at.gameOver, 'meltdown');
});

test('heat: core-destroyed fires when coreHP <= 0 and heat is safe', () => {
  const state = createInitialState(1);
  state.coreHP = 0;
  heat.step(state, 1 / 60);
  assert.equal(state.gameOver, 'core-destroyed');
});

test('heat: coolant action spends energy and reduces heat, then is consumed', () => {
  const state = createInitialState(1);
  state.heat = 80;
  state.energy = 100;
  state.pendingActions.push({ type: 'coolant' });
  heat.step(state, 1 / 60);

  assert.equal(state.energy, 100 - COOLANT_COST);
  assert.ok(state.heat < 80);
  assert.equal(state.pendingActions.length, 0);
  assert.equal(state.stats.coolantVents, 1);
});

test('heat: unaffordable coolant action is dropped without charging energy', () => {
  const state = createInitialState(1);
  state.energy = 0;
  const before = state.heat;
  state.pendingActions.push({ type: 'coolant' });
  heat.step(state, 0);

  assert.equal(state.energy, 0);
  assert.equal(state.heat, before);
  assert.equal(state.pendingActions.length, 0);
});

test('heat: leaves non-coolant pending actions for other systems', () => {
  const state = createInitialState(1);
  state.pendingActions.push({ type: 'build', slot: 0 });
  heat.step(state, 1 / 60);
  assert.equal(state.pendingActions.length, 1);
  assert.equal(state.pendingActions[0].type, 'build');
});
