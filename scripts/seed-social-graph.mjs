#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const scriptFilename = fileURLToPath(import.meta.url);
const scriptDirname = path.dirname(scriptFilename);
const REPO_ROOT = path.resolve(scriptDirname, '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'scripts', 'output');

const ACTIVITY_EVENT_TYPES = Object.freeze({
  WATCHLIST_ADDED: 'WATCHLIST_ADDED',
  REVIEW_LIKED: 'REVIEW_LIKED',
  RATING_LOGGED: 'RATING_LOGGED',
  REVIEW_PUBLISHED: 'REVIEW_PUBLISHED',
  LIST_CREATED: 'LIST_CREATED',
  LIST_COMMENTED: 'LIST_COMMENTED',
  WATCHED_ADDED: 'WATCHED_ADDED',
  LIKED_ADDED: 'LIKED_ADDED',
});

const ACTIVITY_SLOT_TYPES = Object.freeze({
  WATCHLIST_ENTRY: 'WATCHLIST_ENTRY',
  REVIEW_LIKE: 'REVIEW_LIKE',
  MEDIA_OPINION: 'MEDIA_OPINION',
  LIST_CREATED: 'LIST_CREATED',
  LIST_OPINION: 'LIST_OPINION',
  WATCHED_ENTRY: 'WATCHED_ENTRY',
  LIKED_ENTRY: 'LIKED_ENTRY',
});

const NOTIFICATION_EVENT_TYPES = Object.freeze({
  LIST_LIKED: 'LIST_LIKED',
});

const MOVIE_TITLE_PREFIXES = [
  'Neon',
  'Midnight',
  'Velvet',
  'Broken',
  'Electric',
  'Hidden',
  'Last',
  'Golden',
  'Feral',
  'Silent',
  'Burning',
  'Static',
];
const MOVIE_TITLE_SUFFIXES = [
  'Run',
  'Archive',
  'Circuit',
  'Signal',
  'Harbor',
  'Season',
  'Empire',
  'Memory',
  'Drive',
  'Ghost',
  'Street',
  'Horizon',
];
const LIST_TITLE_PREFIXES = [
  'Late Night',
  'Cold Weather',
  'Unreliable',
  'Weekend',
  'Hidden Gem',
  'Rainy Day',
  'Sleepless',
  'Loud Crowd',
  'Slow Burn',
  'After Hours',
  'Chaos Theory',
  'Sunday Panic',
];
const LIST_TITLE_SUFFIXES = [
  'Favorites',
  'Watchlist',
  'Marathon',
  'Queue',
  'Rotation',
  'Stack',
  'Collection',
  'Moodboard',
  'Drafts',
  'Detours',
  'Essentials',
  'Revisits',
];
const REVIEW_OPENERS = [
  'I did not expect this one to work, but it really does.',
  'This feels messy in the right ways.',
  'There is a weird confidence to the whole thing.',
  'The pacing should fall apart, yet it keeps moving.',
  'A lot of this is excessive, but never dull.',
  'This lands somewhere between chaos and precision.',
  'It is easier to admire than to fully love, and that is fine.',
  'The tone keeps shifting and somehow stays coherent.',
  'I bought into the mood long before the plot caught up.',
  'The whole thing plays better on instinct than on paper.',
];
const REVIEW_MIDDLES = [
  'The performances do most of the heavy lifting.',
  'Its best scenes feel improvised even when they clearly are not.',
  'The script leaves some obvious gaps, but the atmosphere covers a lot of them.',
  'The visual design keeps the energy high even when the story drifts.',
  'It has enough texture to survive the weaker stretches.',
  'Some choices are clumsy, though the movie stays surprisingly watchable.',
  'There is more restraint here than the setup suggests.',
  'The ending overreaches a little, but I respect the swing.',
  'It understands exactly when to be subtle and when to go loud.',
  'The central idea is simple, but the execution gives it weight.',
];
const REVIEW_CLOSERS = [
  'I would still recommend it.',
  'This is the kind of movie I can imagine revisiting.',
  'It works best when you let the mood take over.',
  'Not flawless, but definitely memorable.',
  'I can see why people bounce off it, but I had a good time.',
  'It earns more goodwill than it probably should.',
  'There is enough here to keep me on its side.',
  'The rough edges are part of the appeal.',
  'I liked it more the longer it went on.',
  'It is not tidy, but it sticks with you.',
];
const TMDB_GENRE_ID_TO_NAME = Object.freeze({
  12: 'Adventure',
  14: 'Fantasy',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  28: 'Action',
  35: 'Comedy',
  36: 'History',
  37: 'Western',
  53: 'Thriller',
  80: 'Crime',
  99: 'Documentary',
  878: 'Science Fiction',
  9648: 'Mystery',
  10402: 'Music',
  10749: 'Romance',
  10751: 'Family',
  10752: 'War',
  10770: 'TV Movie',
});
const SYNTHETIC_GENRE_IDS = Object.freeze(Object.keys(TMDB_GENRE_ID_TO_NAME).map((value) => Number(value)));

function loadEnvFile(filePath) {
  return readFile(filePath, 'utf8')
    .then((raw) => {
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
          return;
        }

        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

        if (!match) {
          return;
        }

        const [, key, valueRaw] = match;

        if (process.env[key]) {
          return;
        }

        let value = valueRaw.trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        process.env[key] = value;
      });
    })
    .catch(() => {});
}

