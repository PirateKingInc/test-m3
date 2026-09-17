# Balance — Simulation-Driven Tuning

This is evidence, not vibes: every number below comes from
`tools/simulate.js` running the exact same `src/core/simulate.js` the
browser build uses, driven by four scripted heuristic policies, 1000
seeded runs each. Reproduce with:

```
npm run simulate 1000
```

## Policies

| Policy | Behavior |
|---|---|
| `turret-heavy` | Fills every ring slot ASAP, then upgrades everything. Never vents coolant. |
| `coolant-conservative` | Builds only 3 turrets, never upgrades. Vents coolant proactively once heat > 45. |
| `balanced` | Builds 4 turrets, upgrades opportunistically, vents coolant reactively once heat > 75. |
| `glass-cannon` | Builds only 2 turrets, dumps everything else into upgrading them to max level. |

All four re-decide roughly twice a second (a human-plausible reaction
cadence), reading the same `GameState` a player would see.

## A bug the simulator caught before any balance work happened

The first 1000-run batch produced almost **zero variance between
seeds** — `medianRunLength` was identical to one decimal place across
every seed for a given policy. The cause: enemy `angle` was the only
thing derived from `state.rng()`, and nothing in Combat ever reads
angle (targeting is purely radius-based). So the seed was cosmetic —
every run for a policy was, for outcome purposes, the same run. That
would have made the 1000-run sample size meaningless (1 effective
sample repeated 1000 times) and I would have shipped it without the
simulator surfacing it, since a single manual playtest can't detect
"no run-to-run variance" — you'd need to *compare* many runs, which is
exactly what building the simulator forced.

Fix (`src/systems/spawner.js`): spawn interval and enemy
hp/speed/damage are now jittered ±15-20% via `state.rng()`, so the
seed has a real, reproducible effect on how a run unfolds. This is
also why the fix landed in this PR rather than the systems PRs that
introduced spawner/combat — it was invisible until this tool existed.

## Before tuning

(First batch after the RNG-variance fix, original constants otherwise.)

| Policy | Win% | Meltdown% | Core-destroyed% | Median run (s) | Avg built | Avg upgraded | Avg vents |
|---|---|---|---|---|---|---|---|
| turret-heavy | 0.0 | 100.0 | 0.0 | 182.0 | 6.0 | 12.0 | 0.0 |
| coolant-conservative | 0.0 | 0.0 | 100.0 | 316.1 | 3.0 | 0.0 | 13.0 |
| balanced | 3.3 | 0.0 | 96.7 | 589.0 | 4.0 | 8.0 | 44.0 |
| glass-cannon | 0.0 | 100.0 | 0.0 | 187.2 | 2.0 | 4.0 | 0.0 |

**Reading this:** everything was a dead strategy. The two policies
that never vent coolant (`turret-heavy`, `glass-cannon`) reliably
melt down around wave 7-8 — expected, since ignoring heat is exactly
what the meltdown condition exists to punish. But `balanced`, the
policy meant to represent competent play, won only 3.3% of the time,
and `coolant-conservative` — which *does* manage heat — still lost
every run to the core simply being overrun. Enemy stats scaled
linearly with wave and waves kept escalating for the full 600s, so a
turret build that was adequate at wave 10 was hopeless by wave 24; no
amount of skill in the policies I scripted could keep up. The game
was simply too hard, full stop.

## Tuning changes

All changes in `src/core/constants.js` and the cooldown-throttle
formula in `src/systems/combat.js`.

