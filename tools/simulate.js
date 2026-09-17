// Headless simulator: plays Reactor Siege with scripted heuristic
// policies using the exact same core/simulate.js the browser build
// runs, and reports aggregate outcome statistics. This is the
// simulation-driven balance tool described in BALANCE.md.

import { runSimulation } from '../src/core/simulate.js';
import {
  TURRET_BUILD_COST,
  TURRET_UPGRADE_COST,
  TURRET_MAX_LEVEL,
  COOLANT_COST,
} from '../src/core/constants.js';

const DECISION_INTERVAL_TICKS = 30; // ~0.5s reaction cadence at 60Hz

function emptySlot(state) {
  return state.turrets.find((t) => t.level === 0);
}

function upgradeableSlot(state) {
  return state.turrets.find((t) => t.level > 0 && t.level < TURRET_MAX_LEVEL);
}

/** Builds turrets in every slot as fast as affordable, then upgrades. Never vents coolant. */
function makeTurretHeavyPolicy() {
  let tick = 0;
  return (state) => {
    if (++tick % DECISION_INTERVAL_TICKS !== 0) return [];
    const slot = emptySlot(state);
    if (slot && state.energy >= TURRET_BUILD_COST) return [{ type: 'build', slot: slot.id }];
    const up = upgradeableSlot(state);
    if (up && state.energy >= TURRET_UPGRADE_COST[up.level]) return [{ type: 'upgrade', slot: up.id }];
    return [];
  };
}

/** Builds a modest defense (3 turrets), then prioritizes venting coolant early and often. */
function makeCoolantConservativePolicy() {
  let tick = 0;
  return (state) => {
    if (++tick % DECISION_INTERVAL_TICKS !== 0) return [];
    if (state.heat > 45 && state.energy >= COOLANT_COST) return [{ type: 'coolant' }];
    const built = state.turrets.filter((t) => t.level > 0).length;
    const slot = emptySlot(state);
    if (built < 3 && slot && state.energy >= TURRET_BUILD_COST) return [{ type: 'build', slot: slot.id }];
    return [];
  };
}

/** Builds 4 turrets, upgrades opportunistically, vents coolant reactively at high heat. */
function makeBalancedPolicy() {
  let tick = 0;
  return (state) => {
    if (++tick % DECISION_INTERVAL_TICKS !== 0) return [];
    if (state.heat > 75 && state.energy >= COOLANT_COST) return [{ type: 'coolant' }];
    const built = state.turrets.filter((t) => t.level > 0).length;
    const slot = emptySlot(state);
    if (built < 4 && slot && state.energy >= TURRET_BUILD_COST) return [{ type: 'build', slot: slot.id }];
    const up = upgradeableSlot(state);
    if (up && state.energy >= TURRET_UPGRADE_COST[up.level]) return [{ type: 'upgrade', slot: up.id }];
    return [];
  };
}

/** Builds only 2 turrets, then dumps everything into upgrading them to max level. */
function makeGlassCannonPolicy() {
  let tick = 0;
  return (state) => {
    if (++tick % DECISION_INTERVAL_TICKS !== 0) return [];
    const built = state.turrets.filter((t) => t.level > 0).length;
    const slot = emptySlot(state);
    if (built < 2 && slot && state.energy >= TURRET_BUILD_COST) return [{ type: 'build', slot: slot.id }];
    const up = upgradeableSlot(state);
    if (up && state.energy >= TURRET_UPGRADE_COST[up.level]) return [{ type: 'upgrade', slot: up.id }];
    return [];
  };
}

export const POLICIES = {
  'turret-heavy': makeTurretHeavyPolicy,
  'coolant-conservative': makeCoolantConservativePolicy,
  balanced: makeBalancedPolicy,
  'glass-cannon': makeGlassCannonPolicy,
};

const SAFETY_TICK_CAP = 50_000; // ~13.9 simulated minutes at 60Hz, safely above RUN_DURATION

export function runBatch(policyName, count, seedStart = 1) {
  const factory = POLICIES[policyName];
  if (!factory) throw new Error(`unknown policy: ${policyName}`);
  const results = [];
  for (let i = 0; i < count; i++) {
    const seed = seedStart + i;
    const state = runSimulation(seed, factory(), 1 / 60, SAFETY_TICK_CAP);
    results.push({
      seed,
      outcome: state.gameOver,
      time: state.time,
      score: state.score,
      kills: state.stats.kills,
      built: state.stats.built,
      upgraded: state.stats.upgraded,
      coolantVents: state.stats.coolantVents,
      shotsFired: state.stats.shotsFired,
    });
  }
  return results;
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function avg(nums) {
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

export function summarize(policyName, results) {
  const n = results.length;
  const outcomeRate = (o) => results.filter((r) => r.outcome === o).length / n;
  return {
    policy: policyName,
    runs: n,
    winRate: outcomeRate('win'),
    meltdownRate: outcomeRate('meltdown'),
    coreDestroyedRate: outcomeRate('core-destroyed'),
    medianRunLength: median(results.map((r) => r.time)),
    avgBuilt: avg(results.map((r) => r.built)),
    avgUpgraded: avg(results.map((r) => r.upgraded)),
    avgCoolantVents: avg(results.map((r) => r.coolantVents)),
    avgKills: avg(results.map((r) => r.kills)),
    avgScore: avg(results.map((r) => r.score)),
  };
}

const COLUMNS = [
  ['policy', 'policy', 22],
  ['runs', 'runs', 6],
  ['winRate', (s) => (s.winRate * 100).toFixed(1), 8],
  ['meltdown%', (s) => (s.meltdownRate * 100).toFixed(1), 10],
  ['coreDestroyed%', (s) => (s.coreDestroyedRate * 100).toFixed(1), 15],
  ['medianLen(s)', (s) => s.medianRunLength.toFixed(1), 13],
  ['avgBuilt', (s) => s.avgBuilt.toFixed(1), 9],
  ['avgUpgraded', (s) => s.avgUpgraded.toFixed(1), 12],
  ['avgVents', (s) => s.avgCoolantVents.toFixed(1), 9],
  ['avgKills', (s) => s.avgKills.toFixed(1), 9],
];

export function formatTable(summaries) {
  const header = COLUMNS.map(([label, , width]) => label.padEnd(width)).join('');
  const rows = summaries.map((s) =>
    COLUMNS.map(([, get, width]) => {
      const value = typeof get === 'function' ? get(s) : s[get];
      return String(value).padEnd(width);
    }).join(''),
  );
  return [header, ...rows].join('\n');
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const runsPerPolicy = Number(process.argv[2]) || 1000;
  const asJson = process.argv.includes('--json');
  const summaries = Object.keys(POLICIES).map((name) => summarize(name, runBatch(name, runsPerPolicy)));
  if (asJson) {
    console.log(JSON.stringify(summaries, null, 2));
  } else {
    console.log(`Reactor Siege headless simulator — ${runsPerPolicy} runs per policy\n`);
    console.log(formatTable(summaries));
  }
}
