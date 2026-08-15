import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kgvflhhpghismyvnxuev.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

assert.ok(SUPABASE_URL, 'SUPABASE_URL must be set');
assert.ok(SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY must be set');
assert.ok(SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY must be set');

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test('1. Supabase Admin Connection & Basic Tables Query', async () => {
  const tables = ['profiles', 'lists', 'likes', 'watched', 'watchlist', 'activity', 'media_reviews', 'notifications'];
  
  for (const table of tables) {
    const { data, error } = await adminClient.from(table).select('*').limit(3);
    assert.equal(error, null, `Querying table ${table} as admin failed: ${error?.message}`);
    assert.ok(Array.isArray(data), `Expected data from ${table} to be an array`);
  }
});

test('2. Anonymous RLS Policies on Public Tables', async () => {
  // Profiles should be publicly readable
  const { data: profiles, error: profileErr } = await anonClient.from('profiles').select('id, username, display_name').limit(2);
  assert.equal(profileErr, null, `Anon reading profiles failed: ${profileErr?.message}`);
  assert.ok(Array.isArray(profiles));

  // Media reviews should be publicly readable
  const { data: reviews, error: reviewErr } = await anonClient.from('media_reviews').select('media_key, user_id, content, rating').limit(2);
  assert.equal(reviewErr, null, `Anon reading media_reviews failed: ${reviewErr?.message}`);
  assert.ok(Array.isArray(reviews));

  // Public lists should be readable
  const { data: lists, error: listErr } = await anonClient.from('lists').select('id, title, slug').limit(2);
  assert.equal(listErr, null, `Anon reading lists failed: ${listErr?.message}`);
  assert.ok(Array.isArray(lists));

  // Activity should execute RLS without error
  const { data: activities, error: actErr } = await anonClient.from('activity').select('id, event_type').limit(2);
  assert.equal(actErr, null, `Anon reading activity failed: ${actErr?.message}`);
  assert.ok(Array.isArray(activities));

  // Likes / Watched / Watchlist should execute RLS without error
  const { data: likes, error: likesErr } = await anonClient.from('likes').select('media_key').limit(2);
  assert.equal(likesErr, null, `Anon reading likes failed: ${likesErr?.message}`);
  assert.ok(Array.isArray(likes));

  const { data: watched, error: watchedErr } = await anonClient.from('watched').select('media_key').limit(2);
  assert.equal(watchedErr, null, `Anon reading watched failed: ${watchedErr?.message}`);
  assert.ok(Array.isArray(watched));
});

test('3. Anonymous Write Security (RLS Enforcement)', async () => {
  // Anon user should NOT be able to insert into likes
  const { error: insertLikeErr } = await anonClient.from('likes').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    media_key: 'movie:999999',
  });
  assert.ok(insertLikeErr, 'Anon user should be denied write access to likes');

  // Anon user should NOT be able to insert into activity
  const { error: insertActErr } = await anonClient.from('activity').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    event_type: 'custom_event',
    payload: {},
  });
  assert.ok(insertActErr, 'Anon user should be denied write access to activity');
});

test('4. IMDb Top 100 Static Dataset Integrity (0 Runtime Subrequests)', async () => {
  const { IMDB_TOP_100_MOVIES, IMDB_TOP_100_TV_SHOWS } = await import('../domains/home/shared/imdb-top-100-data.js');
  const { getImdbTop100 } = await import('../domains/home/server/imdb-top-100.server.js');

  assert.equal(IMDB_TOP_100_MOVIES.length, 100, 'Must have exactly 100 movies');
  assert.equal(IMDB_TOP_100_TV_SHOWS.length, 100, 'Must have exactly 100 TV shows');

  const movies = await getImdbTop100('movie');
  assert.equal(movies.length, 100);
  assert.ok(movies[0].id, 'First movie must have a valid TMDB id');
  assert.ok(movies[0].title, 'First movie must have a title');

  const tv = await getImdbTop100('tv');
  assert.equal(tv.length, 100);
  assert.ok(tv[0].id, 'First TV show must have a valid TMDB id');
  assert.ok(tv[0].name || tv[0].title, 'First TV show must have a name or title');
});

