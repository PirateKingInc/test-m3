# Reactor Siege — Game Spec

## Concept

**Reactor Siege** is a top-down single-screen survival-defense game. You
control a reactor core under siege. Waves of enemies march in from the
edges of the map; you place and upgrade turrets in a ring of build slots
around the core to kill them before they arrive. Everything you do —
building, upgrading, venting coolant — is paid for and constrained by a
single volatile resource: **heat**.

Heat is the hinge the whole design turns on. Firing turrets generates it.
High heat throttles your energy income (the reactor derates itself) *and*
throttles your turret fire rate (thermal protection) *and* attracts larger,
faster waves (unstable reactors draw hostile attention). Venting coolant
costs energy you could otherwise spend on defense. There is no dominant
resource — every system pulls on the same shared pool, and every strategic
choice is really a heat-budget decision.

The game is a **10 minute session** (600 simulated seconds), fixed
timestep, fully deterministic from a seed. You win by surviving to the
end. You lose if the core is destroyed or the reactor melts down.

## Core Loop

1. Waves of enemies spawn at the map edge and walk toward the core.
2. You spend energy to build/upgrade turrets in fixed ring slots.
3. Turrets auto-fire at enemies in range; each shot adds heat.
4. Heat throttles turret fire rate and reactor energy income, and raises
   enemy spawn pressure.
5. You can vent coolant (spend energy to cut heat) to buy headroom, at
   the cost of turret/upgrade spending power.
6. Repeat under an escalating wave schedule until the 600s clock runs out
   (win) or the core dies / the reactor melts down (loss).

## The Four Systems

All four systems read and write one shared `GameState` object. They run
in a fixed order every tick (`dt = 1/60s`): **Spawner → Combat → Economy
→ Heat**. None of them touch the DOM, canvas, or `Date.now()` — rendering
and input are a separate layer that only reads state and enqueues player
actions (`src/core/*` is pure; `src/render/*` and `src/input/*` are not).
This separation is what makes the game and the headless simulator the
same code path.

### 1. Spawner System (`src/systems/spawner.js`)
- **Reads:** `state.heat`, `state.time`, `state.wave`.
- **Writes:** `state.enemies` (new enemies), `state.wave`, `state.threat`.
- Enemy count/HP/speed scale with wave number on a fixed schedule, but the
  effective spawn-rate multiplier is `1 + heat/100 * SPAWN_HEAT_GAIN` — an
  overheating reactor visibly attracts a heavier wave. This is the primary
  feedback loop: more turret fire → more heat → more/faster enemies →
  more turret fire needed.

### 2. Combat System (`src/systems/combat.js`)
- **Reads:** `state.enemies`, `state.turrets`, `state.heat`.
- **Writes:** `state.enemies` (damage/removal), `state.turrets` (cooldown),
  `state.coreHP`, `state.heat` (+= per shot fired), `state.energy` (spend
  on build/upgrade actions queued by the player), `state.score`.
- Enemies move toward the core each tick and damage it on arrival. Turrets
  auto-target the nearest enemy in range and fire on a per-turret cooldown.
  Fire-rate cooldown is scaled by `heatThrottle(heat)`: above 70 heat,
  turrets fire markedly slower, so building more turrets to solve a
  problem eventually makes the problem worse.

### 3. Economy System (`src/systems/economy.js`)
- **Reads:** `state.heat`.
- **Writes:** `state.energy` (+= income per tick).
- Base income is a flat rate; actual income is
  `base * (1 - heatThrottle(heat))`, using the same throttle curve as
  Combat. A hot reactor produces less power right when you need more of
  it to build coolant or turrets — the central tension of the game.

### 4. Heat System (`src/systems/heat.js`)
- **Reads:** `state.heat`, `state.pendingActions` (coolant purchases).
- **Writes:** `state.heat` (passive radiator decay each tick, minus
  coolant-vent reduction), `state.energy` (coolant cost), `state.gameOver`
  (`'meltdown'` if heat ≥ 100, `'core-destroyed'` if coreHP ≤ 0, checked
  here after all other systems have applied their heat/HP deltas for the
  tick).

Shared-state coupling summary (why this is one system, not four):
`heat` is written by Combat and Heat, and read by Spawner, Combat, and
Economy. `energy` is written by Economy and Heat/Combat (spend), and read
by Combat (build/upgrade cost) and Heat (coolant cost). Turning any one
knob — turret count, coolant spend, upgrade path — visibly moves the
other three systems' outputs; there is no system whose output only feeds
itself.

## Win / Loss Conditions

- **Win:** `state.time >= RUN_DURATION` (600s) with `coreHP > 0` and
  `heat < 100`.
- **Loss — core destroyed:** `coreHP <= 0` (enemies breached and dealt
  enough damage).
- **Loss — meltdown:** `heat >= 100`.

Score is enemies killed + a survival-time bonus; used for the local
high-score board only, not for win/loss.

## Player Actions

- Build turret in an empty ring slot (costs energy, scales with slot
  count already filled).
- Upgrade a turret (levels 1→3, each costing more energy, each adding
  damage and heat-per-shot).
- Vent coolant (spend energy for an instant heat reduction).

Desktop: mouse click on a slot/turret opens a small action menu (or
number-key shortcuts). Mobile: tap the slot; a bottom action bar appears.

## Out of Scope

- Multiplayer or any networked play.
- Procedural/sprite art or audio assets of any kind — everything is
  drawn with canvas primitives and synthesized with the Web Audio API.
- More than one map layout.
- Persistent backend, accounts, or leaderboards beyond `localStorage`.
- Campaign/story mode, branching content, or narrative systems.
- Item drops, inventory, or loot systems.
- Save/resume mid-run. A run is a single deterministic session from a
  seed; only the high score persists.
- Sound design beyond simple procedural Web Audio blips/tones.
- Balance for more than one selectable difficulty (single difficulty
  curve, tuned by simulation — see `BALANCE.md`).

## Determinism & Testability

- All randomness goes through a single seeded PRNG (`src/core/rng.js`,
  mulberry32). No `Math.random()` anywhere in `src/core` or `src/systems`.
- `src/core/simulate.js` exposes `createInitialState(seed)` and
  `step(state, dt, actions)` — pure functions with no side effects beyond
  their return value (state is treated as immutable-by-convention; a step
  returns a new/mutated-and-returned state object).
- The same `step` function drives the browser game loop, the unit/
  integration tests, and the headless simulator (`tools/simulate.js`).
