import assert from 'node:assert/strict';
import test from 'node:test';

import {
  chunkArray,
  cleanString,
  normalizeEmailValue,
  normalizeTimestamp,
  normalizeValue,
  toFiniteNumber,
} from '@/shared/normalize';

test('shared normalization preserves existing string contracts', () => {
  assert.equal(normalizeValue('  Tvizzie  '), 'Tvizzie');
  assert.equal(normalizeValue(null), '');
  assert.equal(normalizeEmailValue('  USER@EXAMPLE.COM '), 'user@example.com');
  assert.equal(cleanString(undefined), '');
});

test('shared collection and number helpers preserve fallback behavior', () => {
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.equal(toFiniteNumber('42'), 42);
  assert.equal(toFiniteNumber('not-a-number', 7), 7);
});

test('shared timestamp normalization accepts Date-like values and rejects invalid input', () => {
  const timestamp = '2026-08-21T12:00:00.000Z';

  assert.equal(normalizeTimestamp(timestamp), timestamp);
  assert.equal(normalizeTimestamp({ toDate: () => new Date(timestamp) }), timestamp);
  assert.equal(normalizeTimestamp('invalid'), null);
});
