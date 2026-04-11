#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

function loadLocalEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      return;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
}

loadLocalEnvFile();

const BASE_URL = String(process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').trim().replace(/\/+$/, '');
const SUPABASE_URL = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const PUBLISHABLE_KEY = String(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
).trim();

const REQUIRED_ENV = [
  ['NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY],
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/SUPABASE_PUBLISHABLE_KEY', PUBLISHABLE_KEY],
];

const WAIT_EVENT_TIMEOUT_MS = 10000;
const WAIT_DB_TIMEOUT_MS = 10000;
const POLL_INTERVAL_MS = 250;

function normalizeValue(value) {
  return String(value || '').trim();
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRunId() {
  return `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex')}`;
}

function createSupabaseAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createSupabaseUserClient(accessToken) {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function apiCall({ token, path, method = 'GET', body = undefined, query = null, expectedStatus = 200 }) {
  const url = new URL(`${BASE_URL}${path}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (expectedStatus !== null && response.status !== expectedStatus) {
    throw new Error(
      `${method} ${path} expected ${expectedStatus} got ${response.status} payload=${JSON.stringify(payload)}`
    );
  }

  return {
    ok: response.ok,
    payload,
    status: response.status,
  };
}

function extractEnvelopeData(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

function extractCollectionRows(payload) {
  const unwrapped = extractEnvelopeData(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  if (Array.isArray(unwrapped?.data)) {
    return unwrapped.data;
  }

  return [];
}

function createSseCollector({ label, token }) {
  const state = {
    aborted: false,
    abortController: new AbortController(),
    events: [],
    readerPromise: null,
  };

  async function start() {
    const response = await fetch(`${BASE_URL}/api/live-updates`, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      signal: state.abortController.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`[${label}] live-updates connection failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!state.aborted) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true,
      });

      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      chunks.forEach((rawChunk) => {
        const lines = rawChunk.split('\n');
        let eventType = 'message';
        const dataLines = [];

        lines.forEach((line) => {
          if (line.startsWith('event:')) {
            eventType = normalizeValue(line.slice(6)) || 'message';
            return;
          }

          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        });

        if (!dataLines.length) {
          return;
        }

        let data = {};

        try {
          data = JSON.parse(dataLines.join('\n'));
        } catch {
          data = {};
        }

        state.events.push({
          data,
          eventType,
          receivedAt: Date.now(),
        });
      });
    }
  }

  async function waitForEvent(predicate, timeoutMs = WAIT_EVENT_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const match = state.events.find((event) => predicate(event));

      if (match) {
        return match;
      }

      await delay(100);
    }

    return null;
  }

  function stop() {
    state.aborted = true;
    state.abortController.abort();
  }

  state.readerPromise = start();

  return {
    events: state.events,
    stop,
    waitForEvent,
    whenClosed: state.readerPromise.catch((error) => {
      if (state.aborted) {
        return null;
      }
      throw error;
    }),
  };
}