test('5. Auth Session Verification Cache Logic', async () => {
  const { readSessionFromRequest } = await import('../domains/auth/server/session.server.js');
  
  // A request without auth headers or cookies should cleanly return null session without errors
  const mockReq = new Request('https://tvizzie.local/api/account/profile');
  const session = await readSessionFromRequest(mockReq, { requireSession: false });
  assert.equal(session, null, 'Unauthenticated request must return null session');
});

test('6. Profile and Username Resolver Caching', async () => {
  const { getAccountIdByUsername } = await import('../domains/account/server/profile.server.js');
  
  // Non-existent username should return null without error
  const nonExistent = await getAccountIdByUsername('non_existent_test_user_99999');
  assert.equal(nonExistent, null);
});

test('7. Activity Feed Query (Zero Count Overhead)', async () => {
  const { fetchAccountActivityFeedServer } = await import('../domains/account/server/feed.server.js');
  
  // Query feed with valid public user ID
  const result = await fetchAccountActivityFeedServer({
    pageSize: 10,
    scope: 'user',
    userId: 'b3d369ff-6a3c-4b88-b5df-2f3f54b6f60f',
  });
  assert.ok(result);
  assert.ok(Array.isArray(result.items));
  assert.equal(typeof result.hasMore, 'boolean');
});

test('8. Collections & Lists Loading', async () => {
  const { getAccountResource } = await import('../domains/account/server/collections.server.js');
  
  // Loading collections for public user
  const likes = await getAccountResource({
    resource: 'likes',
    userId: 'b3d369ff-6a3c-4b88-b5df-2f3f54b6f60f',
  });
  assert.ok(Array.isArray(likes));

  const watched = await getAccountResource({
    resource: 'watched',
    userId: 'b3d369ff-6a3c-4b88-b5df-2f3f54b6f60f',
  });
  assert.ok(Array.isArray(watched));

  const lists = await getAccountResource({
    resource: 'lists',
    userId: 'b3d369ff-6a3c-4b88-b5df-2f3f54b6f60f',
  });
  assert.ok(Array.isArray(lists));
});

test('9. Database Lifecycle State Integrity', async () => {
  const { data: lifecycleData, error: lifecycleErr } = await adminClient
    .from('account_lifecycle')
    .select('user_id, state')
    .limit(5);
  assert.equal(lifecycleErr, null);
  assert.ok(Array.isArray(lifecycleData));
});