function log(message) {
  console.log(`[seed:social] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function normalizeValue(value) {
  return String(value ?? '').trim();
}

function parseInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function parseBoolean(value, fallback = false) {
  const normalized = normalizeValue(value).toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
  return items[randomInt(0, items.length - 1)];
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = randomInt(0, index);
    const current = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = current;
  }

  return copy;
}

function sampleUnique(items, count, excluded = new Set()) {
  const selected = [];

  for (const item of shuffle(items)) {
    const key = item?.mediaKey || item?.id || item?.userId || JSON.stringify(item);

    if (excluded.has(key)) {
      continue;
    }

    excluded.add(key);
    selected.push(item);

    if (selected.length >= count) {
      break;
    }
  }

  return selected;
}

function randomRating() {
  return randomInt(1, 10) / 2;
}

function randomTimestampBetween(startMs, endMs) {
  const safeStart = Math.min(startMs, endMs);
  const safeEnd = Math.max(startMs, endMs);
  return new Date(randomInt(safeStart, safeEnd)).toISOString();
}

function slugify(value) {
  return normalizeValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function shortHash(value) {
  return createHash('sha1')
    .update(normalizeValue(value) || randomUUID())
    .digest('hex')
    .slice(0, 6);
}

function buildMediaKey(entityType, entityId) {
  return `${normalizeValue(entityType).toLowerCase()}_${normalizeValue(entityId)}`;
}

function buildActivitySubjectRef({ subjectId, subjectType }) {
  const normalizedSubjectType = normalizeValue(subjectType).toLowerCase();
  const normalizedSubjectId = normalizeValue(subjectId);

  if (!normalizedSubjectType || !normalizedSubjectId) {
    return '';
  }

  return `${normalizedSubjectType}:${normalizedSubjectId}`;
}

function buildCanonicalActivityDedupeKey({ actorUserId, slotType, primaryRef, secondaryRef = '-' }) {
  const normalizedActorUserId = normalizeValue(actorUserId);
  const normalizedSlotType = normalizeValue(slotType).toUpperCase();
  const normalizedPrimaryRef = normalizeValue(primaryRef);
  const normalizedSecondaryRef = normalizeValue(secondaryRef) || '-';

  if (!normalizedActorUserId || !normalizedSlotType || !normalizedPrimaryRef) {
    return '';
  }

  return `slot:${normalizedActorUserId}:${normalizedSlotType}:${normalizedPrimaryRef}:${normalizedSecondaryRef}`;
}

function createSyntheticMovie(index) {
  const prefix = MOVIE_TITLE_PREFIXES[index % MOVIE_TITLE_PREFIXES.length];
  const suffix = MOVIE_TITLE_SUFFIXES[(index * 7) % MOVIE_TITLE_SUFFIXES.length];
  const entityId = String(900000 + index);
  const genreIds = shuffle(SYNTHETIC_GENRE_IDS).slice(0, randomInt(1, 3));

  return {
    backdrop_path: null,
    entityId,
    entityType: 'movie',
    genreNames: genreIds.map((genreId) => TMDB_GENRE_ID_TO_NAME[genreId]).filter(Boolean),
    genre_ids: genreIds,
    genres: genreIds.map((genreId) => ({
      id: genreId,
      name: TMDB_GENRE_ID_TO_NAME[genreId],
    })),
    id: entityId,
    mediaKey: buildMediaKey('movie', entityId),
    popularity: randomInt(1, 100),
    poster_path: null,
    release_date: `${randomInt(1990, 2025)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
    runtime: randomInt(80, 160),
    title: `${prefix} ${suffix}`,
    vote_average: randomInt(50, 90) / 10,
    vote_count: randomInt(100, 5000),
  };
}

async function fetchTmdbMoviePool({ apiKey, targetCount }) {
  if (!apiKey) {
    return [];
  }

  const movies = new Map();
  const pages = shuffle(Array.from({ length: 250 }, (_, index) => index + 1));

  for (const page of pages) {
    if (movies.size >= targetCount) {
      break;
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/movie?language=en-US&page=${page}&sort_by=popularity.desc&with_runtime.gte=40`,
        {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const results = Array.isArray(payload?.results) ? payload.results : [];

      results.forEach((item) => {
        const entityId = normalizeValue(item?.id);

        if (!entityId) {
          return;
        }

        movies.set(entityId, {
          backdrop_path: item?.backdrop_path || null,
          entityId,
          entityType: 'movie',
          genreNames: Array.isArray(item?.genre_ids)
            ? item.genre_ids.map((genreId) => TMDB_GENRE_ID_TO_NAME[genreId]).filter(Boolean)
            : [],
          genre_ids: Array.isArray(item?.genre_ids)
            ? item.genre_ids.filter((genreId) => Number.isFinite(Number(genreId)))
            : [],
          genres: Array.isArray(item?.genre_ids)
            ? item.genre_ids
                .map((genreId) => ({
                  id: genreId,
                  name: TMDB_GENRE_ID_TO_NAME[genreId] || null,
                }))
                .filter((genre) => genre.name)
            : [],
          id: entityId,
          mediaKey: buildMediaKey('movie', entityId),
          popularity: Number(item?.popularity || 0) || null,
          poster_path: item?.poster_path || null,
          release_date: item?.release_date || null,
          runtime: null,
          title: item?.title || item?.original_title || `Movie ${entityId}`,
          vote_average: Number(item?.vote_average || 0) || null,
          vote_count: Number(item?.vote_count || 0) || null,
        });
      });
    } catch {
      break;
    }
  }

  return Array.from(movies.values());
}

function randomReviewText() {
  return `${randomChoice(REVIEW_OPENERS)} ${randomChoice(REVIEW_MIDDLES)} ${randomChoice(REVIEW_CLOSERS)}`;
}

function createMediaPayload(movie, userId, timestamp, overrides = {}) {
  const entityId = normalizeValue(movie?.entityId ?? movie?.id);
  const entityType = 'movie';

  return {
    addedAt: timestamp,
    backdrop_path: movie?.backdrop_path || null,
    entityId,
    entityType,
    first_air_date: null,
    genreNames: Array.isArray(movie?.genreNames) ? movie.genreNames : [],
    genre_ids: Array.isArray(movie?.genre_ids) ? movie.genre_ids : [],
    genres: Array.isArray(movie?.genres) ? movie.genres : [],
    mediaKey: buildMediaKey(entityType, entityId),
    media_type: entityType,
    name: '',
    original_name: null,
    original_title: movie?.title || null,
    poster_path: movie?.poster_path || null,
    popularity: movie?.popularity ?? null,
    position: overrides.position ?? null,
    providerIds: [],
    providerNames: [],
    providers: [],
    release_date: movie?.release_date || null,
    runtime: movie?.runtime ?? null,
    title: movie?.title || `Movie ${entityId}`,
    updatedAt: timestamp,
    userId,
    vote_average: movie?.vote_average ?? null,
    vote_count: movie?.vote_count ?? null,
    watchProviders: null,
  };
}

function createActorSnapshot(user) {
  return {
    avatarUrl: user.avatarUrl || null,
    displayName: user.displayName,
    id: user.id,
    username: user.username,
  };
}

function buildActivitySubject(payload = {}) {
  const subjectType = normalizeValue(payload.subjectType).toLowerCase();
  const subjectId = normalizeValue(payload.subjectId);
  const subjectTitle = normalizeValue(payload.subjectTitle) || 'Untitled';

  if (subjectType === 'list') {
    const ownerUsername = normalizeValue(payload.subjectOwnerUsername || payload.ownerUsername);
    const slug = normalizeValue(payload.subjectSlug || payload.listSlug || payload.listId || subjectId);

    return {
      href: ownerUsername && slug ? `/account/${ownerUsername}/lists/${slug}` : null,
      id: subjectId || normalizeValue(payload.listId),
      ownerId: normalizeValue(payload.subjectOwnerId || payload.listOwnerId) || null,
      ownerUsername: ownerUsername || null,
      poster: normalizeValue(payload.subjectPoster) || null,
      slug: slug || null,
      title: normalizeValue(payload.listTitle || subjectTitle) || 'Untitled List',
      type: 'list',
    };
  }

  return {
    href: subjectType && subjectId ? `/${subjectType}/${subjectId}` : null,
    id: subjectId || null,
    ownerId: null,
    ownerUsername: null,
    poster: normalizeValue(payload.subjectPoster) || null,
    slug: null,
    title: subjectTitle,
    type: subjectType || null,
  };
}

function createActivityRow({ actor, actorUserId, eventType, occurredAt, payload = {} }) {
  const subject = buildActivitySubject(payload);
  const subjectRef = buildActivitySubjectRef({
    subjectId: subject.id,
    subjectType: subject.type,
  });
  const basePayload = {
    actor,
    occurredAt,
    subject,
    version: 2,
    visibility: 'public',
  };
  let slotType = '';
  let primaryRef = subjectRef;
  let secondaryRef = '-';
  let renderKind = 'text';
  let details = {};
  let reviewCard = null;

  if (eventType === ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED) {
    slotType = ACTIVITY_SLOT_TYPES.WATCHLIST_ENTRY;
  } else if (eventType === ACTIVITY_EVENT_TYPES.LIKED_ADDED) {
    slotType = ACTIVITY_SLOT_TYPES.LIKED_ENTRY;
  } else if (eventType === ACTIVITY_EVENT_TYPES.WATCHED_ADDED) {
    slotType = ACTIVITY_SLOT_TYPES.WATCHED_ENTRY;
    details = {
      watchedAt: payload.watchedAt || occurredAt,
    };
  } else if (eventType === ACTIVITY_EVENT_TYPES.RATING_LOGGED) {
    slotType = ACTIVITY_SLOT_TYPES.MEDIA_OPINION;
    details = {
      rating: Number(payload.reviewRating ?? payload.rating ?? null),
    };
  } else if (eventType === ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED) {
    slotType = ACTIVITY_SLOT_TYPES.MEDIA_OPINION;
    renderKind = 'text_with_review';
  } else if (eventType === ACTIVITY_EVENT_TYPES.LIST_CREATED) {
    slotType = ACTIVITY_SLOT_TYPES.LIST_CREATED;
  } else if (eventType === ACTIVITY_EVENT_TYPES.LIST_COMMENTED) {
    slotType = ACTIVITY_SLOT_TYPES.LIST_OPINION;
    renderKind = 'text_with_review';
  } else if (eventType === ACTIVITY_EVENT_TYPES.REVIEW_LIKED) {
    slotType = ACTIVITY_SLOT_TYPES.REVIEW_LIKE;
    primaryRef = normalizeValue(payload.reviewKey);
    secondaryRef = normalizeValue(payload.reviewOwnerId);
    details = {
      reviewKey: normalizeValue(payload.reviewKey),
      reviewOwnerDisplayName: normalizeValue(payload.reviewOwnerDisplayName) || 'Someone',
      reviewOwnerId: normalizeValue(payload.reviewOwnerId),
      reviewOwnerUsername: normalizeValue(payload.reviewOwnerUsername) || null,
      reviewRating: payload.reviewRating ?? null,
    };
  }

  if (renderKind === 'text_with_review') {
    reviewCard = {
      authorId: actor.id,
      content: normalizeValue(payload.reviewContent || payload.content),
      createdAt: occurredAt,
      id: `${subject.type}:${subject.id}:${actor.id}:${occurredAt}`,
      isSpoiler: Boolean(payload.reviewIsSpoiler || payload.isSpoiler),
      likes: [],
      rating: payload.reviewRating ?? payload.rating ?? null,
      reviewUserId: actor.id,
      subjectHref: payload.subjectHref || subject.href,
      subjectId: subject.id,
      subjectKey: payload.subjectKey || subjectRef,
      subjectOwnerId: subject.ownerId || null,
      subjectOwnerUsername: subject.ownerUsername || null,
      subjectPoster: subject.poster || null,
      subjectPreviewItems: Array.isArray(payload.subjectPreviewItems) ? payload.subjectPreviewItems : [],
      subjectSlug: subject.slug || null,
      subjectTitle: subject.title,
      subjectType: subject.type,
      updatedAt: occurredAt,
      user: {
        avatarUrl: actor.avatarUrl || null,
        id: actor.id,
        name: actor.displayName,
        username: actor.username || null,
      },
    };
    details = {
      ...details,
      rating: payload.reviewRating ?? payload.rating ?? null,
    };
  }

  const dedupeKey =
    normalizeValue(payload.dedupeKey) ||
    buildCanonicalActivityDedupeKey({
      actorUserId,
      primaryRef,
      secondaryRef,
      slotType,
    }) ||
    `${eventType}:${subject.type || 'unknown'}:${subject.id || randomUUID()}`;

  return {
    created_at: occurredAt,
    dedupe_key: dedupeKey,
    event_type: eventType,
    payload: {
      ...basePayload,
      dedupeKey,
      details,
      eventType,
      primaryRef,
      renderKind,
      reviewCard,
      slotType,
    },
    updated_at: occurredAt,
    user_id: actorUserId,
  };
}

function createNotificationRow({ actor, actorUserId, eventType, occurredAt, payload = {} }) {
  if (eventType !== NOTIFICATION_EVENT_TYPES.LIST_LIKED) {
    return null;
  }

  const listOwnerId = normalizeValue(payload.listOwnerId);

  if (!listOwnerId || listOwnerId === actorUserId) {
    return null;
  }

  const subject = buildActivitySubject({
    ...payload,
    subjectId: payload.listId || payload.subjectId,
    subjectOwnerId: payload.subjectOwnerId || payload.listOwnerId,
    subjectOwnerUsername: payload.subjectOwnerUsername,
    subjectSlug: payload.subjectSlug || payload.listSlug,
    subjectTitle: payload.subjectTitle || payload.listTitle,
    subjectType: 'list',
  });

  return {
    actor_user_id: actorUserId,
    body: '',
    created_at: occurredAt,
    event_type: 'LIST_LIKE',
    href: subject.href || null,
    metadata: {
      actor,
      payload: {
        ...payload,
        subject,
      },
    },
    read: false,
    title: `${actor.displayName} sent an update`,
    updated_at: occurredAt,
    user_id: listOwnerId,
  };
}

async function insertInChunks(admin, table, rows, size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);

    if (!chunk.length) {
      continue;
    }

    const result = await admin.from(table).insert(chunk);

    if (result.error) {
      throw new Error(`${table} insert failed: ${result.error.message || 'unknown error'}`);
    }
  }
}

async function upsertInChunks(admin, table, rows, onConflict, size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);

    if (!chunk.length) {
      continue;
    }

    const result = await admin.from(table).upsert(chunk, { onConflict });

    if (result.error) {
      throw new Error(`${table} upsert failed: ${result.error.message || 'unknown error'}`);
    }
  }
}

async function listSeedUsers(admin, runId = '') {
  const users = [];
  let page = 1;

  while (true) {
    const result = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Auth users could not be listed');
    }

    const batch = Array.isArray(result.data?.users) ? result.data.users : [];

    if (!batch.length) {
      break;
    }

    batch.forEach((user) => {
      const metadata = user?.user_metadata || {};

      if (metadata?.seed_namespace !== 'tvizzie-social') {
        return;
      }

      if (runId && metadata?.seed_run_id !== runId) {
        return;
      }

      users.push(user);
    });

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return users;
}

async function purgeUserData(admin, userId) {
  const listIdsResult = await admin.from('lists').select('id').eq('user_id', userId);

  if (listIdsResult.error) {
    throw new Error(listIdsResult.error.message || 'Seed user list lookup failed');
  }

  const listIds = (listIdsResult.data || []).map((row) => normalizeValue(row?.id)).filter(Boolean);
  const operations = [
    () => admin.from('review_likes').delete().eq('user_id', userId),
    () => admin.from('review_likes').delete().eq('review_user_id', userId),
    () => admin.from('list_likes').delete().eq('user_id', userId),
    () => admin.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`),
    () => admin.from('watchlist').delete().eq('user_id', userId),
    () => admin.from('watched').delete().eq('user_id', userId),
    () => admin.from('likes').delete().eq('user_id', userId),
    () => admin.from('activity').delete().eq('user_id', userId),
    () => admin.from('notifications').delete().eq('user_id', userId),
    () => admin.from('list_items').delete().eq('user_id', userId),
    () => admin.from('list_reviews').delete().eq('user_id', userId),
    () => admin.from('media_reviews').delete().eq('user_id', userId),
    () => admin.from('lists').delete().eq('user_id', userId),
    () => admin.from('profile_counters').delete().eq('user_id', userId),
    () => admin.from('account_lifecycle').delete().eq('user_id', userId),
    () => admin.from('usernames').delete().eq('user_id', userId),
    () => admin.from('profiles').delete().eq('id', userId),
  ];

  if (listIds.length > 0) {
    operations.unshift(() => admin.from('list_likes').delete().in('list_id', listIds));
    operations.unshift(() => admin.from('list_reviews').delete().in('list_id', listIds));
    operations.unshift(() => admin.from('list_items').delete().in('list_id', listIds));
  }

  for (const execute of operations) {
    const result = await execute();

    if (result.error) {
      throw new Error(result.error.message || 'Seed user purge failed');
    }
  }
}

async function resetExistingSeedUsers(admin, runId) {
  const users = await listSeedUsers(admin, runId);

  if (!users.length) {
    return 0;
  }

  for (const user of users) {
    await purgeUserData(admin, user.id);

    const deleteResult = await admin.auth.admin.deleteUser(user.id, false);

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message || 'Seed auth user delete failed');
    }
  }

  return users.length;
}

