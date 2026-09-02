import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAccountProfileSearch,
  normalizeAccountProfileSearch,
  normalizeProfilePatch,
  toAccountProfileDocument,
  toAccountViewer,
} from '@/domains/account/core';

const PROFILE = {
  avatarUrl: null,
  description: 'A profile',
  displayName: 'Omer',
  email: 'private@example.com',
  followerCount: 3,
  followingCount: 2,
  id: 'user-1',
  isPrivate: false,
  likesCount: 4,
  listsCount: 5,
  updatedAt: '2026-08-23T10:00:00.000Z',
  username: 'omer',
  watchedCount: 6,
  watchlistCount: 7,
};

test('account viewer context forwards only the fields owned by account core', () => {
  assert.deepEqual(toAccountViewer({ email: 'user@example.com', sessionJti: 'session-1', userId: 'user-1' }), {
    email: 'user@example.com',
    id: 'user-1',
    sessionId: 'session-1',
  });
  assert.equal(toAccountViewer({ email: 'user@example.com' }), null);
});

test('profile patches have explicit ownership and value contracts', () => {
  assert.deepEqual(normalizeProfilePatch({ isPrivate: true, username: 'Ömer' }), {
    isPrivate: true,
    username: 'omer',
  });
  assert.throws(
    () => normalizeProfilePatch({ email: 'new@example.com' }),
    (error) => error.code === 'PROFILE_PATCH_FIELD_UNSUPPORTED' && error.status === 400,
  );
});

test('profile documents are public-safe and searches are bounded', async () => {
  const profile = toAccountProfileDocument(PROFILE);
  assert.equal(profile.email, undefined);
  assert.deepEqual(normalizeAccountProfileSearch({ limit: -1, query: ' Omer ' }), {
    limit: 1,
    query: 'Omer',
  });

  const search = createAccountProfileSearch({ searchProfiles: async () => [PROFILE] });
  const result = await search.search({ limit: 100, query: 'Omer' });
  assert.equal(result.items[0].email, undefined);
});
