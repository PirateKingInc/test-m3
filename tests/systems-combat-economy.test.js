import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state.js';
import * as combat from '../src/systems/combat.js';
import * as economy from '../src/systems/economy.js';
import { TURRET_BUILD_COST, CORE_HIT_RADIUS } from '../src/core/constants.js';

test('combat: build action creates a turret and spends energy', () => {
  const state = createInitialState(1);
  const before = state.energy;
  state.pendingActions.push({ type: 'build', slot: 0 });
  combat.step(state, 1 / 60);

  assert.equal(state.turrets[0].level, 1);
  assert.equal(state.energy, before - TURRET_BUILD_COST);
  assert.equal(state.stats.built, 1);
  assert.equal(state.pendingActions.length, 0);
});

test('combat: build action is dropped (not requeued) when unaffordable', () => {
  const state = createInitialState(1);
  state.energy = 0;
  state.pendingActions.push({ type: 'build', slot: 0 });
  combat.step(state, 1 / 60);

  assert.equal(state.turrets[0].level, 0);
  assert.equal(state.pendingActions.length, 0);
});

test('combat: turret damages and kills an in-range enemy', () => {
  const state = createInitialState(1);
  state.turrets[0].level = 1;
  state.turrets[0].cooldown = 0;
  state.enemies.push({ id: 1, angle: 0, radius: 1, hp: 5, maxHp: 5, speed: 0, damage: 10 });

  combat.step(state, 1 / 60);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.stats.kills, 1);
  assert.ok(state.score > 0);
});

test('combat: enemy reaching the core deals damage and is removed', () => {
  const state = createInitialState(1);
  state.enemies.push({
    id: 1,
    angle: 0,
    radius: CORE_HIT_RADIUS + 0.01,
    hp: 100,
    maxHp: 100,
    speed: 10,
    damage: 15,
  });
  const beforeHP = state.coreHP;

  combat.step(state, 1 / 60);

  assert.equal(state.coreHP, beforeHP - 15);
  assert.equal(state.enemies.length, 0);
});

test('economy: energy income accrues at full rate when heat is at zero', () => {
  const state = createInitialState(1);
  state.heat = 0;
  const before = state.energy;
  economy.step(state, 1);
  assert.ok(state.energy > before);
});

// --- Integration: cross-system coupling required by SPEC.md ---

test('integration: building a turret increases heat growth and reduces net energy vs. an idle run', () => {
  const idle = createInitialState(1);
  const active = createInitialState(1);
  active.pendingActions.push({ type: 'build', slot: 0 });

  const dt = 1 / 60;
  const ticks = 60 * 60; // 60 simulated seconds
  for (let i = 0; i < ticks; i++) {
    idle.time += dt;
    active.time += dt;
    // Spawner import avoided here to keep this test focused on
    // combat+economy coupling; enemies are injected directly so both
    // runs face identical targets regardless of spawner RNG timing.
    if (i % 30 === 0) {
      idle.enemies.push({ id: idle.nextEnemyId++, angle: 0, radius: 2, hp: 40, maxHp: 40, speed: 0.5, damage: 5 });
      active.enemies.push({ id: active.nextEnemyId++, angle: 0, radius: 2, hp: 40, maxHp: 40, speed: 0.5, damage: 5 });
    }
    combat.step(idle, dt);
    combat.step(active, dt);
    economy.step(idle, dt);
    economy.step(active, dt);
  }

  assert.ok(active.heat > idle.heat, `expected active.heat(${active.heat}) > idle.heat(${idle.heat})`);
  assert.ok(
    active.energy < idle.energy,
    `expected active.energy(${active.energy}) < idle.energy(${idle.energy})`,
  );
});

test('integration: high heat measurably throttles both turret fire rate and energy income vs. an identical low-heat run', () => {
  const lowHeat = createInitialState(2);
  const highHeat = createInitialState(2);
  lowHeat.heat = 0;
  highHeat.heat = 95;
  for (const s of [lowHeat, highHeat]) {
    s.turrets[0].level = 1;
    s.turrets[0].cooldown = 0;
  }

  const dt = 1 / 60;
  const ticks = 60 * 8; // 8 simulated seconds
  for (let i = 0; i < ticks; i++) {
    // Keep a permanent, never-dying target in range for both runs.
    for (const s of [lowHeat, highHeat]) {
      if (s.enemies.length === 0) {
        s.enemies.push({ id: s.nextEnemyId++, angle: 0, radius: 1, hp: 1e9, maxHp: 1e9, speed: 0, damage: 1 });
      }
    }
    combat.step(lowHeat, dt);
    combat.step(highHeat, dt);
    economy.step(lowHeat, dt);
    economy.step(highHeat, dt);
  }

  assert.ok(
    lowHeat.stats.shotsFired > highHeat.stats.shotsFired,
    `expected lowHeat shots(${lowHeat.stats.shotsFired}) > highHeat shots(${highHeat.stats.shotsFired})`,
  );
  assert.ok(
    lowHeat.energy > highHeat.energy,
    `expected lowHeat.energy(${lowHeat.energy}) > highHeat.energy(${highHeat.energy})`,
  );
});