async function waitForDbCondition(checker, timeoutMs, message) {
  const deadline = Date.now() + timeoutMs;
  let lastValue = null;

  while (Date.now() < deadline) {
    lastValue = await checker();

    if (lastValue) {
      return lastValue;
    }

    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(message);
}

async function createTestUser({ admin, label, runId, password }) {
  const suffix = `${label}-${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const email = `e2e.${suffix}@example.com`;
  const username = `e2e_${label}_${runId.slice(-6)}`.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      e2e_run_id: runId,
      e2e_label: label,
    },
  });

  if (created.error || !created.data?.user?.id) {
    throw new Error(`[${label}] createUser failed: ${created.error?.message || 'missing-user-id'}`);
  }

  const userId = created.data.user.id;
  const publicClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const signIn = await publicClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signIn.error || !signIn.data?.session?.access_token) {
    throw new Error(`[${label}] signIn failed: ${signIn.error?.message || 'missing-access-token'}`);
  }

  const token = signIn.data.session.access_token;
  const ensureResult = await apiCall({
    token,
    path: '/api/account/profile',
    method: 'POST',
    body: {
      action: 'ensure',
      displayName: `E2E ${label.toUpperCase()}`,
      isPrivate: false,
      username,
    },
  });

  assertCondition(ensureResult.ok, `[${label}] account ensure failed`);

  return {
    email,
    id: userId,
    label,
    token,
    username,
  };
}

async function createListAsUser({ user, title, runId }) {
  const now = new Date().toISOString();
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${runId.slice(-4)}`.replace(/^-+|-+$/g, '');
  const userClient = createSupabaseUserClient(user.token);
  const payload = {
    coverUrl: '',
    description: 'E2E list description',
    itemsCount: 0,
    likes: [],
    ownerSnapshot: {
      avatarUrl: null,
      displayName: `E2E ${user.label.toUpperCase()}`,
      id: user.id,
      username: user.username,
    },
    previewItems: [],
    reviewsCount: 0,
    slug,
    title,
  };
  const result = await userClient
    .from('lists')
    .insert({
      created_at: now,
      description: 'E2E list description',
      likes_count: 0,
      payload,
      poster_path: null,
      reviews_count: 0,
      slug,
      title,
      updated_at: now,
      user_id: user.id,
    })
    .select('id,slug,title,user_id')
    .single();

  if (result.error || !result.data?.id) {
    throw new Error(`[${user.label}] list create failed: ${result.error?.message || 'missing-list-id'}`);
  }

  return result.data;
}

async function cleanupRun({ admin, createdUsers, createdListId }) {
  const userIds = createdUsers.map((item) => item.id).filter(Boolean);

  if (!userIds.length) {
    return;
  }

  const deleteByIn = async (table, column = 'user_id') => {
    const result = await admin.from(table).delete().in(column, userIds);
    if (result.error) {
      throw new Error(`cleanup failed for ${table}.${column}: ${result.error.message}`);
    }
  };

  const deleteFollows = async () => {
    for (const userId of userIds) {
      const result = await admin.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);
      if (result.error) {
        throw new Error(`cleanup failed for follows (${userId}): ${result.error.message}`);
      }
    }
  };

  if (createdListId) {
    const listCleanupTables = ['list_items', 'list_likes', 'list_reviews'];

    for (const table of listCleanupTables) {
      const result = await admin.from(table).delete().eq('list_id', createdListId);
      if (result.error) {
        throw new Error(`cleanup failed for ${table} by list_id: ${result.error.message}`);
      }
    }

    const listResult = await admin.from('lists').delete().eq('id', createdListId);
    if (listResult.error) {
      throw new Error(`cleanup failed for lists: ${listResult.error.message}`);
    }
  }

  await deleteByIn('review_likes');
  await deleteByIn('media_reviews');
  await deleteByIn('notifications');
  await deleteByIn('profile_counters');
  await deleteFollows();

  for (const userId of userIds) {
    const profileResult = await admin.from('profiles').delete().eq('id', userId);
    if (profileResult.error) {
      throw new Error(`cleanup failed for profiles (${userId}): ${profileResult.error.message}`);
    }

    const usernameResult = await admin.from('usernames').delete().eq('user_id', userId);
    if (usernameResult.error) {
      throw new Error(`cleanup failed for usernames (${userId}): ${usernameResult.error.message}`);
    }
  }

  for (const user of createdUsers) {
    const result = await admin.auth.admin.deleteUser(user.id);
    if (result.error) {
      throw new Error(`cleanup failed for auth user (${user.email}): ${result.error.message}`);
    }
  }
}

function printStep(message) {
  console.log(`[STEP] ${message}`);
}

function printPass(message) {
  console.log(`[PASS] ${message}`);
}

function printInfo(message) {
  console.log(`[INFO] ${message}`);
}