async function ensureAccountLifecycle(admin, userId) {
  const rpcResult = await admin.rpc('ensure_account_lifecycle', {
    p_user_id: userId,
  });

  if (!rpcResult.error) {
    return;
  }

  const fallbackResult = await admin.from('account_lifecycle').upsert(
    {
      state: 'ACTIVE',
      state_reason: 'seed_bootstrap',
      user_id: userId,
    },
    { onConflict: 'user_id' }
  );

  if (fallbackResult.error) {
    throw new Error(fallbackResult.error.message || 'Account lifecycle could not be created');
  }
}

async function claimUsername(admin, user) {
  const rpcResult = await admin.rpc('claim_username', {
    p_avatar_url: user.avatarUrl || null,
    p_display_name: user.displayName,
    p_email: user.email,
    p_fail_if_profile_has_username: false,
    p_preserve_existing: false,
    p_user_id: user.id,
    p_username: user.username,
  });

  if (!rpcResult.error) {
    return;
  }

  const nowIso = new Date().toISOString();
  const profileResult = await admin.from('profiles').upsert(
    {
      avatar_url: user.avatarUrl || null,
      description: user.description,
      display_name: user.displayName,
      display_name_lower: user.displayName.toLowerCase(),
      email: user.email,
      favorite_showcase: [],
      id: user.id,
      is_private: false,
      updated_at: nowIso,
      username: user.username,
      username_lower: user.username.toLowerCase(),
    },
    { onConflict: 'id' }
  );

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile bootstrap failed');
  }

  const usernameResult = await admin.from('usernames').upsert(
    {
      created_at: nowIso,
      updated_at: nowIso,
      user_id: user.id,
      username: user.username,
      username_lower: user.username.toLowerCase(),
    },
    { onConflict: 'username_lower' }
  );

  if (usernameResult.error) {
    throw new Error(usernameResult.error.message || 'Username mapping bootstrap failed');
  }
}

