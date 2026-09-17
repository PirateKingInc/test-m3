// Economy system: reactor energy income per tick.
//
// Reads: state.heat
// Writes: state.energy
//
// Income is throttled by the same heatThrottle() curve Combat uses for
// turret fire rate — a hot reactor produces less power right when the
// player most wants to spend on coolant or turrets.

import { BASE_INCOME, heatThrottle } from '../core/constants.js';

/**
 * @param {object} state GameState
 * @param {number} dt seconds
 */
export function step(state, dt) {
  const income = BASE_INCOME * (1 - heatThrottle(state.heat));
  state.energy += income * dt;
  return state;
}