| Constant | Before | After | Why |
|---|---|---|---|
| `SPAWN_HEAT_GAIN` | 0.6 | 0.5 | Slightly less spawn-rate punishment for heat, so the heat/spawn feedback loop is strong but not runaway. |
| `WAVE_INTERVAL` | 20s | 25s | Fewer total escalations over a 600s run gives builds more time to consolidate. |
| `ENEMY_HP_PER_WAVE` | 5 (linear only) | 2.4 linear + a small quadratic term (see below) | Replaces unbounded linear scaling with a curve that's gentler early and steeper only late — see next row. |
| `ENEMY_HP_PER_WAVE_SQ` | *(none)* | 0.0425 | The actual balance lever. Linear-only scaling let a maxed 4-turret build out-damage the wave schedule indefinitely once established (this alone pushed `balanced` to a 100% win rate during tuning — see "knife-edge" note below). A small `wave²` term keeps early/mid game close to the old feel but makes the endgame (wave ~20+) escalate faster than a static build can out-scale, which is what actually produces a win rate instead of a coin flip that never lands. |
| `ENEMY_DAMAGE_PER_WAVE` / `_SQ` | 1.2 linear | 0.45 linear + 0.00675 quadratic | Same treatment, applied to enemy damage. |
| `TURRET_BASE_DAMAGE` | 8 | 8 (tried 10, reverted) | Buffing damage alone made the same runaway-win problem; reverted once the quadratic enemy scaling did the real work. |
| `TURRET_BASE_RANGE` | 3.2 | 3.8 | More engagement distance so turrets get 1-2 extra shots per enemy before it's in breach range — without this, high-wave enemies simply out-walked the turrets. |
| `TURRET_BASE_COOLDOWN` | 0.6s | 0.5s | Slightly faster base fire rate, offset by the heat-throttle change below so it isn't a net buff at high heat. |
| `TURRET_HEAT_THROTTLE_COOLDOWN_MULT` | 2.0 (implicit, hardcoded) | 1.6 (named constant) | At heat=100 the old formula slowed fire by 3x; that was steep enough to create a death spiral (heat rises → fire rate drops → can't clear enemies → more breaches → more heat) that no policy could recover from. 2.6x max slowdown is still a real penalty without being unrecoverable. |
| `HEAT_PASSIVE_DECAY` | 1.2/s | 1.4/s | Slightly faster passive cooling, so heat management has more margin for error. |
| `COOLANT_HEAT_REDUCTION` | 25 | 26 | Minor buff, tuned alongside the decay change. |
| `BASE_INCOME` | 6/s | 7/s | More energy throughput to afford both turret upgrades and coolant vents in the same run — the old economy couldn't support doing both. |

**A knife-edge worth naming honestly:** the quadratic enemy-scaling
term went through 6 iterations (0.11 → 0.065 → 0.04 → 0.052 → 0.044 →
0.041 → 0.0425) because this system is genuinely chaotic at the
margin — a ±0.003 change in `ENEMY_HP_PER_WAVE_SQ` moved `balanced`'s
win rate from 23.9% to 51.1%. That sensitivity is itself a balance
finding: a single exponent buried three systems deep (Spawner reads
wave → generates enemy stats → Combat's turret DPS either keeps pace
or doesn't → Heat's meltdown/breach check decides the run) controls
whether the whole game is beatable. I'm leaving the final value in
place because it lands the target band across 1000 runs, but a real
next step (tracked as a follow-up, not blocking this PR) would be
replacing the hand-tuned quadratic with a curve shaped from simulator
output directly, since eyeballing a curve to hit a win-rate target is
exactly the kind of thing this tool should be doing for me.

## After tuning

| Policy | Win% | Meltdown% | Core-destroyed% | Median run (s) | Avg built | Avg upgraded | Avg vents |
|---|---|---|---|---|---|---|---|
| turret-heavy | 0.0 | 100.0 | 0.0 | 197.3 | 6.0 | 12.0 | 0.0 |
| coolant-conservative | 0.0 | 0.0 | 100.0 | 344.6 | 3.0 | 0.0 | 30.9 |
| **balanced** | **37.8** | 0.0 | 62.2 | 598.3 | 4.0 | 8.0 | 93.4 |
| glass-cannon | 0.0 | 100.0 | 0.0 | 198.9 | 2.0 | 4.0 | 0.0 |

## Interpretation

- **Target hit:** `balanced` (the policy meant to model competent,
  attentive play) wins 37.8% of 1000 runs — inside the requested
  25-40% band. No policy exceeds 50%; the next-best is 0%, which is a
  different problem discussed below, not a dominance problem.
- **No dominant strategy.** Nothing wins more than half its runs.
- **Dead strategies, and why they're the right strategies to be dead.**
  `turret-heavy` and `glass-cannon` both ignore coolant entirely and
  both reliably melt down around wave 7-8 (median ~197-199s, right
  where heat first crosses the throttle knee and starts compounding).
  This is the heat system doing its job: SPEC.md's whole premise is
  that heat is the shared constraint nothing can ignore, and the data
  confirms a policy that ignores it cannot survive regardless of how
  much raw DPS it buys. `coolant-conservative` is the more interesting
  dead strategy: it manages heat well (30.9 vents/run, never melts
  down) but under-invests in turret count and never upgrades, so it
  always eventually loses to sheer enemy volume (100% core-destroyed).
  That's evidence the Economy/Combat coupling matters as much as Heat
  — good heat management alone is necessary but not sufficient.
- **`state.threat` remains a pure readout.** Per SPEC.md it was never
  meant to feed back into another system, and the data doesn't change
  that assessment — it's cheap to compute and useful for a future UI
  threat-meter, so it stays, but it's fair to call it the one field in
  `GameState` that isn't part of the required four-system coupling.
- **What I'd tune next if this weren't a fixed-scope exercise:** give
  `coolant-conservative`-style play a viable path to winning too (e.g.
  a cheaper early upgrade tier), so the win-rate story isn't "there is
  exactly one correct build order." Right now `balanced` wins because
  it's the only policy that does both things right, not because
  multiple strategies converge on similar win rates — that's a
  narrower validation of the four-system coupling than I'd want for a
  real ship.