function createSeedIdentity({ kind, index, runId }) {
  const seedHash = shortHash(runId);
  const paddedIndex = String(index).padStart(kind === 'primary' ? 2 : 3, '0');
  const username = kind === 'primary' ? `seed${seedHash}u${paddedIndex}` : `rv${seedHash}${paddedIndex}`;
  const email = `${username}+${runId}@seed.tvizzie.local`;
  const displayName = kind === 'primary' ? `Seed User ${paddedIndex}` : `Reviewer ${paddedIndex}`;

  return {
    avatarUrl: null,
    description:
      kind === 'primary'
        ? `Synthetic activity-heavy test user ${paddedIndex} for ${runId}.`
        : `Synthetic review-only helper account ${paddedIndex} for ${runId}.`,
    displayName,
    email,
    username,
  };
}

async function createSeedUser(admin, { kind, index, password, runId }) {
  const identity = createSeedIdentity({ kind, index, runId });
  const authResult = await admin.auth.admin.createUser({
    app_metadata: {
      seed_kind: kind,
      seed_namespace: 'tvizzie-social',
    },
    email: identity.email,
    email_confirm: true,
    password,
    user_metadata: {
      seed_kind: kind,
      seed_namespace: 'tvizzie-social',
      seed_run_id: runId,
    },
  });

  if (authResult.error) {
    throw new Error(authResult.error.message || 'Seed auth user could not be created');
  }

  const userId = authResult.data?.user?.id;

  if (!userId) {
    fail('Seed auth user id is missing');
  }

  const user = {
    ...identity,
    id: userId,
    kind,
  };

  await claimUsername(admin, user);
  await ensureAccountLifecycle(admin, user.id);

  return user;
}

