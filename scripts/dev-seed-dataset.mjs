#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DATASET_TAG = 'tvizzie-dev-large-v1';
const SEED_USER_PASSWORD = 'TvizzieDevSeed2026!';
const TMDB_API_URL = 'https://api.themoviedb.org/3';
const BATCH_SIZE = 500;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const EVENT_TYPES = Object.freeze({
  FOLLOW_CREATED: 'FOLLOW_CREATED',
  LIKED_ADDED: 'LIKED_ADDED',
  LIST_COMMENTED: 'LIST_COMMENTED',
  LIST_CREATED: 'LIST_CREATED',
  LIST_LIKED: 'LIST_LIKED',
  REVIEW_LIKED: 'REVIEW_LIKED',
  REVIEW_PUBLISHED: 'REVIEW_PUBLISHED',
  WATCHED_ADDED: 'WATCHED_ADDED',
  WATCHLIST_ADDED: 'WATCHLIST_ADDED',
});

const SLOT_TYPES = Object.freeze({
  LIKED_ENTRY: 'LIKED_ENTRY',
  LIST_CREATED: 'LIST_CREATED',
  LIST_LIKE: 'LIST_LIKE',
  LIST_OPINION: 'LIST_OPINION',
  MEDIA_OPINION: 'MEDIA_OPINION',
  REVIEW_LIKE: 'REVIEW_LIKE',
  WATCHED_ENTRY: 'WATCHED_ENTRY',
  WATCHLIST_ENTRY: 'WATCHLIST_ENTRY',
});

const SEED_USERS = [
  {
    bio: 'Movie-heavy watcher who keeps a deep watchlist and reviews older releases with a patient eye.',
    displayName: 'Mina Hart',
    email: 'dev-seed-mina@tvizzie.local',
    mediaLikeCount: 260,
    movieBias: 0.78,
    reviewLikeCount: 90,
    listLikeCount: 50,
    sentimentBias: 0.68,
    username: 'dev_mina',
  },
  {
    bio: 'TV-focused binger who tracks seasons, pilots, finales, and long-running comfort shows.',
    displayName: 'Leo Park',
    email: 'dev-seed-leo@tvizzie.local',
    mediaLikeCount: 230,
    movieBias: 0.31,
    reviewLikeCount: 110,
    listLikeCount: 60,
    sentimentBias: 0.62,
    username: 'dev_leo',
  },
  {
    bio: 'Review-first critic who is generous with thoughtful likes and blunt about weak scripts.',
    displayName: 'Nora Vale',
    email: 'dev-seed-nora@tvizzie.local',
    mediaLikeCount: 160,
    movieBias: 0.56,
    reviewLikeCount: 170,
    listLikeCount: 70,
    sentimentBias: 0.52,
    username: 'dev_nora',
  },
  {
    bio: 'List curator who builds themed shelves, comments often, and follows what friends are logging.',
    displayName: 'Arda Demir',
    email: 'dev-seed-arda@tvizzie.local',
    mediaLikeCount: 140,
    movieBias: 0.48,
    reviewLikeCount: 170,
    listLikeCount: 90,
    sentimentBias: 0.6,
    username: 'dev_arda',
  },
];

const LIST_THEMES = [
  'Late Night Discoveries',
  'Rainy Weekend Queue',
  'Sharp Dialogue Picks',
  'Comfort Rewatches',
  'Underseen Favorites',
  'Big Mood Watchlist',
  'Festival Energy',
  'Messy Families',
  'Quiet Character Studies',
  'Crowd Pleasers',
  'Slow Burn Stories',
  'Stylish Thrillers',
  'First Episode Hooks',
  'Finale Conversations',
  'Best Ensemble Work',
  'Hidden Streaming Gems',
  'Sunday Afternoon Picks',
  'Stories With Bite',
  'Peak Rewatch Value',
  'Great Opening Scenes',
  'Low Stakes Escapes',
  'High Tension Nights',
  'Unexpected Tearjerkers',
  'Friend Group Picks',
  'Background Vibes',
  'Auteur Corners',
  'Smart Genre Plays',
  'Beautifully Shot',
  'Chaotic Good Energy',
  'Worth the Hype',
];

const REVIEW_OPENERS = {
  positive: [
    'This landed much better than I expected.',
    'The whole thing has a confident pulse from the opening stretch.',
    'I kept thinking about the small choices after it ended.',
    'There is a lot of craft hiding under the easy surface here.',
    'It works because the emotional turns feel earned.',
  ],
  neutral: [
    'This is uneven, but there is enough here to keep it interesting.',
    'I liked parts of this more than the whole.',
    'The idea is stronger than the execution, though it never fully loses me.',
    'It has a few flat spots, but the best scenes are worth the trip.',
    'I can see why people respond to it even when it did not fully click for me.',
  ],
  negative: [
    'I wanted to like this more than I did.',
    'There are good ingredients here, but the rhythm keeps slipping.',
    'The premise is solid and the follow-through is surprisingly thin.',
    'A few moments work, yet the overall shape feels undercooked.',
    'This kept circling strong ideas without finding a convincing point of view.',
  ],
};

const REVIEW_DETAILS = [
  'The performances carry a lot of the quieter scenes.',
  'The pacing makes the middle section feel more alive than it should.',
  'The visual choices are doing real narrative work.',
  'The ending will probably divide people, which I respect.',
  'The score knows when to step back.',
  'A tighter edit would have made the best ideas hit harder.',
  'The supporting characters are more textured than expected.',
  'It is strongest when it trusts silence and reaction shots.',
  'The jokes are hit or miss, but the tone is clear.',
  'The world feels lived in without overexplaining itself.',
  'The second half has a few choices that feel too convenient.',
  'There is one scene near the end that almost justifies the whole thing.',
];