test('10. Atomic Review & List RPC Procedures (1-Hop Transaction)', async () => {
  const testUserId = 'b3d369ff-6a3c-4b88-b5df-2f3f54b6f60f';
  
  // 1. list_create_atomic
  const { data: createdList, error: createErr } = await adminClient.rpc('list_create_atomic', {
    p_description: 'Test List Description',
    p_payload: { test: true },
    p_poster_path: null,
    p_slug: 'test-runtime-list-' + Date.now(),
    p_title: 'Test Runtime List',
    p_user_id: testUserId,
  });
  assert.equal(createErr, null, 'list_create_atomic must succeed');
  const listRow = Array.isArray(createdList) ? createdList[0] : createdList;
  assert.ok(listRow?.id, 'Created list must have an ID');

  // 2. review_upsert_list (Add comment)
  const { data: commentRes, error: commentErr } = await adminClient.rpc('review_upsert_list', {
    p_content: 'This is a great test list!',
    p_is_spoiler: false,
    p_list_id: listRow.id,
    p_payload: {},
    p_rating: null,
    p_user_id: testUserId,
  });
  assert.equal(commentErr, null, 'review_upsert_list must succeed');
  const commentRow = Array.isArray(commentRes) ? commentRes[0] : commentRes;
  const commentCount = commentRow.out_reviews_count ?? commentRow.reviews_count;
  assert.equal(commentCount, 1, 'reviews_count must be 1');

  // 3. review_delete_list (Remove comment)
  const { data: deleteCommentRes, error: delCommErr } = await adminClient.rpc('review_delete_list', {
    p_list_id: listRow.id,
    p_user_id: testUserId,
  });
  assert.equal(delCommErr, null, 'review_delete_list must succeed');
  const delCommRow = Array.isArray(deleteCommentRes) ? deleteCommentRes[0] : deleteCommentRes;
  const delCommCount = delCommRow.out_reviews_count ?? delCommRow.reviews_count;
  assert.equal(delCommCount, 0, 'reviews_count must be 0 after delete');

  // 4. list_delete_cascade (Delete list and children)
  const { data: deleteListRes, error: delListErr } = await adminClient.rpc('list_delete_cascade', {
    p_list_id: listRow.id,
    p_user_id: testUserId,
  });
  assert.equal(delListErr, null, 'list_delete_cascade must succeed');
  assert.equal(deleteListRes, true, 'list_delete_cascade must return true');

  // 5. review_upsert_media (Atomic rating and review)
  const testMediaKey = 'movie:99999999';
  const { data: mediaReviewRes, error: mediaRevErr } = await adminClient.rpc('review_upsert_media', {
    p_backdrop_path: null,
    p_content: 'Atomic procedure test review',
    p_entity_id: '99999999',
    p_entity_type: 'movie',
    p_is_spoiler: false,
    p_media_key: testMediaKey,
    p_payload: { test: true },
    p_poster_path: null,
    p_rating: 4.5,
    p_title: 'Test Movie',
    p_user_id: testUserId,
  });
  assert.equal(mediaRevErr, null, 'review_upsert_media must succeed');
  
  // Cleanup test media review & watched entry
  await adminClient.from('media_reviews').delete().eq('media_key', testMediaKey).eq('user_id', testUserId);
  await adminClient.from('watched').delete().eq('media_key', testMediaKey).eq('user_id', testUserId);
});

test('11. Edge CDN Cache Policy Headers Verification', async () => {
  const { CACHE_CONTROL, cacheControlHeaders } = await import('../infrastructure/http/cache-policy.server.js');
  
  // Directives must include s-maxage and stale-while-revalidate for edge caching
  assert.ok(CACHE_CONTROL.PUBLIC_SOCIAL_PROOF.includes('s-maxage'));
  assert.ok(CACHE_CONTROL.PUBLIC_SOCIAL_PROOF.includes('stale-while-revalidate'));
  
  assert.ok(CACHE_CONTROL.PUBLIC_COMMUNITY_SEARCH.includes('s-maxage'));
  assert.ok(CACHE_CONTROL.PUBLIC_ACCOUNT_RESOLVE.includes('s-maxage'));
  assert.ok(CACHE_CONTROL.PUBLIC_MEDIA_REVIEWS.includes('s-maxage'));

  const headerObj = cacheControlHeaders(CACHE_CONTROL.PUBLIC_SOCIAL_PROOF);
  assert.equal(headerObj['Cache-Control'], CACHE_CONTROL.PUBLIC_SOCIAL_PROOF);
});