function createListBlueprints({ itemsPerList, moviePool, user }) {
  const nowMs = Date.now();
  const ninetyDaysAgo = nowMs - 1000 * 60 * 60 * 24 * 90;
  const shuffledPool = shuffle(moviePool);
  const blueprints = [];

  for (let index = 0; index < 12; index += 1) {
    const title = `${randomChoice(LIST_TITLE_PREFIXES)} ${randomChoice(LIST_TITLE_SUFFIXES)} ${index + 1}`;
    const createdAt = randomTimestampBetween(ninetyDaysAgo, nowMs - 1000 * 60 * 60 * 24);
    const listMovies = sampleUnique(shuffledPool, itemsPerList, new Set()).map((movie, itemIndex) => ({
      addedAt: randomTimestampBetween(new Date(createdAt).getTime(), nowMs),
      movie,
      position: itemIndex + 1,
    }));
    const previewItems = listMovies
      .slice(0, 5)
      .map(({ movie, position, addedAt }) => createMediaPayload(movie, user.id, addedAt, { position }));

    blueprints.push({
      coverUrl: previewItems[0]?.poster_path || null,
      createdAt,
      description: `Auto-generated ${title.toLowerCase()} list for high-volume social testing.`,
      items: listMovies,
      payload: {
        coverUrl: previewItems[0]?.poster_path || null,
        description: `Auto-generated ${title.toLowerCase()} list for high-volume social testing.`,
        itemsCount: itemsPerList,
        likes: [],
        ownerSnapshot: {
          avatarUrl: user.avatarUrl || null,
          displayName: user.displayName,
          id: user.id,
          username: user.username,
        },
        previewItems,
        reviewsCount: 0,
        slug: `${slugify(title)}-${shortHash(`${user.username}-${index}`)}`,
        title,
      },
      title,
    });
  }

  return blueprints;
}

async function createLists(admin, user, blueprints, activityRows, activityClock) {
  const lists = [];

  for (const blueprint of blueprints) {
    const insertResult = await admin
      .from('lists')
      .insert({
        created_at: blueprint.createdAt,
        description: blueprint.description,
        likes_count: 0,
        payload: blueprint.payload,
        poster_path: blueprint.coverUrl,
        reviews_count: 0,
        slug: blueprint.payload.slug,
        title: blueprint.title,
        updated_at: blueprint.createdAt,
        user_id: user.id,
      })
      .select('id,slug,title,payload,poster_path,created_at')
      .single();

    if (insertResult.error) {
      throw new Error(insertResult.error.message || 'List could not be created');
    }

    const list = {
      coverUrl: blueprint.coverUrl,
      createdAt: blueprint.createdAt,
      id: insertResult.data.id,
      ownerId: user.id,
      ownerSnapshot: blueprint.payload.ownerSnapshot,
      poster_path: insertResult.data.poster_path || blueprint.coverUrl,
      previewItems: blueprint.payload.previewItems,
      slug: insertResult.data.slug,
      title: insertResult.data.title,
    };

    const itemRows = blueprint.items.map(({ addedAt, movie, position }) => {
      const payload = createMediaPayload(movie, user.id, addedAt, { position });

      activityClock.set(user.id, Math.max(activityClock.get(user.id) || 0, new Date(addedAt).getTime()));

      return {
        added_at: addedAt,
        backdrop_path: payload.backdrop_path,
        entity_id: payload.entityId,
        entity_type: payload.entityType,
        list_id: list.id,
        media_key: payload.mediaKey,
        payload,
        position,
        poster_path: payload.poster_path,
        title: payload.title,
        updated_at: addedAt,
        user_id: user.id,
      };
    });

    await insertInChunks(admin, 'list_items', itemRows, 500);

    activityRows.push(
      createActivityRow({
        actor: createActorSnapshot(user),
        actorUserId: user.id,
        eventType: ACTIVITY_EVENT_TYPES.LIST_CREATED,
        occurredAt: blueprint.createdAt,
        payload: {
          dedupeKey: buildCanonicalActivityDedupeKey({
            actorUserId: user.id,
            primaryRef: buildActivitySubjectRef({
              subjectId: list.id,
              subjectType: 'list',
            }),
            slotType: ACTIVITY_SLOT_TYPES.LIST_CREATED,
          }),
          listId: list.id,
          listSlug: list.slug,
          listTitle: list.title,
          subjectOwnerId: user.id,
          ownerUsername: user.username,
          subjectId: list.id,
          subjectPoster: list.coverUrl || null,
          subjectTitle: list.title,
          subjectType: 'list',
        },
      })
    );
    activityClock.set(user.id, Math.max(activityClock.get(user.id) || 0, new Date(blueprint.createdAt).getTime()));
    lists.push(list);
  }

  return lists;
}

function createPrimaryUserActions({ moviePool, user, config }) {
  const nowMs = Date.now();
  const startMs = nowMs - 1000 * 60 * 60 * 24 * 120;
  const userPool = sampleUnique(
    moviePool,
    Math.max(config.likesPerUser, config.watchlistPerUser, config.watchedPerUser, config.reviewsPerUser) * 4
  );
  const likes = sampleUnique(userPool, config.likesPerUser, new Set());
  const watchlist = sampleUnique(userPool, config.watchlistPerUser, new Set());
  const watched = sampleUnique(userPool, config.watchedPerUser, new Set());
  const reviewBase = shuffle([...watched, ...userPool]);
  const reviews = sampleUnique(reviewBase, config.reviewsPerUser, new Set());

  return {
    favorites: likes.slice(0, config.favoritesPerUser),
    likes: likes.map((movie) => ({
      movie,
      timestamp: randomTimestampBetween(startMs, nowMs),
    })),
    reviews: reviews.map((movie) => ({
      content: randomReviewText(),
      movie,
      rating: randomRating(),
      timestamp: randomTimestampBetween(startMs, nowMs),
    })),
    watched: watched.map((movie) => ({
      movie,
      timestamp: randomTimestampBetween(startMs, nowMs),
    })),
    watchlist: watchlist.map((movie) => ({
      movie,
      timestamp: randomTimestampBetween(startMs, nowMs),
    })),
    user,
  };
}

