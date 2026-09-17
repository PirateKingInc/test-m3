// Central tuning constants. Balance passes (see BALANCE.md) change values
// here, not scattered magic numbers in the systems.

export const RUN_DURATION = 600; // seconds; a full session is a "win"
export const TICK_RATE = 60; // fixed timestep, ticks/sec

export const CORE_MAX_HP = 100;
export const HEAT_MAX = 100;

export const SPAWN_RADIUS = 10; // distance units from core where enemies appear
export const CORE_HIT_RADIUS = 0.5; // enemy reaching this radius hits the core

export const START_ENERGY = 50;

export const RING_SLOTS = 6;

// Heat throttle curve, shared by Combat (fire rate) and Economy (income).
// Below the knee, no penalty. Above it, penalty ramps toward 1 (full stop)
// as heat approaches HEAT_MAX.
export const HEAT_THROTTLE_KNEE = 70;

export function heatThrottle(heat) {
  if (heat <= HEAT_THROTTLE_KNEE) return 0;
  const span = HEAT_MAX - HEAT_THROTTLE_KNEE;
  const over = Math.min(heat - HEAT_THROTTLE_KNEE, span);
  return over / span; // 0 at the knee, 1 at HEAT_MAX
}

// Spawner
export const SPAWN_HEAT_GAIN = 0.5; // spawn-rate multiplier added at heat=100
export const WAVE_INTERVAL = 25; // seconds between wave escalations
export const SPAWN_INTERVAL_JITTER = 0.2; // +/- fraction, randomized per spawn

// Enemy stat scaling per wave (tuned by simulation — see BALANCE.md).
// A small quadratic term is mixed in so the late game (wave ~20+) ramps
// meaningfully faster than a static turret build can keep pace with —
// without it, a "balanced" policy plateaued at a 100% win rate because
// linear scaling let 4 maxed turrets out-damage the wave schedule
// indefinitely once established.
export const ENEMY_BASE_HP = 14;
export const ENEMY_HP_PER_WAVE = 2.4;
export const ENEMY_HP_PER_WAVE_SQ = 0.0425;
export const ENEMY_BASE_SPEED = 0.8;
export const ENEMY_SPEED_PER_WAVE = 0.015;
export const ENEMY_BASE_DAMAGE = 5;
export const ENEMY_DAMAGE_PER_WAVE = 0.45;
export const ENEMY_DAMAGE_PER_WAVE_SQ = 0.00675;
export const ENEMY_STAT_JITTER = 0.15; // +/- fraction, randomized per enemy

// Heat system
export const HEAT_PASSIVE_DECAY = 1.4; // heat/sec removed by radiators
export const COOLANT_COST = 15; // energy per coolant vent
export const COOLANT_HEAT_REDUCTION = 26; // heat removed per vent

// Economy
export const BASE_INCOME = 7; // energy/sec at zero heat

// Combat / turrets
export const TURRET_BUILD_COST = 20;
export const TURRET_UPGRADE_COST = [0, 25, 40]; // index by (currentLevel), level 1->2 costs [1], 2->3 costs [2]
export const TURRET_MAX_LEVEL = 3;
export const TURRET_BASE_COOLDOWN = 0.5; // seconds between shots at level 1
export const TURRET_BASE_DAMAGE = 8;
export const TURRET_BASE_RANGE = 3.8;
export const TURRET_HEAT_PER_SHOT = 1.1;
export const TURRET_HEAT_THROTTLE_COOLDOWN_MULT = 1.6; // max extra cooldown fraction at heat=100
