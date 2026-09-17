import { createRng } from './rng.js';
import { CORE_MAX_HP, START_ENERGY, RING_SLOTS } from './constants.js';

/**
 * Builds the shared GameState every system reads and writes. Nothing in
 * this file touches the DOM, canvas, or wall-clock time.
 *
 * @param {number} seed
 * @returns {object} GameState
 */
export function createInitialState(seed) {
  const slots = [];
  for (let i = 0; i < RING_SLOTS; i++) {
    slots.push({
      id: i,
      angle: (i / RING_SLOTS) * Math.PI * 2,
      level: 0, // 0 = empty, 1-3 = turret level
      cooldown: 0,
    });
  }

  return {
    seed,
    rng: createRng(seed),
    time: 0,
    coreHP: CORE_MAX_HP,
    coreMaxHP: CORE_MAX_HP,
    heat: 0,
    energy: START_ENERGY,
    enemies: [],
    turrets: slots,
    wave: 0,
    threat: 0,
    score: 0,
    gameOver: null, // null | 'meltdown' | 'core-destroyed' | 'win'
    pendingActions: [],
    stats: { built: 0, upgraded: 0, coolantVents: 0, kills: 0, shotsFired: 0 },
    nextEnemyId: 1,
    spawnTimer: 1, // seconds until next spawn; first enemy arrives quickly
  };
}

/** Queue a player action to be applied on the next tick(s). */
export function queueAction(state, action) {
  state.pendingActions.push(action);
}
