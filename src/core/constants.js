// Central tuning constants. Balance passes (see BALANCE.md) change values
// here, not scattered magic numbers in the systems.

export const RUN_DURATION = 600; // seconds; a full session is a "win"
export const TICK_RATE = 60; // fixed timestep, ticks/sec

export const CORE_MAX_HP = 100;
export const HEAT_MAX = 100;

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
export const SPAWN_HEAT_GAIN = 0.6; // spawn-rate multiplier added at heat=100
export const WAVE_INTERVAL = 20; // seconds between wave escalations

// Heat system
export const HEAT_PASSIVE_DECAY = 1.2; // heat/sec removed by radiators
export const COOLANT_COST = 15; // energy per coolant vent
export const COOLANT_HEAT_REDUCTION = 25; // heat removed per vent

// Economy
export const BASE_INCOME = 6; // energy/sec at zero heat

// Combat / turrets
export const TURRET_BUILD_COST = 20;
export const TURRET_UPGRADE_COST = [0, 25, 40]; // index by (currentLevel), level 1->2 costs [1], 2->3 costs [2]
export const TURRET_MAX_LEVEL = 3;
export const TURRET_BASE_COOLDOWN = 0.6; // seconds between shots at level 1
export const TURRET_BASE_DAMAGE = 8;
export const TURRET_BASE_RANGE = 3.2;
export const TURRET_HEAT_PER_SHOT = 1.1;
