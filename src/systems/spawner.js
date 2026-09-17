// Spawner system: enemy generation and wave/threat progression.
//
// Reads: state.heat, state.time, state.wave
// Writes: state.enemies, state.wave, state.threat, state.spawnTimer
//
// The spawn-rate multiplier reads state.heat directly: an overheating
// reactor draws a heavier, faster wave. This is the primary feedback
// loop in the game — firing turrets raises heat, which raises spawn
// pressure, which demands more turret fire.

import {
  HEAT_MAX,
  SPAWN_HEAT_GAIN,
  SPAWN_RADIUS,
  WAVE_INTERVAL,
} from '../core/constants.js';

function baseSpawnInterval(wave) {
  return Math.max(0.35, 1.8 - wave * 0.08);
}

function enemyStatsForWave(wave) {
  return {
    hp: 16 + wave * 5,
    speed: 1.0 + wave * 0.04,
    damage: 6 + wave * 1.2,
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
    const { hp, speed, damage } = enemyStatsForWave(state.wave);
    state.enemies.push({
      id: state.nextEnemyId++,
      angle: state.rng() * Math.PI * 2,
      radius: SPAWN_RADIUS,
      hp,
      maxHp: hp,
      speed,
      damage,
    });
    state.spawnTimer += baseSpawnInterval(state.wave) / spawnMultiplier;
  }

  return state;
}