function createMediaCollectionRows({ actionName, entries, user, activityRows, activityClock }) {
  const rows = [];

  entries.forEach(({ movie, timestamp }) => {
    const payload = createMediaPayload(movie, user.id, timestamp);

    if (actionName === 'watched') {
      rows.push({
        backdrop_path: payload.backdrop_path,
        created_at: timestamp,
        entity_id: payload.entityId,
        entity_type: payload.entityType,
        last_watched_at: timestamp,
        media_key: payload.mediaKey,
        payload: {
          ...payload,
          firstWatchedAt: timestamp,
          lastWatchedAt: timestamp,
          sourceLastAction: 'watched',
          watchCount: 1,
        },
        poster_path: payload.poster_path,
        title: payload.title,
        updated_at: timestamp,
        user_id: user.id,
        watch_count: 1,
      });

      activityRows.push(
        createActivityRow({
          actor: createActorSnapshot(user),
          actorUserId: user.id,
          eventType: ACTIVITY_EVENT_TYPES.WATCHED_ADDED,
          occurredAt: timestamp,
          payload: {
            dedupeKey: buildCanonicalActivityDedupeKey({
              actorUserId: user.id,
              primaryRef: buildActivitySubjectRef({
                subjectId: payload.entityId,
                subjectType: payload.entityType,
              }),
              slotType: ACTIVITY_SLOT_TYPES.WATCHED_ENTRY,
            }),
            subjectId: payload.entityId,
            subjectPoster: payload.poster_path || null,
            subjectTitle: payload.title,
            subjectType: payload.entityType,
            watchedAt: timestamp,
          },
        })
      );
    } else {
      rows.push({
        added_at: timestamp,
        backdrop_path: payload.backdrop_path,
        entity_id: payload.entityId,
        entity_type: payload.entityType,
        media_key: payload.mediaKey,
        payload,
        poster_path: payload.poster_path,
        title: payload.title,
        updated_at: timestamp,
        user_id: user.id,
      });

      if (actionName === 'likes') {
        activityRows.push(
          createActivityRow({
            actor: createActorSnapshot(user),
            actorUserId: user.id,
            eventType: ACTIVITY_EVENT_TYPES.LIKED_ADDED,
            occurredAt: timestamp,
            payload: {
              dedupeKey: buildCanonicalActivityDedupeKey({
                actorUserId: user.id,
                primaryRef: buildActivitySubjectRef({
                  subjectId: payload.entityId,
                  subjectType: payload.entityType,
                }),
                slotType: ACTIVITY_SLOT_TYPES.LIKED_ENTRY,
              }),
              subjectId: payload.entityId,
              subjectPoster: payload.poster_path || null,
              subjectTitle: payload.title,
              subjectType: payload.entityType,
            },
          })
        );
      }

      if (actionName === 'watchlist') {
        activityRows.push(
          createActivityRow({
            actor: createActorSnapshot(user),
            actorUserId: user.id,
            eventType: ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED,
            occurredAt: timestamp,
            payload: {
              dedupeKey: buildCanonicalActivityDedupeKey({
                actorUserId: user.id,
                primaryRef: buildActivitySubjectRef({
                  subjectId: payload.entityId,
                  subjectType: payload.entityType,
                }),
                slotType: ACTIVITY_SLOT_TYPES.WATCHLIST_ENTRY,
              }),
              subjectId: payload.entityId,
              subjectPoster: payload.poster_path || null,
              subjectTitle: payload.title,
              subjectType: payload.entityType,
            },
          })
        );
      }
    }

    activityClock.set(user.id, Math.max(activityClock.get(user.id) || 0, new Date(timestamp).getTime()));
  });

  return rows;
}

function createMediaReviewRows({ entries, user, activityRows, activityClock }) {
  return entries.map(({ content, movie, rating, timestamp }) => {
    const payload = createMediaPayload(movie, user.id, timestamp);

    activityRows.push(
      createActivityRow({
        actor: createActorSnapshot(user),
        actorUserId: user.id,
        eventType: ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED,
        occurredAt: timestamp,
        payload: {
          dedupeKey: buildCanonicalActivityDedupeKey({
            actorUserId: user.id,
            primaryRef: buildActivitySubjectRef({
              subjectId: payload.entityId,
              subjectType: payload.entityType,
            }),
            slotType: ACTIVITY_SLOT_TYPES.MEDIA_OPINION,
          }),
          content,
          reviewContent: content,
          reviewIsSpoiler: false,
          reviewRating: rating,
          subjectHref: `/movie/${payload.entityId}`,
          subjectId: payload.entityId,
          subjectKey: payload.mediaKey,
          subjectPoster: payload.poster_path || null,
          subjectTitle: payload.title,
          subjectType: payload.entityType,
        },
      })
    );
    activityClock.set(user.id, Math.max(activityClock.get(user.id) || 0, new Date(timestamp).getTime()));

    return {
      content,
      created_at: timestamp,
      is_spoiler: false,
      media_key: payload.mediaKey,
      payload: {
        authorId: user.id,
        content,
        isSpoiler: false,
        rating,
        subjectHref: `/movie/${payload.entityId}`,
        subjectId: payload.entityId,
        subjectKey: payload.mediaKey,
        subjectPoster: payload.poster_path || null,
        subjectTitle: payload.title,
        subjectType: payload.entityType,
        updatedAt: timestamp,
        user: {
          avatarUrl: user.avatarUrl || null,
          email: user.email,
          id: user.id,
          name: user.displayName,
          username: user.username,
        },
      },
      rating,
      updated_at: timestamp,
      user_id: user.id,
    };
  });
}

function buildFavoriteShowcase(user, favorites) {
  return favorites.map((movie, index) => {
    const payload = createMediaPayload(movie, user.id, new Date().toISOString(), {
      position: index + 1,
    });

    return {
      addedAt: payload.addedAt,
      backdrop_path: payload.backdrop_path,
      entityId: payload.entityId,
      entityType: payload.entityType,
      first_air_date: null,
      mediaKey: payload.mediaKey,
      media_type: payload.entityType,
      name: '',
      original_name: null,
      original_title: payload.original_title,
      poster_path: payload.poster_path,
      position: index + 1,
      release_date: payload.release_date,
      title: payload.title,
      updatedAt: payload.updatedAt,
      vote_average: payload.vote_average,
    };
  });
}