const REVIEW_CLOSERS = [
  'I would recommend it to someone already curious about the premise.',
  'Not perfect, but it has enough personality to stand apart.',
  'I am glad I gave it the time.',
  'It is the kind of watch that benefits from the right mood.',
  'I may revisit it later and see if it grows.',
  'Worth watching for the texture, even when the story wobbles.',
  'It will not be for everyone, but I understand the appeal.',
  'A stronger finish would have pushed it into favorite territory.',
];

const COMMENT_LINES = [
  'This list has a really useful rhythm to it.',
  'I saved this because the mix feels more personal than the usual recommendations.',
  'The ordering makes me want to start near the middle and work outward.',
  'A few of these have been sitting in my queue for too long.',
  'This is exactly the kind of theme that helps me choose something quickly.',
  'I like that this includes both obvious picks and a few left turns.',
  'The first five already sell the whole list.',
  'I would add one more wildcard, but the mood is very clear.',
  'This feels built by someone who actually watches all of it.',
  'Good pull on the older titles here.',
];

function parseArgs() {
  const args = new Set(process.argv.slice(2));

  return {
    execute: args.has('--yes') || args.has('--execute'),
    resetAllDevData: args.has('--reset-all-dev-data'),
    skipTmdb: args.has('--skip-tmdb'),
  };
}

function assertEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  return { serviceKey, url };
}

function createAdminClient() {
  const { serviceKey, url } = assertEnv();

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init = {}) => fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(30000) }),
    },
  });
}