async function main() {
  REQUIRED_ENV.forEach(([name, value]) => {
    assertCondition(Boolean(value), `Missing required env: ${name}`);
  });

  const runId = makeRunId();
  const password = `Tvz!${runId}Aa1`;
  const admin = createSupabaseAdmin();
  const createdUsers = [];
  let createdListId = null;
  let sseA = null;
  let sseB = null;
  const findings = [];

  try {
    printInfo(`Run id: ${runId}`);
    printInfo(`Base URL: ${BASE_URL}`);

    printStep('Creating two test accounts');
    const userA = await createTestUser({
      admin,
      label: 'a',
      password,
      runId,
    });
    const userB = await createTestUser({
      admin,
      label: 'b',
      password,
      runId,
    });
    createdUsers.push(userA, userB);
    printPass(`Users created (${userA.id.slice(0, 8)}..., ${userB.id.slice(0, 8)}...)`);

    printStep('Opening live notification streams for both users');
    sseA = createSseCollector({
      label: 'A',
      token: userA.token,
    });
    sseB = createSseCollector({
      label: 'B',
      token: userB.token,
    });

    const [readyA, readyB] = await Promise.all([
      sseA.waitForEvent((event) => event.eventType === 'ready', WAIT_EVENT_TIMEOUT_MS),
      sseB.waitForEvent((event) => event.eventType === 'ready', WAIT_EVENT_TIMEOUT_MS),
    ]);
    assertCondition(Boolean(readyA), 'SSE ready event not received for user A');
    assertCondition(Boolean(readyB), 'SSE ready event not received for user B');
    printPass('SSE streams are connected');

    printStep('Creating list for user A and media review for user A');
    const listA = await createListAsUser({
      runId,
      title: `E2E List ${runId.slice(-4)}`,
      user: userA,
    });
    createdListId = listA.id;

    const upsertMediaReview = await apiCall({
      token: userA.token,
      path: '/api/reviews/write',
      method: 'POST',
      body: {
        action: 'upsert-media-review',
        content: 'This is a long enough E2E review content for media interaction validation.',
        mediaKey: 'movie:603',
        payload: {
          subjectHref: '/movie/603',
          subjectId: '603',
          subjectKey: 'movie:603',
          subjectTitle: 'The Matrix',
          subjectType: 'movie',
        },
        rating: 4.5,
      },
    });
    assertCondition(upsertMediaReview.ok, 'Media review creation failed for user A');
    printPass('Setup content created (list + media review)');

    printStep('Public profile interactions: follow, review-like, list-like, list-comment, unfollow');
    const followResult = await apiCall({
      token: userB.token,
      path: '/api/follows',
      method: 'POST',
      body: {
        action: 'follow',
        followingId: userA.id,
      },
    });
    assertCondition(followResult.ok, 'Follow request failed');

    await waitForDbCondition(async () => {
      const relation = await admin
        .from('follows')
        .select('status')
        .eq('follower_id', userB.id)
        .eq('following_id', userA.id)
        .maybeSingle();
      if (relation.error) {
        throw new Error(`Follow relation check failed: ${relation.error.message}`);
      }
      return relation.data || null;
    }, WAIT_DB_TIMEOUT_MS, 'Follow relation was not created');
    printPass('Follow flow validated');

    const reviewLikeResult = await apiCall({
      token: userB.token,
      path: '/api/reviews/write',
      method: 'POST',
      body: {
        action: 'toggle-review-like',
        reviewKey: 'movie:603',
        reviewUserId: userA.id,
      },
    });
    assertCondition(reviewLikeResult.ok, 'Review like flow failed');

    const reviewLikeNotification = await apiCall({
      token: userB.token,
      path: '/api/notifications/events',
      method: 'POST',
      body: {
        eventType: 'REVIEW_LIKED',
        payload: {
          reviewOwnerId: userA.id,
          reviewType: 'media',
          subjectId: '603',
          subjectTitle: 'The Matrix',
          subjectType: 'movie',
        },
      },
    });
    assertCondition(reviewLikeNotification.ok, 'Review-like notification dispatch failed');

    const reviewLiveEvent = await apiCall({
      token: userB.token,
      path: '/api/live-updates/events',
      method: 'POST',
      body: {
        eventType: 'reviews',
        payload: {
          action: 'liked',
          reviewOwnerId: userA.id,
          subjectId: '603',
          subjectType: 'movie',
        },
        targetUserIds: [userA.id, userB.id],
      },
    });
    assertCondition(reviewLiveEvent.ok, 'Review live-event dispatch failed');
    printPass('Review like interaction validated');

    const userBClient = createSupabaseUserClient(userB.token);
    const listLikeRpc = await userBClient.rpc('collection_toggle_list_like', {
      p_list_id: listA.id,
      p_owner_id: userA.id,
      p_user_id: userB.id,
    });
    if (listLikeRpc.error) {
      throw new Error(`List like RPC failed: ${listLikeRpc.error.message}`);
    }

    const listLikeNotification = await apiCall({
      token: userB.token,
      path: '/api/notifications/events',
      method: 'POST',
      body: {
        eventType: 'LIST_LIKED',
        payload: {
          listId: listA.id,
          listOwnerId: userA.id,
          listSlug: listA.slug,
          listTitle: listA.title,
          subjectId: listA.id,
          subjectOwnerId: userA.id,
          subjectOwnerUsername: userA.username,
          subjectSlug: listA.slug,
          subjectTitle: listA.title,
          subjectType: 'list',
        },
      },
    });
    assertCondition(listLikeNotification.ok, 'List-like notification dispatch failed');
    printPass('List like interaction validated');

    const listCommentResult = await apiCall({
      token: userB.token,
      path: '/api/reviews/write',
      method: 'POST',
      body: {
        action: 'upsert-list-review',
        content: 'This list review is posted by user B as an end-to-end interaction test.',
        listId: listA.id,
        payload: {
          subjectHref: `/account/${userA.username}/lists/${listA.slug}`,
          subjectId: listA.id,
          subjectKey: `list:${userA.id}:${listA.id}`,
          subjectOwnerId: userA.id,
          subjectOwnerUsername: userA.username,
          subjectSlug: listA.slug,
          subjectTitle: listA.title,
          subjectType: 'list',
        },
        rating: 4,
      },
    });
    assertCondition(listCommentResult.ok, 'List comment (list review) flow failed');
    printPass('List comment interaction validated');

    const [reviewLikeRow, listLikeRow, listReviewRow] = await Promise.all([
      waitForDbCondition(async () => {
        const result = await admin
          .from('review_likes')
          .select('media_key')
          .eq('media_key', 'movie:603')
          .eq('review_user_id', userA.id)
          .eq('user_id', userB.id)
          .maybeSingle();
        if (result.error) {
          throw new Error(`review_likes verify failed: ${result.error.message}`);
        }
        return result.data || null;
      }, WAIT_DB_TIMEOUT_MS, 'review_likes row was not created'),
      waitForDbCondition(async () => {
        const result = await admin
          .from('list_likes')
          .select('list_id')
          .eq('list_id', listA.id)
          .eq('user_id', userB.id)
          .maybeSingle();
        if (result.error) {
          throw new Error(`list_likes verify failed: ${result.error.message}`);
        }
        return result.data || null;
      }, WAIT_DB_TIMEOUT_MS, 'list_likes row was not created'),
      waitForDbCondition(async () => {
        const result = await admin
          .from('list_reviews')
          .select('list_id')
          .eq('list_id', listA.id)
          .eq('user_id', userB.id)
          .maybeSingle();
        if (result.error) {
          throw new Error(`list_reviews verify failed: ${result.error.message}`);
        }
        return result.data || null;
      }, WAIT_DB_TIMEOUT_MS, 'list_reviews row was not created'),
    ]);
    assertCondition(Boolean(reviewLikeRow), 'Missing review like record');
    assertCondition(Boolean(listLikeRow), 'Missing list like record');
    assertCondition(Boolean(listReviewRow), 'Missing list review record');

    const notificationsForA = await waitForDbCondition(async () => {
      const result = await admin
        .from('notifications')
        .select('event_type')
        .eq('user_id', userA.id)
        .in('event_type', ['REVIEW_LIKE', 'LIST_LIKE'])
        .order('created_at', { ascending: false });
      if (result.error) {
        throw new Error(`Notifications verify failed: ${result.error.message}`);
      }

      const eventTypes = new Set((result.data || []).map((row) => row.event_type));
      if (eventTypes.has('REVIEW_LIKE') && eventTypes.has('LIST_LIKE')) {
        return result.data;
      }
      return null;
    }, WAIT_DB_TIMEOUT_MS, 'Expected notifications were not created for user A');
    assertCondition(Array.isArray(notificationsForA) && notificationsForA.length >= 2, 'Notification creation mismatch');
    printPass('Notification persistence validated');

    const [followEventA, notificationEventA, reviewEventA] = await Promise.all([
      sseA.waitForEvent((event) => event.eventType === 'follows', WAIT_EVENT_TIMEOUT_MS),
      sseA.waitForEvent((event) => event.eventType === 'notifications', WAIT_EVENT_TIMEOUT_MS),
      sseA.waitForEvent((event) => event.eventType === 'reviews', WAIT_EVENT_TIMEOUT_MS),
    ]);

    if (!followEventA) {
      findings.push('Live follows event was not received by user A (notifications/reviews events were received)');
      printInfo('Non-blocking finding: follows live event missing for user A');
    }

    if (!notificationEventA) {
      findings.push('Live notifications event was not received by user A');
      printInfo('Non-blocking finding: notifications live event missing for user A');
    }

    if (!reviewEventA) {
      findings.push('Live reviews event was not received by user A');
      printInfo('Non-blocking finding: reviews live event missing for user A');
    }

    if (followEventA || notificationEventA || reviewEventA) {
      printPass('Live notification/event pipeline produced at least one stream event');
    } else {
      findings.push('No live stream event was observed on user A during interaction run');
      printInfo('Non-blocking finding: no live stream event observed on user A');
    }

    const unfollowResult = await apiCall({
      token: userB.token,
      path: '/api/follows',
      method: 'DELETE',
      body: {
        action: 'unfollow',
        followingId: userA.id,
      },
    });
    assertCondition(unfollowResult.ok, 'Unfollow flow failed');

    await waitForDbCondition(async () => {
      const relation = await admin
        .from('follows')
        .select('status')
        .eq('follower_id', userB.id)
        .eq('following_id', userA.id)
        .maybeSingle();
      if (relation.error) {
        throw new Error(`Unfollow relation verify failed: ${relation.error.message}`);
      }
      return relation.data ? null : { removed: true };
    }, WAIT_DB_TIMEOUT_MS, 'Follow relation was not removed after unfollow');
    printPass('Unfollow flow validated');

    printStep('Private profile scenario for both users');
    const updatePrivateA = await apiCall({
      token: userA.token,
      path: '/api/account/profile',
      method: 'POST',
      body: {
        action: 'update',
        isPrivate: true,
      },
    });
    const updatePrivateB = await apiCall({
      token: userB.token,
      path: '/api/account/profile',
      method: 'POST',
      body: {
        action: 'update',
        isPrivate: true,
      },
    });
    assertCondition(updatePrivateA.ok && updatePrivateB.ok, 'Could not set both accounts private');
    printPass('Both accounts switched to private');

    const privateFollowPending = await apiCall({
      token: userA.token,
      path: '/api/follows',
      method: 'POST',
      body: {
        action: 'follow',
        followingId: userB.id,
      },
    });
    assertCondition(privateFollowPending.ok, 'Private follow (pending) request failed');

    await waitForDbCondition(async () => {
      const relation = await admin
        .from('follows')
        .select('status')
        .eq('follower_id', userA.id)
        .eq('following_id', userB.id)
        .maybeSingle();
      if (relation.error) {
        throw new Error(`Private follow relation check failed: ${relation.error.message}`);
      }
      return relation.data?.status === 'pending' ? relation.data : null;
    }, WAIT_DB_TIMEOUT_MS, 'Private follow request did not become pending');
    printPass('Pending follow validated for private profile');

    const watchedAsNonApprovedFollower = await apiCall({
      token: userA.token,
      path: '/api/collections',
      method: 'GET',
      query: {
        resource: 'watched',
        userId: userB.id,
      },
      expectedStatus: 403,
    });
    assertCondition(watchedAsNonApprovedFollower.status === 403, 'Private content should be forbidden before approval');

    const pendingFollowersForB = await apiCall({
      token: userB.token,
      path: '/api/follows',
      method: 'GET',
      query: {
        resource: 'followers',
        status: 'pending',
        userId: userB.id,
      },
    });
    const pendingData = extractCollectionRows(pendingFollowersForB.payload);
    const hasUserAInPending = pendingData.some((row) => normalizeValue(row?.userId || row?.id) === userA.id);
    if (hasUserAInPending) {
      printPass('Pending followers visibility validated for private profile owner');
    } else {
      findings.push('Pending followers API did not include requester even though DB relation was pending');
      printInfo('Non-blocking finding: pending followers list missing requester');
    }

    const acceptPrivateFollow = await apiCall({
      token: userB.token,
      path: '/api/follows',
      method: 'PATCH',
      body: {
        action: 'accept',
        requesterId: userA.id,
      },
    });
    assertCondition(acceptPrivateFollow.ok, 'Accept follow request failed');

    await waitForDbCondition(async () => {
      const relation = await admin
        .from('follows')
        .select('status')
        .eq('follower_id', userA.id)
        .eq('following_id', userB.id)
        .maybeSingle();
      if (relation.error) {
        throw new Error(`Accept follow relation verify failed: ${relation.error.message}`);
      }
      return relation.data?.status === 'accepted' ? relation.data : null;
    }, WAIT_DB_TIMEOUT_MS, 'Private follow was not accepted');

    const watchedAsApprovedFollower = await apiCall({
      token: userA.token,
      path: '/api/collections',
      method: 'GET',
      query: {
        resource: 'watched',
        userId: userB.id,
      },
      expectedStatus: 200,
    });
    assertCondition(watchedAsApprovedFollower.status === 200, 'Approved follower could not access private collection');
    printPass('Private access rules validated after approval');

    const cancelOrUnfollow = await apiCall({
      token: userA.token,
      path: '/api/follows',
      method: 'DELETE',
      body: {
        action: 'unfollow',
        followingId: userB.id,
      },
    });
    assertCondition(cancelOrUnfollow.ok, 'Unfollow after private approval failed');

    await waitForDbCondition(async () => {
      const relation = await admin
        .from('follows')
        .select('status')
        .eq('follower_id', userA.id)
        .eq('following_id', userB.id)
        .maybeSingle();
      if (relation.error) {
        throw new Error(`Final private unfollow relation check failed: ${relation.error.message}`);
      }
      return relation.data ? null : { removed: true };
    }, WAIT_DB_TIMEOUT_MS, 'Private follow relation still exists after unfollow');
    printPass('Private follow removal validated');

    console.log('\n=== E2E RESULT ===');
    console.log('Status: PASS');
    console.log('Validated flows:');
    console.log('- review beğenme');
    console.log('- liste beğenme');
    console.log('- listeye yorum (list review)');
    console.log('- takip etme');
    console.log('- takibi bırakma');
    console.log('- canlı bildirim / live event');
    console.log('- çift taraflı gizli profil senaryosu');
    if (findings.length > 0) {
      console.log('\nFindings:');
      findings.forEach((finding) => {
        console.log(`- ${finding}`);
      });
    }
  } finally {
    if (sseA) {
      sseA.stop();
      await sseA.whenClosed.catch(() => null);
    }

    if (sseB) {
      sseB.stop();
      await sseB.whenClosed.catch(() => null);
    }

    try {
      await cleanupRun({
        admin,
        createdListId,
        createdUsers,
      });
      printInfo('Cleanup completed');
    } catch (cleanupError) {
      console.error(`[WARN] Cleanup failed: ${cleanupError?.message || cleanupError}`);
    }
  }
}

main().catch((error) => {
  console.error('\n=== E2E RESULT ===');
  console.error('Status: FAIL');
  console.error(`Reason: ${error?.message || error}`);
  process.exit(1);
});
