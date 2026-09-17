// Deterministic PRNG (mulberry32). Every random draw in the game funnels
// through an instance of this so a run is fully reproducible from its seed.

/**
 * @param {number} seed 32-bit integer seed.
 * @returns {() => number} Function producing floats in [0, 1) on each call.
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [min, max] inclusive, drawn from the given rng. */
export function rngInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Random float in [min, max), drawn from the given rng. */
export function rngRange(rng, min, max) {
  return min + rng() * (max - min);
}
