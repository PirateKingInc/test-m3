import { createInitialState } from './state.js';
import { RUN_DURATION } from './constants.js';
import * as spawner from '../systems/spawner.js';
import * as combat from '../systems/combat.js';
import * as economy from '../systems/economy.js';
import * as heat from '../systems/heat.js';

export { createInitialState };

/**
 * Advances the shared GameState by one fixed timestep, running the four
 * systems in a fixed order: Spawner -> Combat -> Economy -> Heat. This
 * exact function drives the browser game loop, the test suite, and the
 * headless simulator — none of them see anything the others don't.
 *
 * @param {object} state GameState, mutated in place and returned.
 * @param {number} dt seconds for this tick (fixed timestep).
 * @param {object[]} [newActions] player actions queued for this tick.
 * @returns {object} the same state object, advanced by one tick.
 */
export function step(state, dt, newActions = []) {
  if (state.gameOver) return state;

  for (const action of newActions) {
    state.pendingActions.push(action);
  }

  state.time += dt;

  spawner.step(state, dt);
  combat.step(state, dt);
  economy.step(state, dt);
  heat.step(state, dt);

  if (!state.gameOver && state.time >= RUN_DURATION) {
    state.gameOver = 'win';
  }

  return state;
}

/**
 * Runs a full fixed-timestep simulation from a seed until the game ends
 * or a tick cap is hit (safety net for a misbehaving policy). Used by
 * the headless simulator and by integration/bot-playthrough tests.
 *
 * @param {number} seed
 * @param {(state: object) => object[]} policy called once per tick,
 *   returns an array of actions to queue for that tick.
 * @param {number} [dt] fixed timestep in seconds.
 * @param {number} [maxTicks] safety cap.
 * @returns {object} the final GameState.
 */
export function runSimulation(seed, policy, dt = 1 / 60, maxTicks = 1_000_000) {
  const state = createInitialState(seed);
  let ticks = 0;
  while (!state.gameOver && ticks < maxTicks) {
    const actions = policy ? policy(state) : [];
    step(state, dt, actions);
    ticks++;
  }
  return state;
}
