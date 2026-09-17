// Combat system: build/upgrade actions, enemy movement, turret
// targeting/fire, core damage, and score.
//
// Reads: state.enemies, state.turrets, state.heat, state.pendingActions
// Writes: state.enemies, state.turrets, state.coreHP, state.heat (+=),
//         state.energy (build/upgrade spend), state.score, state.stats

import {
  CORE_HIT_RADIUS,
  TURRET_BUILD_COST,
  TURRET_UPGRADE_COST,
  TURRET_MAX_LEVEL,
  TURRET_BASE_COOLDOWN,
  TURRET_BASE_DAMAGE,
  TURRET_BASE_RANGE,
  TURRET_HEAT_PER_SHOT,
  heatThrottle,
} from '../core/constants.js';

function processActions(state) {
  state.pendingActions = state.pendingActions.filter((action) => {
    if (action.type === 'build') {
      const slot = state.turrets[action.slot];
      if (slot && slot.level === 0 && state.energy >= TURRET_BUILD_COST) {
        slot.level = 1;
        slot.cooldown = 0;
        state.energy -= TURRET_BUILD_COST;
        state.stats.built++;
      }
      return false;
    }
    if (action.type === 'upgrade') {
      const slot = state.turrets[action.slot];
      if (slot && slot.level > 0 && slot.level < TURRET_MAX_LEVEL) {
        const cost = TURRET_UPGRADE_COST[slot.level];
        if (state.energy >= cost) {
          state.energy -= cost;
          slot.level++;
          state.stats.upgraded++;
        }
      }
      return false;
    }
    return true; // coolant, handled by Heat
  });
}

function moveEnemies(state, dt) {
  for (const enemy of state.enemies) {
    enemy.radius -= enemy.speed * dt;
  }
}

function fireTurrets(state, dt) {
  const cooldownMultiplier = 1 + heatThrottle(state.heat) * 2;

  for (const turret of state.turrets) {
    if (turret.level === 0) continue;

    turret.cooldown -= dt;
    if (turret.cooldown > 0) continue;

    const range = TURRET_BASE_RANGE + 0.3 * (turret.level - 1);
    let target = null;
    for (const enemy of state.enemies) {
      if (enemy.radius <= range && (!target || enemy.radius < target.radius)) {
        target = enemy;
      }
    }
    if (!target) continue; // stay ready, recheck next tick instead of idling a full cooldown

    const damage = TURRET_BASE_DAMAGE * turret.level;
    target.hp -= damage;
    state.heat += TURRET_HEAT_PER_SHOT * (1 + 0.3 * (turret.level - 1));
    state.stats.shotsFired++;
    turret.cooldown = TURRET_BASE_COOLDOWN * cooldownMultiplier;

    if (target.hp <= 0) {
      state.enemies = state.enemies.filter((e) => e !== target);
      state.score += 10 * (state.wave + 1);
      state.stats.kills++;
    }
  }
}

function resolveBreaches(state) {
  const survivors = [];
  for (const enemy of state.enemies) {
    if (enemy.radius <= CORE_HIT_RADIUS) {
      state.coreHP -= enemy.damage;
    } else {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
}

/**
 * @param {object} state GameState
 * @param {number} dt seconds
 */
export function step(state, dt) {
  processActions(state);
  moveEnemies(state, dt);
  fireTurrets(state, dt);
  resolveBreaches(state);
  return state;
}
