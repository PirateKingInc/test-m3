# Reactor Siege

**Play now: https://piratekinginc.github.io/test-m3/**

A systems-driven reactor defense game. Waves of enemies march in from
the edge of the map; you build and upgrade turrets in a ring around
your reactor core to kill them before they arrive. Everything you do
is paid for and constrained by one shared resource: **heat**. Firing
turrets generates heat. High heat throttles your energy income *and*
your turret fire rate *and* draws a heavier, faster wave. Venting
coolant buys headroom at the cost of spending power elsewhere. There's
no dominant resource — every system pulls on the same shared pool.

A run is a fixed 10-minute (600s) session. Survive to the end and the
reactor stabilizes — you win. Let the core get overrun or the heat hit
100 and it's game over.

See [`SPEC.md`](./SPEC.md) for the full design (the four coupled
systems and exactly how they read/write shared state) and
[`BALANCE.md`](./BALANCE.md) for the simulation-driven balance pass —
1000 headless runs per strategy, before and after tuning.

## Controls

Desktop and mobile use the same input path (Pointer Events):

- **Click / tap an empty ring slot** around the core to build a turret.
- **Click / tap a turret** to upgrade it (levels 1→3).
- **Click / tap "VENT COOLANT"** at the bottom of the screen to spend
  energy cutting your heat.
- When the run ends, **click / tap anywhere** to start a new run with
  a fresh seed.

Your best score is saved locally (`localStorage`) and shown on the
game-over screen.

## Run it locally

No build step, no runtime dependencies — it's vanilla HTML/CSS/JS on
canvas. Serve the repo root with any static file server, e.g.:

```
npx http-server .
# or
python3 -m http.server 8080
```

then open `index.html` (append `?seed=1234` to force a specific seed
for a reproducible run).

## Tests

```
npm test
```

Runs the full suite (Node's built-in test runner) — unit tests per
system, integration tests proving the required cross-system coupling,
and a bot-playthrough test that drives the real game logic with a
scripted policy end-to-end.

## Headless simulator

```
npm run simulate            # 1000 runs per policy
npm run simulate -- 200     # override the run count
npm run simulate -- 1000 --json
```

Plays the exact same game logic the browser uses against several
scripted heuristic policies and reports win rate, median run length,
cause-of-death distribution, and per-system usage. This is the tool
behind `BALANCE.md`.

## Architecture

Game logic (`src/core/`, `src/systems/`) is pure and has zero
dependency on the DOM, canvas, or wall-clock time — every system is a
`step(state, dt)` function operating on a plain `GameState` object,
driven by a single seeded PRNG. That's what lets the exact same code
run in the browser, in the test suite, and in the headless simulator.
Rendering (`src/render/`), input (`src/input/`), and audio
(`src/audio/`) only read state and never touch game logic directly.

## CI/CD

- `.github/workflows/ci.yml` runs the test suite on every push and PR.
- `.github/workflows/deploy.yml` deploys to GitHub Pages on every push
  to `main`, after tests pass.
