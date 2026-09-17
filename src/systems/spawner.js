// Spawner system: enemy generation and wave/threat progression.
//
// Reads: state.heat, state.time, state.wave
// Writes: state.enemies, state.wave, state.threat, state.spawnTimer
//
// The spawn-rate multiplier reads state.heat directly: an overheating
// reactor draws a heavier, faster wave. This is the primary feedback
// loop in the game — firing turrets raises heat, which raises spawn
// pressure, which demands more turret fire.
//
// Spawn timing and enemy stats are jittered from state.rng() (+/- a
// fixed fraction). Without this, two enemies at the same wave were
// bit-for-bit identical and the seed only affected cosmetic spawn
// angle — 1000 simulated runs per policy produced ~zero variance,
// which defeated the point of Monte Carlo balance testing. See
// BALANCE.md for how this was found.

import {
  HEAT_MAX,
  SPAWN_HEAT_GAIN,
  SPAWN_RADIUS,
  SPAWN_INTERVAL_JITTER,
  WAVE_INTERVAL,
  ENEMY_BASE_HP,
  ENEMY_HP_PER_WAVE,
  ENEMY_HP_PER_WAVE_SQ,
  ENEMY_BASE_SPEED,
  ENEMY_SPEED_PER_WAVE,
  ENEMY_BASE_DAMAGE,
  ENEMY_DAMAGE_PER_WAVE,
  ENEMY_DAMAGE_PER_WAVE_SQ,
  ENEMY_STAT_JITTER,
} from '../core/constants.js';
import { rngRange } from '../core/rng.js';

function baseSpawnInterval(wave) {
  return Math.max(0.35, 1.8 - wave * 0.05);
}

function enemyStatsForWave(wave, rng) {
  const jitter = () => rngRange(rng, 1 - ENEMY_STAT_JITTER, 1 + ENEMY_STAT_JITTER);
  return {
    hp: (ENEMY_BASE_HP + wave * ENEMY_HP_PER_WAVE + wave * wave * ENEMY_HP_PER_WAVE_SQ) * jitter(),
    speed: (ENEMY_BASE_SPEED + wave * ENEMY_SPEED_PER_WAVE) * jitter(),
    damage:
      (ENEMY_BASE_DAMAGE + wave * ENEMY_DAMAGE_PER_WAVE + wave * wave * ENEMY_DAMAGE_PER_WAVE_SQ) * jitter(),
  };
}

/**
 * @param {object} state GameState
 * @param {number} dt seconds
 */
export function step(state, dt) {
  state.wave = Math.floor(state.time / WAVE_INTERVAL);

  const spawnMultiplier = 1 + (state.heat / HEAT_MAX) * SPAWN_HEAT_GAIN;
  state.threat = state.wave + (spawnMultiplier - 1);

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    const { hp, speed, damage } = enemyStatsForWave(state.wave, state.rng);
    state.enemies.push({
      id: state.nextEnemyId++,
      angle: state.rng() * Math.PI * 2,
      radius: SPAWN_RADIUS,
      hp,
      maxHp: hp,
      speed,
      damage,
    });
    const intervalJitter = rngRange(state.rng, 1 - SPAWN_INTERVAL_JITTER, 1 + SPAWN_INTERVAL_JITTER);
    state.spawnTimer += (baseSpawnInterval(state.wave) / spawnMultiplier) * intervalJitter;
  }

  return state;
}
