import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';

test('rng: same seed produces identical sequence', () => {
  const a = createRng(12345);
  const b = createRng(12345);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test('rng: different seeds diverge', () => {
  const a = createRng(1);
  const b = createRng(2);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});

test('rng: values stay within [0, 1)', () => {
  const rng = createRng(999);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});
