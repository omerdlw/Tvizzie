import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  buildApiSuccessResult,
  normalizeApiResultEnvelope,
  unwrapApiResultEnvelope,
} from '@/infrastructure/http/client';
import { hasMediaAwards } from '@/domains/media/utils/media-data';

const DOMAIN_NAMES = ['account', 'auth', 'home', 'legal', 'media', 'reviews', 'search', 'shell', 'social'];

test('every domain has an explicit top-level boundary', async () => {
  const entries = await readdir('domains', { withFileTypes: true });
  const directories = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));

  for (const domainName of DOMAIN_NAMES) {
    assert.equal(directories.has(domainName), true, domainName);
  }
});

test('domain-facing API envelopes keep the stable success contract', () => {
  const data = { items: [{ id: 'item-1' }] };
  const result = buildApiSuccessResult(data, { code: ' READY ', requestId: ' request-1 ' });

  assert.deepEqual(result, {
    code: 'READY',
    data,
    message: 'OK',
    ok: true,
    requestId: 'request-1',
    retryable: false,
  });
  assert.deepEqual(normalizeApiResultEnvelope(data).data, data);
  assert.deepEqual(unwrapApiResultEnvelope(result), data);
});

test('hasMediaAwards correctly identifies media with and without awards', () => {
  assert.equal(hasMediaAwards(null), false);
  assert.equal(hasMediaAwards(undefined), false);
  assert.equal(hasMediaAwards({}), false);
  assert.equal(
    hasMediaAwards({ organizations: [], stats: { totalNominations: 0, totalWins: 0 } }),
    false,
  );
  assert.equal(hasMediaAwards({ organizations: [{ years: [] }] }), false);
  assert.equal(hasMediaAwards({ organizations: [{ years: [{ categories: [] }] }] }), false);

  assert.equal(
    hasMediaAwards({
      organizations: [
        {
          id: 'academy-awards',
          title: 'Academy Awards',
          years: [
            {
              year: '2020',
              categories: [{ category: 'Best Picture', type: 'Win' }],
            },
          ],
        },
      ],
    }),
    true,
  );

  assert.equal(
    hasMediaAwards({
      organizations: [],
      stats: { totalNominations: 1, totalWins: 0 },
    }),
    true,
  );
});

