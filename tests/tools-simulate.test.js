import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBatch, summarize, formatTable, POLICIES } from '../tools/simulate.js';

test('simulate tool: exposes at least two distinct heuristic policies', () => {
  assert.ok(Object.keys(POLICIES).length >= 2);
});

test('simulate tool: runBatch produces one result per run with a terminal outcome', () => {
  const results = runBatch('balanced', 10);
  assert.equal(results.length, 10);
  for (const r of results) {
    assert.ok(['win', 'meltdown', 'core-destroyed'].includes(r.outcome));
    assert.ok(r.time > 0);
  }
});

test('simulate tool: runBatch is deterministic for a given seed range', () => {
  const a = runBatch('balanced', 5, 100);
  const b = runBatch('balanced', 5, 100);
  assert.deepEqual(a, b);
});

test('simulate tool: different seed ranges are not trivially identical (RNG actually matters)', () => {
  const a = runBatch('balanced', 20, 1);
  const b = runBatch('balanced', 20, 1000);
  const timesA = a.map((r) => r.time);
  const timesB = b.map((r) => r.time);
  assert.notDeepEqual(timesA, timesB);
});

test('simulate tool: summarize computes rates that sum to 1 across the three outcomes', () => {
  const results = runBatch('turret-heavy', 25);
  const s = summarize('turret-heavy', results);
  const total = s.winRate + s.meltdownRate + s.coreDestroyedRate;
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.equal(s.runs, 25);
});

test('simulate tool: formatTable renders a row per summary', () => {
  const results = runBatch('balanced', 5);
  const summaries = [summarize('balanced', results)];
  const table = formatTable(summaries);
  const lines = table.split('\n');
  assert.equal(lines.length, 2); // header + one policy row
  assert.ok(lines[0].includes('policy'));
});