function createListInteractionRows({
  auxiliaryReviewers,
  config,
  lists,
  primaryUsers,
  activityRows,
  activityClock,
  notificationRows,
}) {
  const listLikes = [];
  const listReviews = [];
  const allReviewers = [...primaryUsers, ...auxiliaryReviewers];
  const nowMs = Date.now();
  const startMs = nowMs - 1000 * 60 * 60 * 24 * 90;

  lists.forEach((list) => {
    primaryUsers.forEach((user) => {
      if (user.id === list.ownerId) {
        return;
      }

      const timestamp = randomTimestampBetween(new Date(list.createdAt).getTime(), nowMs);

      listLikes.push({
        created_at: timestamp,
        list_id: list.id,
        user_id: user.id,
      });

      notificationRows.push(
        createNotificationRow({
          actor: createActorSnapshot(user),
          actorUserId: user.id,
          eventType: NOTIFICATION_EVENT_TYPES.LIST_LIKED,
          occurredAt: timestamp,
          payload: {
            listId: list.id,
            listOwnerId: list.ownerId,
            listSlug: list.slug,
            listTitle: list.title,
            subjectId: list.id,
            subjectOwnerId: list.ownerId,
            subjectOwnerUsername: list.ownerSnapshot.username || list.ownerId,
            subjectSlug: list.slug,
            subjectTitle: list.title,
            subjectType: 'list',
          },
        })
      );
      activityClock.set(user.id, Math.max(activityClock.get(user.id) || 0, new Date(timestamp).getTime()));
    });

    const reviewers = allReviewers.filter((user) => user.id !== list.ownerId).slice(0, config.listReviewsPerList);

    reviewers.forEach((user) => {
      const timestamp = randomTimestampBetween(Math.max(startMs, new Date(list.createdAt).getTime()), nowMs);
      const rating = randomRating();
      const content = randomReviewText();

      listReviews.push({
        content,
        created_at: timestamp,
        is_spoiler: false,
        list_id: list.id,
        payload: {
          authorId: user.id,
          content,
          isSpoiler: false,
          rating,
          subjectHref: `/account/${list.ownerSnapshot.username}/lists/${list.slug}`,
          subjectId: list.id,
          subjectKey: `list:${list.ownerId}:${list.id}`,
          subjectOwnerId: list.ownerId,
          subjectOwnerUsername: list.ownerSnapshot.username || list.ownerId,
          subjectPreviewItems: list.previewItems,
          subjectPoster: list.coverUrl || list.previewItems[0]?.poster_path || null,
          subjectSlug: list.slug,
          subjectTitle: list.title,
          subjectType: 'list',
          updatedAt: timestamp,
          user: {
            avatarUrl: user.avatarUrl || null,
            email: user.email,
            id: user.id,
            name: user.displayName,
            username: user.username,
          },
        },
        rating,
        updated_at: timestamp,
        user_id: user.id,
      });

      activityRows.push(
        createActivityRow({
          actor: createActorSnapshot(user),
          actorUserId: user.id,
          eventType: ACTIVITY_EVENT_TYPES.LIST_COMMENTED,
          occurredAt: timestamp,
          payload: {
            dedupeKey: buildCanonicalActivityDedupeKey({
              actorUserId: user.id,
              primaryRef: buildActivitySubjectRef({
                subjectId: list.id,
                subjectType: 'list',
              }),
              slotType: ACTIVITY_SLOT_TYPES.LIST_OPINION,
            }),
            content,
            reviewContent: content,
            reviewIsSpoiler: false,
            reviewRating: rating,
            subjectHref: `/account/${list.ownerSnapshot.username}/lists/${list.slug}`,
            subjectId: list.id,
            subjectKey: `list:${list.ownerId}:${list.id}`,
            subjectOwnerId: list.ownerId,
            subjectOwnerUsername: list.ownerSnapshot.username || list.ownerId,
            subjectPreviewItems: list.previewItems,
            subjectPoster: list.coverUrl || list.previewItems[0]?.poster_path || null,
            subjectSlug: list.slug,
            subjectTitle: list.title,
            subjectType: 'list',
          },
        })
      );
      activityClock.set(user.id, Math.max(activityClock.get(user.id) || 0, new Date(timestamp).getTime()));
    });
  });

  return { listLikes, listReviews };
}

