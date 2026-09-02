import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEventRecord } from '@/domains/social/server/activity';
import { isValidNotificationType } from '@/domains/social/server/notifications';
import {
  ACTIVITY_EVENT_TYPES,
  ACTIVITY_SLOT_TYPES,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_SET,
} from '@/domains/social/utils/constants';
import { buildProfileRealtimeTopic, PROFILE_LIVE_EVENT_TYPE } from '@/infrastructure/realtime/client';

test('social activity events map to their canonical slots', () => {
  const record = buildEventRecord({
    actor: { avatarUrl: null, displayName: 'Test User', id: 'actor-1', username: 'test-user' },
    eventType: ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED,
    occurredAt: '2026-08-24T00:00:00.000Z',
    payload: { subjectId: '101', subjectPoster: '/poster.jpg', subjectTitle: 'Test Movie', subjectType: 'movie' },
    visibility: 'public',
  });

  assert.equal(record.eventType, ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED);
  assert.equal(record.slotType, ACTIVITY_SLOT_TYPES.WATCHLIST_ENTRY);
});

test('notification validation and profile realtime topics use canonical values', () => {
  for (const type of Object.values(NOTIFICATION_TYPES)) {
    assert.equal(isValidNotificationType(type, NOTIFICATION_TYPE_SET), true);
  }
  assert.equal(isValidNotificationType('UNKNOWN', NOTIFICATION_TYPE_SET), false);
  assert.equal(PROFILE_LIVE_EVENT_TYPE, 'account');
  assert.equal(buildProfileRealtimeTopic('User-Name'), 'profile-updates:user-name');
  assert.equal(buildProfileRealtimeTopic(''), '');
});
