// Heat system: passive radiator decay, coolant-vent actions, and the
// meltdown / core-destroyed loss checks. Runs last in the tick order so
// it sees the heat and coreHP deltas every other system applied this
// tick before deciding whether the run is over.
//
// Reads: state.heat, state.coreHP, state.pendingActions (coolant)
// Writes: state.heat, state.energy (coolant cost), state.gameOver

import {
  HEAT_MAX,
  HEAT_PASSIVE_DECAY,
  COOLANT_COST,
  COOLANT_HEAT_REDUCTION,
} from '../core/constants.js';

/**
 * @param {object} state GameState
 * @param {number} dt seconds
 */
export function step(state, dt) {
  state.heat = Math.max(0, state.heat - HEAT_PASSIVE_DECAY * dt);

  state.pendingActions = state.pendingActions.filter((action) => {
    if (action.type !== 'coolant') return true; // not ours; leave for Combat
    if (state.energy >= COOLANT_COST) {
      state.energy -= COOLANT_COST;
      state.heat = Math.max(0, state.heat - COOLANT_HEAT_REDUCTION);
      state.stats.coolantVents++;
    }
    return false; // consumed (affordable or not — don't requeue a stale click)
  });

  state.heat = Math.min(HEAT_MAX, state.heat);

  if (!state.gameOver) {
    if (state.heat >= HEAT_MAX) {
      state.gameOver = 'meltdown';
    } else if (state.coreHP <= 0) {
      state.gameOver = 'core-destroyed';
    }
  }

  return state;
}