async function main() {
  await loadEnvFile(path.join(REPO_ROOT, '.env'));

  const config = {
    favoritesPerUser: parseInteger(process.env.SEED_FAVORITES_PER_USER, 5),
    likesPerUser: parseInteger(process.env.SEED_LIKES_PER_USER, 400),
    listItemsPerList: parseInteger(process.env.SEED_LIST_ITEMS_PER_LIST, 400),
    listReviewsPerList: parseInteger(process.env.SEED_LIST_REVIEWS_PER_LIST, 400),
    listsPerUser: parseInteger(process.env.SEED_LISTS_PER_USER, 12),
    resetAll: parseBoolean(process.env.SEED_RESET_ALL, false),
    resetOnly: parseBoolean(process.env.SEED_RESET_ONLY, false),
    reviewsPerUser: parseInteger(process.env.SEED_REVIEWS_PER_USER, 400),
    runId:
      normalizeValue(process.env.SEED_RUN_ID) ||
      `social-${new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, '')
        .slice(0, 14)}`,
    userCount: parseInteger(process.env.SEED_USER_COUNT, 5),
    userPassword: normalizeValue(process.env.SEED_USER_PASSWORD) || 'TvizzieSeed!2026',
    watchedPerUser: parseInteger(process.env.SEED_WATCHED_PER_USER, 400),
    watchlistPerUser: parseInteger(process.env.SEED_WATCHLIST_PER_USER, 400),
  };

  if (config.userCount !== 5) {
    log(`SEED_USER_COUNT=${config.userCount}. Requested spec is 5; continuing with configured value.`);
  }

  if (config.listsPerUser !== 12) {
    log(`SEED_LISTS_PER_USER=${config.listsPerUser}. Requested spec is 12; continuing with configured value.`);
  }

  const supabaseUrl = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (config.resetAll) {
    log(`resetting existing seed users for run ${config.runId}`);
    const removed = await resetExistingSeedUsers(admin, config.runId);
    log(`removed ${removed} existing seed users`);

    if (config.resetOnly) {
      log('reset-only mode completed');
      return;
    }
  }

  const requiredAuxiliaryReviewers = Math.max(0, config.listReviewsPerList - (config.userCount - 1));
  const tmdbPool = await fetchTmdbMoviePool({
    apiKey: normalizeValue(process.env.TMDB_API_KEY),
    targetCount: 2500,
  });
  const moviePool =
    tmdbPool.length >= 800 ? tmdbPool : Array.from({ length: 4000 }, (_, index) => createSyntheticMovie(index + 1));

  log(`using ${moviePool.length} movie records from ${tmdbPool.length >= 800 ? 'TMDB' : 'synthetic fallback'} pool`);

  const primaryUsers = [];
  const auxiliaryReviewers = [];
  const activityRows = [];
  const notificationRows = [];
  const activityClock = new Map();

  log(`creating ${config.userCount} primary users`);

  for (let index = 1; index <= config.userCount; index += 1) {
    primaryUsers.push(
      await createSeedUser(admin, {
        index,
        kind: 'primary',
        password: config.userPassword,
        runId: config.runId,
      })
    );
  }

  if (requiredAuxiliaryReviewers > 0) {
    log(
      `creating ${requiredAuxiliaryReviewers} review-only helper users to satisfy ${config.listReviewsPerList} reviews/list`
    );

    for (let index = 1; index <= requiredAuxiliaryReviewers; index += 1) {
      auxiliaryReviewers.push(
        await createSeedUser(admin, {
          index,
          kind: 'reviewer',
          password: config.userPassword,
          runId: config.runId,
        })
      );
    }
  }

  const allLists = [];
  const likesRows = [];
  const watchlistRows = [];
  const watchedRows = [];
  const mediaReviewRows = [];

  for (const user of primaryUsers) {
    log(`creating collections for ${user.username}`);

    const listBlueprints = createListBlueprints({
      itemsPerList: config.listItemsPerList,
      moviePool,
      user,
    }).slice(0, config.listsPerUser);
    const lists = await createLists(admin, user, listBlueprints, activityRows, activityClock);
    allLists.push(...lists);

    const actions = createPrimaryUserActions({
      config,
      moviePool,
      user,
    });

    likesRows.push(
      ...createMediaCollectionRows({ actionName: 'likes', entries: actions.likes, user, activityRows, activityClock })
    );
    watchlistRows.push(
      ...createMediaCollectionRows({
        actionName: 'watchlist',
        entries: actions.watchlist,
        user,
        activityRows,
        activityClock,
      })
    );
    watchedRows.push(
      ...createMediaCollectionRows({
        actionName: 'watched',
        entries: actions.watched,
        user,
        activityRows,
        activityClock,
      })
    );
    mediaReviewRows.push(...createMediaReviewRows({ entries: actions.reviews, user, activityRows, activityClock }));

    const favoriteShowcase = buildFavoriteShowcase(user, actions.favorites);
    const profileUpdateResult = await admin
      .from('profiles')
      .update({
        description: user.description,
        display_name: user.displayName,
        display_name_lower: user.displayName.toLowerCase(),
        favorite_showcase: favoriteShowcase,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileUpdateResult.error) {
      throw new Error(profileUpdateResult.error.message || 'Profile favorites could not be updated');
    }
  }

  log('writing likes, watchlist, watched, and media reviews');
  await insertInChunks(admin, 'likes', likesRows, 500);
  await insertInChunks(admin, 'watchlist', watchlistRows, 500);
  await insertInChunks(admin, 'watched', watchedRows, 500);
  await upsertInChunks(admin, 'media_reviews', mediaReviewRows, 'media_key,user_id', 500);

  log('creating cross-user list interactions');
  const { listLikes, listReviews } = createListInteractionRows({
    activityClock,
    activityRows,
    auxiliaryReviewers,
    config,
    lists: allLists,
    notificationRows,
    primaryUsers,
  });

  await insertInChunks(admin, 'list_likes', listLikes, 500);
  await upsertInChunks(admin, 'list_reviews', listReviews, 'list_id,user_id', 500);

  log('updating list counters');
  for (const list of allLists) {
    const likeCount = listLikes.filter((row) => row.list_id === list.id).length;
    const reviewCount = listReviews.filter((row) => row.list_id === list.id).length;
    const updateResult = await admin
      .from('lists')
      .update({
        likes_count: likeCount,
        reviews_count: reviewCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', list.id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message || 'List counters could not be updated');
    }
  }

  log('writing activity and notifications');
  await insertInChunks(admin, 'activity', activityRows, 500);
  await insertInChunks(admin, 'notifications', notificationRows.filter(Boolean), 500);

  log('updating profile counters');
  for (const user of primaryUsers) {
    const lastActivityAt = activityClock.get(user.id)
      ? new Date(activityClock.get(user.id)).toISOString()
      : new Date().toISOString();
    const counters = {
      follower_count: 0,
      following_count: 0,
      likes_count: config.likesPerUser,
      lists_count: config.listsPerUser,
      user_id: user.id,
      watched_count: config.watchedPerUser,
      watchlist_count: config.watchlistPerUser,
    };
    const counterResult = await admin.from('profile_counters').upsert(counters, { onConflict: 'user_id' });

    if (counterResult.error) {
      throw new Error(counterResult.error.message || 'Profile counters could not be updated');
    }

    const profileResult = await admin
      .from('profiles')
      .update({
        last_activity_at: lastActivityAt,
        updated_at: lastActivityAt,
      })
      .eq('id', user.id);

    if (profileResult.error) {
      throw new Error(profileResult.error.message || 'Profile last_activity_at could not be updated');
    }
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const summary = {
    auxiliaryReviewerCount: auxiliaryReviewers.length,
    counts: {
      activity: activityRows.length,
      likes: likesRows.length,
      listLikes: listLikes.length,
      listReviews: listReviews.length,
      lists: allLists.length,
      mediaReviews: mediaReviewRows.length,
      notifications: notificationRows.filter(Boolean).length,
      watched: watchedRows.length,
      watchlist: watchlistRows.length,
    },
    generatedAt: new Date().toISOString(),
    listReviewsPerList: config.listReviewsPerList,
    moviePoolSource: tmdbPool.length >= 800 ? 'tmdb' : 'synthetic',
    primaryUserCount: primaryUsers.length,
    runId: config.runId,
    users: primaryUsers.map((user) => ({
      email: user.email,
      id: user.id,
      password: config.userPassword,
      username: user.username,
    })),
  };

  const outputPath = path.join(OUTPUT_DIR, `seed-social-${config.runId}.json`);
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  log(`complete: ${summary.primaryUserCount} primary users, ${summary.auxiliaryReviewerCount} helper reviewers`);
  log(`summary written to ${path.relative(REPO_ROOT, outputPath)}`);
}

main().catch((error) => {
  console.error(`[seed:social] failed: ${error.message || error}`);
  process.exitCode = 1;
});