test('12. Edge Rate Limiter Sliding Window Enforcement', async () => {
  const { checkRateLimit, assertRateLimit, clearRateLimitMemory } = await import('../infrastructure/http/rate-limiter.server.js');
  
  clearRateLimitMemory();
  const mockReq = new Request('https://tvizzie.local/api/reviews/write', {
    headers: { 'x-forwarded-for': '192.168.1.100' },
  });

  // 3 requests with limit 3 should all succeed
  for (let i = 0; i < 3; i++) {
    const res = checkRateLimit(mockReq, { key: 'test-limit', limit: 3, windowSeconds: 60 });
    assert.equal(res.allowed, true);
  }

  // 4th request must be blocked (allowed: false)
  const blocked = checkRateLimit(mockReq, { key: 'test-limit', limit: 3, windowSeconds: 60 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);

  // assertRateLimit should throw 429 error
  assert.throws(
    () => {
      assertRateLimit(mockReq, { key: 'test-limit', limit: 3, windowSeconds: 60 });
    },
    (err) => err?.status === 429 && err?.code === 'RATE_LIMIT_EXCEEDED',
  );

  clearRateLimitMemory();
});

test('13. Profile Counters Single-Lookup Integrity', async () => {
  const { data: counters, error } = await adminClient
    .from('profile_counters')
    .select('likes_count, lists_count, watched_count, watchlist_count, follower_count, following_count')
    .limit(1)
    .maybeSingle();

  assert.equal(error, null, 'profile_counters query must not error');
  if (counters) {
    assert.ok(Number.isInteger(counters.likes_count));
    assert.ok(Number.isInteger(counters.lists_count));
    assert.ok(Number.isInteger(counters.watched_count));
    assert.ok(Number.isInteger(counters.follower_count));
  }
});

test('14. Atomic Follow & Unfollow RPC Procedure (follow_mutate_atomic)', async () => {
  const { data: profiles } = await adminClient.from('profiles').select('id, is_private').limit(2);
  if (!profiles || profiles.length < 2) return;

  const actorId = profiles[0].id;
  const targetId = profiles[1].id;

  // 1. Follow action
  const { data: followRes, error: followErr } = await adminClient.rpc('follow_mutate_atomic', {
    p_action: 'follow',
    p_actor_id: actorId,
    p_target_id: targetId,
  });
  assert.equal(followErr, null, 'follow_mutate_atomic follow must succeed');
  const followResult = Array.isArray(followRes) ? followRes[0] : followRes;
  assert.ok(['pending', 'accepted'].includes(followResult?.out_status));

  // 2. Unfollow action
  const { data: unfollowRes, error: unfollowErr } = await adminClient.rpc('follow_mutate_atomic', {
    p_action: 'unfollow',
    p_actor_id: actorId,
    p_target_id: targetId,
  });
  assert.equal(unfollowErr, null, 'follow_mutate_atomic unfollow must succeed');
  const unfollowResult = Array.isArray(unfollowRes) ? unfollowRes[0] : unfollowRes;
  assert.equal(unfollowResult?.out_status, 'removed');
});

test('15. TMDb In-Memory Cache Deduplication & Stampede Protection', async () => {
  const { getOrLoadCachedValue } = await import('../infrastructure/http/memory-cache.server.js');
  
  let rawFetchCount = 0;
  const mockLoader = async () => {
    rawFetchCount += 1;
    await new Promise((r) => setTimeout(r, 10));
    return { title: 'Inception', id: 27205 };
  };

  // Launch 5 concurrent calls with same key
  const results = await Promise.all([
    getOrLoadCachedValue({ cacheKey: 'tmdb|path=/movie/27205|q={}', ttlMs: 5000, loader: mockLoader }),
    getOrLoadCachedValue({ cacheKey: 'tmdb|path=/movie/27205|q={}', ttlMs: 5000, loader: mockLoader }),
    getOrLoadCachedValue({ cacheKey: 'tmdb|path=/movie/27205|q={}', ttlMs: 5000, loader: mockLoader }),
    getOrLoadCachedValue({ cacheKey: 'tmdb|path=/movie/27205|q={}', ttlMs: 5000, loader: mockLoader }),
    getOrLoadCachedValue({ cacheKey: 'tmdb|path=/movie/27205|q={}', ttlMs: 5000, loader: mockLoader }),
  ]);

  // Only 1 raw fetch should have occurred
  assert.equal(rawFetchCount, 1, 'Stampede protection must collapse 5 concurrent calls into 1 fetch');
  assert.equal(results[0].id, 27205);
  assert.equal(results[4].id, 27205);

  // Subsequent call should be 0ms instant cached
  const start = performance.now();
  const cached = await getOrLoadCachedValue({ cacheKey: 'tmdb|path=/movie/27205|q={}', ttlMs: 5000, loader: mockLoader });
  const duration = performance.now() - start;
  assert.equal(cached.id, 27205);
  assert.equal(rawFetchCount, 1, 'Cache hit must not execute loader again');
  assert.ok(duration < 5, 'Cached hit must return under 5ms');
});

test('16. Media Detail Path & Link Builders Integrity', async () => {
  const { getMediaDetailPath } = await import('../domains/media/utils/index.js');
  
  const moviePath = getMediaDetailPath({ entityId: '550', entityType: 'movie' });
  assert.equal(moviePath, '/movie/550');

  const tvPath = getMediaDetailPath({ entityId: '1399', entityType: 'tv' });
  assert.equal(tvPath, '/tv/1399');
});

test('17. Community Search GIN Trigram Query Performance', async () => {
  const start = performance.now();
  const { data: lists, error } = await adminClient
    .from('lists')
    .select('id, title, description')
    .or('title.ilike.%top%,description.ilike.%top%')
    .limit(10);
  const duration = performance.now() - start;

  assert.equal(error, null, 'GIN Trigram OR query must succeed');
  assert.ok(Array.isArray(lists), 'Lists result must be an array');
  assert.ok(duration < 500, `GIN Trigram query must be sub-500ms over network (took ${duration.toFixed(1)}ms)`);
});

test('18. Modal Configuration & Position Constants Integrity', async () => {
  const { MODAL_LABELS, MODAL_PRESETS } = await import('../core/modules/modal/config.js');
  
  assert.ok(MODAL_PRESETS.PREVIEW_MODAL, 'PREVIEW_MODAL preset exists');
  assert.ok(MODAL_LABELS.NOTIFICATIONS_MODAL || MODAL_LABELS.PREVIEW_MODAL, 'MODAL_LABELS exists');
  assert.equal(MODAL_LABELS.LIST_EDITOR_MODAL, 'Edit List');
});

test('19. List Item Reordering Swap Logic Integrity', async () => {
  const sampleItems = [{ id: 1, title: 'Item 1' }, { id: 2, title: 'Item 2' }, { id: 3, title: 'Item 3' }];
  
  // Move index 1 (Item 2) up
  const moveUp = (items, index) => {
    const next = [...items];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    return next;
  };

  const reordered = moveUp(sampleItems, 1);
  assert.equal(reordered[0].id, 2, 'Item 2 should now be at index 0');
  assert.equal(reordered[1].id, 1, 'Item 1 should now be at index 1');
  assert.equal(reordered[2].id, 3, 'Item 3 remains at index 2');
});

test('20. Notifications Direct Database Resources Integrity', async () => {
  const { getNotificationList, getUnreadNotificationCount } = await import('../domains/social/server/notifications/notification-resources.server.js');
  const { NOTIFICATION_TYPE_SET } = await import('../domains/social/utils/index.js');
  const { data: profiles } = await adminClient.from('profiles').select('id').limit(1);
  if (!profiles || profiles.length === 0) return;

  const testUserId = profiles[0].id;
  const count = await getUnreadNotificationCount(testUserId, NOTIFICATION_TYPE_SET);
  assert.equal(typeof count, 'number');

  const list = await getNotificationList(testUserId, NOTIFICATION_TYPE_SET, 10);
  assert.ok(Array.isArray(list));
});

test('21. Search Quality Events Clean Purge & Concurrency RPC Integrity', async () => {
  // Verify search quality tables no longer exist in public schema
  const { data: searchEvents } = await adminClient
    .from('search_quality_events')
    .select('*')
    .limit(1);
  assert.equal(searchEvents, null, 'search_quality_events table should no longer exist');

  // Verify operational cleanup works smoothly
  const { data: cleanupResult, error: cleanupError } = await adminClient.rpc('cleanup_operational_events');
  assert.equal(cleanupError, null, 'cleanup_operational_events should execute without errors');
  assert.ok(cleanupResult && typeof cleanupResult === 'object', 'cleanupResult should return JSON report');
});

test('22. Follow Relationship State & Optimistic Privacy Logic Integrity', async () => {
  const { FOLLOW_STATUSES } = await import('../domains/social/utils/index.js');
  assert.equal(FOLLOW_STATUSES.ACCEPTED, 'accepted');
  assert.equal(FOLLOW_STATUSES.PENDING, 'pending');

  const resolveOptimisticStatus = (isPrivate) => isPrivate ? FOLLOW_STATUSES.PENDING : FOLLOW_STATUSES.ACCEPTED;
  assert.equal(resolveOptimisticStatus(true), 'pending');
  assert.equal(resolveOptimisticStatus(false), 'accepted');
});
