function sample(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function shuffle(values) {
  const next = [...values];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedTimelineDate({ after = null, maxDaysAgo = 420 } = {}) {
  const now = Date.now();
  const oldest = now - maxDaysAgo * ONE_DAY_MS;
  const lowerBound = after ? Math.max(new Date(after).getTime() + randomInt(1, 72) * 60 * 60 * 1000, oldest) : oldest;
  const recentBias = Math.random();
  const upper = now - randomInt(0, 6 * 60 * 60 * 1000);
  const recentLower = Math.max(lowerBound, now - randomInt(1, 45) * ONE_DAY_MS);
  const timestamp =
    recentBias < 0.38 ? randomInt(recentLower, upper) : randomInt(lowerBound, Math.max(lowerBound + 1, upper));

  return new Date(timestamp).toISOString();
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '');
}

function mediaKey(item) {
  return `${item.entityType}_${item.entityId}`;
}

function mediaSubject(item) {
  return {
    href: `/${item.entityType}/${item.entityId}`,
    id: item.entityId,
    ownerId: null,
    ownerUsername: null,
    poster: item.poster_path || null,
    slug: null,
    title: item.title,
    type: item.entityType,
  };
}

function listSubject(list) {
  return {
    href: `/account/${list.owner.username}/lists/${list.slug}`,
    id: list.id,
    ownerId: list.owner.id,
    ownerUsername: list.owner.username,
    poster: list.poster_path || null,
    slug: list.slug,
    title: list.title,
    type: 'list',
  };
}

function subjectRef(subject) {
  return `${subject.type}:${subject.id}`;
}

function dedupeKey({ actorUserId, primaryRef, secondaryRef = '-', slotType }) {
  return `slot:${actorUserId}:${slotType}:${primaryRef}:${secondaryRef || '-'}`;
}

function actorSnapshot(user) {
  return {
    avatarUrl: user.avatarUrl || null,
    displayName: user.displayName,
    id: user.id,
    username: user.username,
  };
}

function ownerSnapshot(user) {
  return {
    avatarUrl: user.avatarUrl || null,
    displayName: user.displayName,
    id: user.id,
    username: user.username,
  };
}

function createActivity({
  details = {},
  eventType,
  occurredAt,
  renderKind = 'text',
  reviewCard = null,
  secondaryRef = '-',
  slotType,
  subject,
  user,
}) {
  const primaryRef = subjectRef(subject);
  const key = dedupeKey({
    actorUserId: user.id,
    primaryRef,
    secondaryRef,
    slotType,
  });
  const actor = actorSnapshot(user);
  const payload = {
    actor,
    dedupeKey: key,
    details,
    eventType,
    occurredAt,
    primaryRef,
    renderKind,
    reviewCard,
    secondaryRef,
    slotType,
    subject,
    version: 2,
    visibility: user.isPrivate ? 'followers' : 'public',
  };

  return {
    created_at: occurredAt,
    dedupe_key: key,
    event_type: eventType,
    payload,
    updated_at: occurredAt,
    user_id: user.id,
  };
}

function createFollowActivity({ createdAt, followed, follower }) {
  const key = `follow-created:${followed.id}:accepted`;

  return {
    created_at: createdAt,
    dedupe_key: key,
    event_type: EVENT_TYPES.FOLLOW_CREATED,
    payload: {
      actor: actorSnapshot(follower),
      eventType: EVENT_TYPES.FOLLOW_CREATED,
      payload: {
        dedupeKey: key,
        status: 'accepted',
        subjectDisplayName: followed.displayName,
        subjectId: followed.id,
        subjectType: 'user',
        subjectUsername: followed.username,
      },
      subject: {
        href: `/account/${followed.username}`,
        id: followed.id,
        ownerId: null,
        ownerUsername: followed.username,
        poster: null,
        slug: null,
        title: followed.displayName,
        type: 'user',
      },
      visibility: follower.isPrivate ? 'followers' : 'public',
    },
    updated_at: createdAt,
    user_id: follower.id,
  };
}

function normalizeTmdbItem(item, entityType) {
  const entityId = String(item.id || '').trim();
  const title = entityType === 'movie' ? item.title || item.original_title : item.name || item.original_name;

  if (!entityId || !title || !item.poster_path) {
    return null;
  }

  return {
    backdrop_path: item.backdrop_path || null,
    entityId,
    entityType,
    first_air_date: entityType === 'tv' ? item.first_air_date || null : null,
    genre_ids: Array.isArray(item.genre_ids) ? item.genre_ids : [],
    id: entityId,
    mediaKey: `${entityType}_${entityId}`,
    media_type: entityType,
    name: entityType === 'tv' ? title : '',
    original_name: entityType === 'tv' ? item.original_name || title : null,
    original_title: entityType === 'movie' ? item.original_title || title : null,
    popularity: Number.isFinite(Number(item.popularity)) ? Number(item.popularity) : null,
    poster_path: item.poster_path || null,
    release_date: entityType === 'movie' ? item.release_date || null : null,
    title,
    vote_average: Number.isFinite(Number(item.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item.vote_count)) ? Number(item.vote_count) : null,
  };
}

async function tmdbRequest(path, params = {}) {
  const token = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_READ_TOKEN;

  if (!token) {
    throw new Error('TMDB_API_KEY or NEXT_PUBLIC_TMDB_READ_TOKEN is required unless --skip-tmdb is used.');
  }

  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const url = new URL(`${TMDB_API_URL}/${normalizedPath}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function loadTmdbPool({ skipTmdb = false } = {}) {
  if (skipTmdb) {
    return createFallbackMediaPool();
  }

  const moviePages = Array.from({ length: 50 }, (_, index) => index + 1);
  const tvPages = Array.from({ length: 50 }, (_, index) => index + 1);
  const movies = [];
  const shows = [];

  for (const pages of [moviePages, tvPages]) {
    for (let index = 0; index < pages.length; index += 5) {
      const chunk = pages.slice(index, index + 5);
      const results = await Promise.all(
        chunk.map((page) =>
          tmdbRequest(pages === moviePages ? '/discover/movie' : '/discover/tv', {
            include_adult: false,
            include_null_first_air_dates: false,
            language: 'en-US',
            page,
            sort_by: 'popularity.desc',
            'vote_count.gte': 50,
          })
        )
      );

      results.forEach((payload) => {
        (payload.results || []).forEach((item) => {
          const normalized = normalizeTmdbItem(item, pages === moviePages ? 'movie' : 'tv');
          if (normalized) {
            (pages === moviePages ? movies : shows).push(normalized);
          }
        });
      });
    }
  }

  return {
    movies: dedupeMedia(movies),
    tv: dedupeMedia(shows),
  };
}

function createFallbackMediaPool() {
  const makeItems = (entityType, count) =>
    Array.from({ length: count }, (_, index) => {
      const id = String(100000 + index);
      const title = entityType === 'movie' ? `Seed Movie ${index + 1}` : `Seed Series ${index + 1}`;

      return {
        backdrop_path: null,
        entityId: id,
        entityType,
        first_air_date: entityType === 'tv' ? `20${10 + (index % 14)}-01-01` : null,
        genre_ids: [],
        id,
        mediaKey: `${entityType}_${id}`,
        media_type: entityType,
        name: entityType === 'tv' ? title : '',
        original_name: entityType === 'tv' ? title : null,
        original_title: entityType === 'movie' ? title : null,
        popularity: randomInt(10, 500),
        poster_path: null,
        release_date: entityType === 'movie' ? `20${10 + (index % 14)}-01-01` : null,
        title,
        vote_average: randomInt(50, 88) / 10,
        vote_count: randomInt(80, 5000),
      };
    });

  return {
    movies: makeItems('movie', 1200),
    tv: makeItems('tv', 1200),
  };
}

function dedupeMedia(items) {
  const byKey = new Map();
  items.forEach((item) => byKey.set(mediaKey(item), item));
  return [...byKey.values()];
}

function pickMedia(pool, { count, movieBias, unique = true }) {
  const selected = [];
  const seen = new Set();
  const movieTarget = Math.min(count - 1, Math.max(1, Math.round(count * movieBias) + randomInt(-18, 18)));
  const tvTarget = count - movieTarget;
  const buckets = shuffle([
    ...Array.from({ length: movieTarget }, () => 'movies'),
    ...Array.from({ length: tvTarget }, () => 'tv'),
  ]);

  for (const bucket of buckets) {
    let attempts = 0;

    while (attempts < 100) {
      attempts += 1;
      const candidate = sample(pool[bucket]);
      const key = mediaKey(candidate);

      if (!unique || !seen.has(key)) {
        seen.add(key);
        selected.push(candidate);
        break;
      }
    }
  }

  if (selected.length < count) {
    for (const candidate of shuffle([...pool.movies, ...pool.tv])) {
      if (selected.length >= count) break;
      const key = mediaKey(candidate);
      if (!unique || !seen.has(key)) {
        seen.add(key);
        selected.push(candidate);
      }
    }
  }

  return selected;
}

function createMediaPayload(item, userId, { addedAt, position = null, rating = null, updatedAt = addedAt } = {}) {
  return {
    ...item,
    addedAt,
    mediaKey: mediaKey(item),
    position,
    rating,
    updatedAt,
    userId,
    userRating: rating,
  };
}

function createMediaRow(table, item, user, addedAt) {
  const payload = createMediaPayload(item, user.id, { addedAt });
  const baseRow = {
    added_at: addedAt,
    backdrop_path: item.backdrop_path || null,
    entity_id: item.entityId,
    entity_type: item.entityType,
    media_key: mediaKey(item),
    payload,
    poster_path: item.poster_path || null,
    title: item.title,
    updated_at: addedAt,
    user_id: user.id,
  };

  if (table !== 'watched') {
    return baseRow;
  }

  const watchCount = randomInt(1, 6);
  const sourceLastAction = Math.random() < 0.16 ? 'like' : 'watched';

  return {
    backdrop_path: baseRow.backdrop_path,
    created_at: addedAt,
    entity_id: baseRow.entity_id,
    entity_type: baseRow.entity_type,
    last_watched_at: addedAt,
    media_key: baseRow.media_key,
    payload: {
      ...payload,
      firstWatchedAt: addedAt,
      lastWatchedAt: addedAt,
      sourceLastAction,
      watchCount,
    },
    poster_path: baseRow.poster_path,
    title: baseRow.title,
    updated_at: addedAt,
    user_id: baseRow.user_id,
    watch_count: watchCount,
  };
}

function sentimentForRating(rating, bias) {
  if (rating >= 4 || Math.random() < bias - 0.2) return 'positive';
  if (rating <= 2 || Math.random() > bias + 0.28) return 'negative';
  return 'neutral';
}

function createReviewText(item, user, rating) {
  const sentiment = sentimentForRating(rating, user.sentimentBias);
  const detailCount = randomInt(1, 4);
  const details = shuffle(REVIEW_DETAILS).slice(0, detailCount);
  const titleReference = Math.random() < 0.45 ? ` ${item.title}` : '';
  const closer = sample(REVIEW_CLOSERS);
  const sentences = [
    sample(REVIEW_OPENERS[sentiment]).replace('This', titleReference.trim() || 'This'),
    ...details,
    closer,
  ];

  if (Math.random() < 0.18) {
    sentences.push(
      item.entityType === 'tv'
        ? 'I am especially curious how it plays once the season has room to breathe.'
        : 'It feels like the kind of film people will argue about after the credits.'
    );
  }

  return sentences.join(' ');
}

function createCommentText(list) {
  const lines = shuffle(COMMENT_LINES).slice(0, randomInt(1, 3));
  if (Math.random() < 0.35) {
    lines.push(`The "${list.title}" angle gives it a clear identity.`);
  }
  return lines.join(' ');
}

function createReviewPayload({ content, isSpoiler, item, rating, user }) {
  return {
    content,
    isSpoiler,
    rating,
    reviewContent: content,
    reviewIsSpoiler: isSpoiler,
    reviewRating: rating,
    subjectHref: `/${item.entityType}/${item.entityId}`,
    subjectId: item.entityId,
    subjectKey: mediaKey(item),
    subjectOwnerId: null,
    subjectOwnerUsername: null,
    subjectPoster: item.poster_path || null,
    subjectPreviewItems: [],
    subjectSlug: null,
    subjectTitle: item.title,
    subjectType: item.entityType,
    user: {
      avatarUrl: user.avatarUrl || null,
      email: user.email,
      id: user.id,
      name: user.displayName,
      username: user.username,
    },
  };
}

function createListReviewPayload({ content, list, user }) {
  return {
    content,
    isSpoiler: false,
    rating: null,
    reviewContent: content,
    reviewIsSpoiler: false,
    reviewRating: null,
    subjectHref: `/account/${list.owner.username}/lists/${list.slug}`,
    subjectId: list.id,
    subjectKey: `list:${list.owner.id}:${list.id}`,
    subjectOwnerId: list.owner.id,
    subjectOwnerUsername: list.owner.username,
    subjectPoster: list.poster_path || null,
    subjectPreviewItems: list.previewItems,
    subjectSlug: list.slug,
    subjectTitle: list.title,
    subjectType: 'list',
    user: {
      avatarUrl: user.avatarUrl || null,
      email: user.email,
      id: user.id,
      name: user.displayName,
      username: user.username,
    },
  };
}

function reviewCardFromPayload({ createdAt, payload, user }) {
  return {
    authorId: user.id,
    content: payload.content,
    createdAt,
    id: `${payload.subjectType}:${payload.subjectId}:${user.id}:${createdAt}`,
    isSpoiler: Boolean(payload.isSpoiler),
    likes: [],
    rating: payload.rating,
    reviewUserId: user.id,
    subjectHref: payload.subjectHref,
    subjectId: payload.subjectId,
    subjectKey: payload.subjectKey,
    subjectOwnerId: payload.subjectOwnerId,
    subjectOwnerUsername: payload.subjectOwnerUsername,
    subjectPoster: payload.subjectPoster,
    subjectPreviewItems: payload.subjectPreviewItems,
    subjectSlug: payload.subjectSlug,
    subjectTitle: payload.subjectTitle,
    subjectType: payload.subjectType,
    updatedAt: createdAt,
    user: {
      avatarUrl: user.avatarUrl || null,
      id: user.id,
      name: user.displayName,
      username: user.username,
    },
  };
}

function buildDataset(users, pool) {
  const data = {
    activities: [],
    follows: [],
    likes: [],
    listItems: [],
    listLikes: [],
    listReviews: [],
    lists: [],
    mediaReviews: [],
    reviewLikes: [],
    watched: [],
    watchlist: [],
  };
  const listsById = new Map();
  const reviewTargets = [];
  const mediaLikesByUser = new Map();

  users.forEach((follower) => {
    users
      .filter((followed) => followed.id !== follower.id)
      .forEach((followed) => {
        const createdAt = weightedTimelineDate({ maxDaysAgo: 360 });
        data.follows.push({
          created_at: createdAt,
          follower_avatar_url: follower.avatarUrl || null,
          follower_display_name: follower.displayName,
          follower_id: follower.id,
          follower_username: follower.username,
          following_avatar_url: followed.avatarUrl || null,
          following_display_name: followed.displayName,
          following_id: followed.id,
          following_username: followed.username,
          responded_at: createdAt,
          status: 'accepted',
          updated_at: createdAt,
        });
        data.activities.push(createFollowActivity({ createdAt, followed, follower }));
      });
  });

  users.forEach((user, userIndex) => {
    const watchlistItems = pickMedia(pool, { count: 400, movieBias: user.movieBias + userIndex * 0.015 });
    const watchedItems = pickMedia(pool, { count: 400, movieBias: user.movieBias - 0.08 + userIndex * 0.02 });
    const reviewItems = pickMedia(pool, {
      count: 400,
      movieBias: user.movieBias + (user.username === 'dev_nora' ? 0.1 : -0.04),
    });
    const mediaLikeItems = pickMedia(pool, { count: user.mediaLikeCount, movieBias: user.movieBias });

    mediaLikesByUser.set(user.id, mediaLikeItems);

    watchlistItems.forEach((item) => {
      const addedAt = weightedTimelineDate({ maxDaysAgo: 390 });
      data.watchlist.push(createMediaRow('watchlist', item, user, addedAt));
      data.activities.push(
        createActivity({
          eventType: EVENT_TYPES.WATCHLIST_ADDED,
          occurredAt: addedAt,
          slotType: SLOT_TYPES.WATCHLIST_ENTRY,
          subject: mediaSubject(item),
          user,
        })
      );
    });

    watchedItems.forEach((item) => {
      const watchedAt = weightedTimelineDate({ maxDaysAgo: 420 });
      data.watched.push(createMediaRow('watched', item, user, watchedAt));
      data.activities.push(
        createActivity({
          details: { watchedAt },
          eventType: EVENT_TYPES.WATCHED_ADDED,
          occurredAt: watchedAt,
          slotType: SLOT_TYPES.WATCHED_ENTRY,
          subject: mediaSubject(item),
          user,
        })
      );
    });

    mediaLikeItems.forEach((item) => {
      const addedAt = weightedTimelineDate({ maxDaysAgo: 365 });
      data.likes.push(createMediaRow('likes', item, user, addedAt));
      data.activities.push(
        createActivity({
          eventType: EVENT_TYPES.LIKED_ADDED,
          occurredAt: addedAt,
          slotType: SLOT_TYPES.LIKED_ENTRY,
          subject: mediaSubject(item),
          user,
        })
      );
    });

    reviewItems.forEach((item) => {
      const createdAt = weightedTimelineDate({ maxDaysAgo: 405 });
      const rating = randomInt(1, 10) / 2;
      const content = createReviewText(item, user, rating);
      const payload = createReviewPayload({
        content,
        isSpoiler: Math.random() < 0.06,
        item,
        rating,
        user,
      });
      const reviewCard = reviewCardFromPayload({ createdAt, payload, user });

      data.mediaReviews.push({
        content,
        created_at: createdAt,
        is_spoiler: payload.isSpoiler,
        media_key: mediaKey(item),
        payload,
        rating,
        updated_at: createdAt,
        user_id: user.id,
      });
      data.activities.push(
        createActivity({
          details: { rating },
          eventType: EVENT_TYPES.REVIEW_PUBLISHED,
          occurredAt: createdAt,
          renderKind: 'text_with_review',
          reviewCard,
          slotType: SLOT_TYPES.MEDIA_OPINION,
          subject: mediaSubject(item),
          user,
        })
      );
      reviewTargets.push({
        createdAt,
        mediaKey: mediaKey(item),
        owner: user,
        payload,
        rating,
        subject: mediaSubject(item),
      });
    });

    for (let listIndex = 0; listIndex < 30; listIndex += 1) {
      const id = randomUUID();
      const createdAt = weightedTimelineDate({ maxDaysAgo: 410 });
      const title = `${LIST_THEMES[listIndex]} ${user.displayName.split(' ')[0]}`;
      const slug = `${slugify(title)}-${listIndex + 1}`;
      const items = pickMedia(pool, { count: 400, movieBias: user.movieBias + randomInt(-20, 20) / 100 });
      const previewItems = items.slice(0, 5).map((item, index) => ({
        ...createMediaPayload(item, user.id, { addedAt: createdAt, position: index + 1 }),
        id: item.entityId,
      }));
      const listRecord = {
        created_at: createdAt,
        description: `A ${sample(['carefully mixed', 'mood-first', 'rewatch-friendly', 'conversation-starting'])} collection for testing dense list pages and pagination.`,
        id,
        likes_count: 0,
        owner: user,
        payload: {
          coverUrl: previewItems[0]?.poster_path || '',
          description: '',
          itemsCount: items.length,
          likes: [],
          ownerSnapshot: ownerSnapshot(user),
          previewItems,
          reviewsCount: 0,
          slug,
          title,
        },
        poster_path: previewItems[0]?.poster_path || null,
        previewItems,
        reviews_count: 0,
        slug,
        title,
        updated_at: createdAt,
        user_id: user.id,
      };

      data.lists.push(listRecord);
      listsById.set(id, listRecord);

      items.forEach((item, position) => {
        const addedAt = new Date(new Date(createdAt).getTime() + randomInt(0, 90) * 60 * 1000).toISOString();
        data.listItems.push({
          added_at: addedAt,
          backdrop_path: item.backdrop_path || null,
          entity_id: item.entityId,
          entity_type: item.entityType,
          list_id: id,
          media_key: mediaKey(item),
          payload: createMediaPayload(item, user.id, { addedAt, position: position + 1 }),
          position: position + 1,
          poster_path: item.poster_path || null,
          title: item.title,
          updated_at: addedAt,
          user_id: user.id,
        });
      });

      data.activities.push(
        createActivity({
          eventType: EVENT_TYPES.LIST_CREATED,
          occurredAt: createdAt,
          slotType: SLOT_TYPES.LIST_CREATED,
          subject: listSubject(listRecord),
          user,
        })
      );
    }
  });

  users.forEach((user) => {
    const eligibleLists = shuffle(data.lists.filter((list) => list.user_id !== user.id));
    eligibleLists.slice(0, 30).forEach((list) => {
      const createdAt = weightedTimelineDate({ after: list.created_at, maxDaysAgo: 360 });
      const content = createCommentText(list);
      const payload = createListReviewPayload({ content, list, user });
      const reviewCard = reviewCardFromPayload({ createdAt, payload, user });

      data.listReviews.push({
        content,
        created_at: createdAt,
        is_spoiler: false,
        list_id: list.id,
        payload,
        rating: null,
        updated_at: createdAt,
        user_id: user.id,
      });
      list.reviews_count += 1;
      list.payload.reviewsCount = list.reviews_count;
      list.updated_at = createdAt > list.updated_at ? createdAt : list.updated_at;
      data.activities.push(
        createActivity({
          eventType: EVENT_TYPES.LIST_COMMENTED,
          occurredAt: createdAt,
          renderKind: 'text_with_review',
          reviewCard,
          slotType: SLOT_TYPES.LIST_OPINION,
          subject: listSubject(list),
          user,
        })
      );
      reviewTargets.push({
        createdAt,
        mediaKey: payload.subjectKey,
        owner: user,
        payload,
        rating: null,
        subject: listSubject(list),
      });
    });
  });

  users.forEach((user) => {
    const reviewCandidates = shuffle(reviewTargets.filter((review) => review.owner.id !== user.id));
    reviewCandidates.slice(0, user.reviewLikeCount).forEach((review) => {
      const createdAt = weightedTimelineDate({ after: review.createdAt, maxDaysAgo: 300 });
      data.reviewLikes.push({
        created_at: createdAt,
        media_key: review.mediaKey,
        review_user_id: review.owner.id,
        user_id: user.id,
      });
      data.activities.push(
        createActivity({
          details: {
            reviewKey: review.mediaKey,
            reviewOwnerDisplayName: review.owner.displayName,
            reviewOwnerId: review.owner.id,
            reviewOwnerUsername: review.owner.username,
            reviewRating: review.rating,
          },
          eventType: EVENT_TYPES.REVIEW_LIKED,
          occurredAt: createdAt,
          secondaryRef: review.owner.id,
          slotType: SLOT_TYPES.REVIEW_LIKE,
          subject: review.subject,
          user,
        })
      );
    });

    const listCandidates = shuffle(data.lists.filter((list) => list.user_id !== user.id));
    listCandidates.slice(0, user.listLikeCount).forEach((list) => {
      const createdAt = weightedTimelineDate({ after: list.created_at, maxDaysAgo: 320 });
      data.listLikes.push({
        created_at: createdAt,
        list_id: list.id,
        user_id: user.id,
      });
      list.likes_count += 1;
      list.payload.likes.push(user.id);
      list.updated_at = createdAt > list.updated_at ? createdAt : list.updated_at;
      data.activities.push(
        createActivity({
          eventType: EVENT_TYPES.LIST_LIKED,
          occurredAt: createdAt,
          secondaryRef: list.user_id,
          slotType: SLOT_TYPES.LIST_LIKE,
          subject: listSubject(list),
          user,
        })
      );
    });
  });

  data.lists = data.lists.map(({ owner, previewItems, ...row }) => row);

  return { data, mediaLikesByUser };
}

async function runInChunks(label, rows, writer, size = BATCH_SIZE) {
  if (!rows.length) {
    return;
  }

  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const result = await writer(chunk);

    if (result?.error) {
      throw new Error(`${label} failed: ${result.error.message}`);
    }

    process.stdout.write(`\r${label}: ${Math.min(index + chunk.length, rows.length)}/${rows.length}`);
  }

  process.stdout.write('\n');
}

async function maybeDelete(admin, table, column, values) {
  const normalizedValues = [...new Set((values || []).filter(Boolean))];
  if (!normalizedValues.length) return;

  const result = await admin.from(table).delete().in(column, normalizedValues);

  if (result.error && result.error.code !== '42P01') {
    throw new Error(`Clearing ${table}.${column} failed: ${result.error.message}`);
  }
}

async function deleteAllRows(admin, table, column, { optional = false } = {}) {
  const result = await admin.from(table).delete().not(column, 'is', null);

  if (result.error) {
    const message = result.error.message || '';

    if (optional && (message.includes('does not exist') || message.includes('not found'))) {
      return;
    }

    throw new Error(`Clearing ${table} failed: ${message}`);
  }
}

async function listAllAuthUsers(admin) {
  const users = [];
  let page = 1;

  while (page < 100) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });

    if (result.error) {
      throw new Error(`Auth user lookup failed: ${result.error.message}`);
    }

    const batch = result.data?.users || [];
    users.push(...batch);

    if (batch.length < 1000) {
      break;
    }

    page += 1;
  }

  return users;
}

async function clearAllDevelopmentData(admin) {
  if (process.env.ALLOW_DEV_DATABASE_RESET !== '1') {
    throw new Error('Full development reset requires ALLOW_DEV_DATABASE_RESET=1.');
  }

  const authUsers = await listAllAuthUsers(admin);

  console.log(`Clearing all development app data and ${authUsers.length} auth user(s).`);
  await deleteAllRows(admin, 'notifications', 'user_id');
  await deleteAllRows(admin, 'notifications', 'actor_user_id');
  await deleteAllRows(admin, 'review_likes', 'user_id');
  await deleteAllRows(admin, 'list_likes', 'user_id');
  await deleteAllRows(admin, 'likes', 'user_id');
  await deleteAllRows(admin, 'watchlist', 'user_id');
  await deleteAllRows(admin, 'watched', 'user_id');
  await deleteAllRows(admin, 'media_reviews', 'user_id');
  await deleteAllRows(admin, 'list_reviews', 'user_id');
  await deleteAllRows(admin, 'activity', 'user_id');
  await deleteAllRows(admin, 'list_items', 'list_id');
  await deleteAllRows(admin, 'follows', 'follower_id');
  await deleteAllRows(admin, 'lists', 'id');
  await deleteAllRows(admin, 'usernames', 'user_id');
  await deleteAllRows(admin, 'profiles', 'id');

  for (const user of authUsers) {
    const result = await admin.auth.admin.deleteUser(user.id);

    if (result.error && result.error.status !== 404) {
      throw new Error(`Auth user delete failed for ${user.email || user.id}: ${result.error.message}`);
    }
  }
}

async function findSeedAuthUsers(admin) {
  const emails = new Set(SEED_USERS.map((user) => user.email));
  const users = [];
  let page = 1;

  while (page < 50) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) {
      throw new Error(`Auth seed user lookup failed: ${result.error.message}`);
    }

    const batch = result.data?.users || [];
    users.push(
      ...batch.filter(
        (user) =>
          emails.has(user.email || '') ||
          user.app_metadata?.seedDataset === DATASET_TAG ||
          user.user_metadata?.seedDataset === DATASET_TAG
      )
    );

    if (batch.length < 1000) break;
    page += 1;
  }

  return users;
}

async function findSeedProfileIds(admin) {
  const emails = SEED_USERS.map((user) => user.email);
  const usernames = SEED_USERS.map((user) => user.username);
  const ids = new Set();

  const byEmail = await admin.from('profiles').select('id').in('email', emails);
  if (byEmail.error) {
    throw new Error(`Seed profile lookup by email failed: ${byEmail.error.message}`);
  }
  (byEmail.data || []).forEach((row) => ids.add(row.id));

  const byUsername = await admin.from('profiles').select('id').in('username', usernames);
  if (byUsername.error) {
    throw new Error(`Seed profile lookup by username failed: ${byUsername.error.message}`);
  }
  (byUsername.data || []).forEach((row) => ids.add(row.id));

  return [...ids];
}

async function clearExistingSeedData(admin) {
  const authUsers = await findSeedAuthUsers(admin);
  const profileIds = await findSeedProfileIds(admin);
  const seedIds = [...new Set([...authUsers.map((user) => user.id), ...profileIds].filter(Boolean))];

  if (!seedIds.length) {
    console.log('No existing seed users found.');
    return;
  }

  const listResult = await admin.from('lists').select('id').in('user_id', seedIds);
  if (listResult.error) {
    throw new Error(`Seed list lookup failed: ${listResult.error.message}`);
  }
  const listIds = (listResult.data || []).map((row) => row.id).filter(Boolean);

  console.log(`Clearing ${seedIds.length} existing seed user(s) and ${listIds.length} list(s).`);
  await maybeDelete(admin, 'notifications', 'actor_user_id', seedIds);
  await maybeDelete(admin, 'notifications', 'user_id', seedIds);
  await maybeDelete(admin, 'review_likes', 'user_id', seedIds);
  await maybeDelete(admin, 'review_likes', 'review_user_id', seedIds);
  await maybeDelete(admin, 'list_likes', 'user_id', seedIds);
  await maybeDelete(admin, 'list_likes', 'list_id', listIds);
  await maybeDelete(admin, 'likes', 'user_id', seedIds);
  await maybeDelete(admin, 'watchlist', 'user_id', seedIds);
  await maybeDelete(admin, 'watched', 'user_id', seedIds);
  await maybeDelete(admin, 'media_reviews', 'user_id', seedIds);
  await maybeDelete(admin, 'list_reviews', 'user_id', seedIds);
  await maybeDelete(admin, 'list_reviews', 'list_id', listIds);
  await maybeDelete(admin, 'activity', 'user_id', seedIds);
  await maybeDelete(admin, 'list_items', 'user_id', seedIds);
  await maybeDelete(admin, 'list_items', 'list_id', listIds);
  await maybeDelete(admin, 'follows', 'follower_id', seedIds);
  await maybeDelete(admin, 'follows', 'following_id', seedIds);
  await maybeDelete(admin, 'lists', 'user_id', seedIds);
  await maybeDelete(admin, 'usernames', 'user_id', seedIds);
  await maybeDelete(admin, 'profiles', 'id', seedIds);

  for (const user of authUsers) {
    const result = await admin.auth.admin.deleteUser(user.id);
    if (result.error && result.error.status !== 404) {
      throw new Error(`Auth user delete failed for ${user.email}: ${result.error.message}`);
    }
  }
}

async function createSeedUsers(admin) {
  const now = new Date().toISOString();
  const createdUsers = [];

  for (const config of SEED_USERS) {
    const authResult = await admin.auth.admin.createUser({
      app_metadata: {
        seedDataset: DATASET_TAG,
      },
      email: config.email,
      email_confirm: true,
      password: SEED_USER_PASSWORD,
      user_metadata: {
        display_name: config.displayName,
        seedDataset: DATASET_TAG,
        username: config.username,
      },
    });

    if (authResult.error) {
      throw new Error(`Could not create ${config.email}: ${authResult.error.message}`);
    }

    const id = authResult.data.user.id;
    const user = {
      ...config,
      avatarUrl: null,
      id,
      isPrivate: false,
    };

    const profileResult = await admin.from('profiles').upsert(
      {
        avatar_url: null,
        banner_url: null,
        created_at: now,
        description: config.bio,
        display_name: config.displayName,
        display_name_lower: config.displayName.toLowerCase(),
        email: config.email,
        favorite_showcase: [],
        id,
        is_private: false,
        last_activity_at: now,
        updated_at: now,
        username: config.username,
        username_lower: config.username,
      },
      { onConflict: 'id' }
    );

    if (profileResult.error) {
      throw new Error(`Could not create profile for ${config.email}: ${profileResult.error.message}`);
    }

    const usernameResult = await admin.from('usernames').upsert(
      {
        created_at: now,
        updated_at: now,
        user_id: id,
        username: config.username,
        username_lower: config.username,
      },
      { onConflict: 'user_id' }
    );

    if (usernameResult.error) {
      throw new Error(`Could not map username for ${config.email}: ${usernameResult.error.message}`);
    }

    createdUsers.push(user);
  }

  return createdUsers;
}

async function insertDataset(admin, data) {
  await runInChunks('follows', data.follows, (rows) => admin.from('follows').insert(rows));
  await runInChunks('watchlist', data.watchlist, (rows) => admin.from('watchlist').insert(rows));
  await runInChunks('watched', data.watched, (rows) => admin.from('watched').insert(rows));
  await runInChunks('media likes', data.likes, (rows) => admin.from('likes').insert(rows));
  await runInChunks('media reviews', data.mediaReviews, (rows) => admin.from('media_reviews').insert(rows));
  await runInChunks('lists', data.lists, (rows) => admin.from('lists').insert(rows), 200);
  await runInChunks('list items', data.listItems, (rows) => admin.from('list_items').insert(rows), 300);
  await runInChunks('list comments', data.listReviews, (rows) => admin.from('list_reviews').insert(rows));
  await runInChunks('review likes', data.reviewLikes, (rows) => admin.from('review_likes').insert(rows));
  await runInChunks('list likes', data.listLikes, (rows) => admin.from('list_likes').insert(rows));
  await runInChunks('activities', data.activities, (rows) => admin.from('activity').insert(rows), 300);
}

async function updateFavoriteShowcases(admin, users, mediaLikesByUser) {
  for (const user of users) {
    const showcase = (mediaLikesByUser.get(user.id) || []).slice(0, 5).map((item, index) => ({
      ...createMediaPayload(item, user.id, {
        addedAt: new Date().toISOString(),
        position: index + 1,
      }),
      id: item.entityId,
    }));
    const lastActivityAt = new Date().toISOString();
    const result = await admin
      .from('profiles')
      .update({
        favorite_showcase: showcase,
        last_activity_at: lastActivityAt,
        updated_at: lastActivityAt,
      })
      .eq('id', user.id);

    if (result.error) {
      throw new Error(`Favorite showcase update failed for ${user.email}: ${result.error.message}`);
    }
  }
}

async function verifyCounts(admin, users) {
  const rows = [];

  for (const user of users) {
    const [watchlist, watched, mediaLikes, mediaReviews, lists, listReviews, reviewLikes, listLikes, activity] =
      await Promise.all([
        admin.from('watchlist').select('media_key', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('watched').select('media_key', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('likes').select('media_key', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('media_reviews').select('media_key', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('lists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('list_reviews').select('list_id', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('review_likes').select('media_key', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('list_likes').select('list_id', { count: 'exact', head: true }).eq('user_id', user.id),
        admin.from('activity').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

    const firstError = [
      watchlist,
      watched,
      mediaLikes,
      mediaReviews,
      lists,
      listReviews,
      reviewLikes,
      listLikes,
      activity,
    ].find((result) => result.error);
    if (firstError) {
      throw new Error(`Verification failed for ${user.username}: ${firstError.error.message}`);
    }

    rows.push({
      user: user.username,
      activity: activity.count,
      listComments: listReviews.count,
      listLikes: listLikes.count,
      lists: lists.count,
      mediaLikes: mediaLikes.count,
      reviewLikes: reviewLikes.count,
      reviews: mediaReviews.count,
      watched: watched.count,
      watchlist: watchlist.count,
    });
  }

  console.table(rows);
}

async function main() {
  const options = parseArgs();
  const admin = createAdminClient();
  const targetHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;

  console.log(`Target Supabase project: ${targetHost}`);
  console.log(`Dataset tag: ${DATASET_TAG}`);

  if (!options.execute) {
    console.log('Dry run only. Re-run with --yes to clear and recreate the development seed dataset.');
    return;
  }

  console.log('Loading TMDB media pool...');
  const pool = await loadTmdbPool({ skipTmdb: options.skipTmdb });
  if (pool.movies.length < 400 || pool.tv.length < 400) {
    throw new Error(`Media pool is too small. Got ${pool.movies.length} movies and ${pool.tv.length} TV shows.`);
  }

  if (options.resetAllDevData) {
    await clearAllDevelopmentData(admin);
  } else {
    await clearExistingSeedData(admin);
  }
  const users = await createSeedUsers(admin);
  console.log(`Created ${users.length} seed users.`);

  const { data, mediaLikesByUser } = buildDataset(users, pool);
  console.log(
    `Generated rows: watchlist=${data.watchlist.length}, watched=${data.watched.length}, mediaReviews=${data.mediaReviews.length}, lists=${data.lists.length}, listItems=${data.listItems.length}, activities=${data.activities.length}.`
  );

  await insertDataset(admin, data);
  await updateFavoriteShowcases(admin, users, mediaLikesByUser);
  await verifyCounts(admin, users);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
