#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

const DEFAULTS = Object.freeze({
  userCount: 20,
  likesPerUser: 60,
  listCountPerUser: 10,
  listItemsPerList: 60,
  reviewsPerUser: 60,
  watchedPerUser: 60,
  watchlistPerUser: 60,
});

const WORD_BANK = Object.freeze({
  adjectives: [
    'amber',
    'ancient',
    'atomic',
    'autumn',
    'bold',
    'bright',
    'bronze',
    'celestial',
    'chill',
    'crimson',
    'crystal',
    'digital',
    'ember',
    'emerald',
    'frost',
    'golden',
    'hidden',
    'indigo',
    'iron',
    'lunar',
    'midnight',
    'misty',
    'neon',
    'nova',
    'obsidian',
    'opal',
    'primal',
    'rapid',
    'solar',
    'stellar',
    'sunset',
    'velvet',
    'vivid',
    'wild',
  ],
  nouns: [
    'arrow',
    'atlas',
    'aurora',
    'beacon',
    'blaze',
    'cipher',
    'comet',
    'drift',
    'echo',
    'falcon',
    'field',
    'flux',
    'forge',
    'glider',
    'harbor',
    'horizon',
    'junction',
    'kernel',
    'legend',
    'matrix',
    'meadow',
    'mirage',
    'orbit',
    'pulse',
    'quartz',
    'ranger',
    'signal',
    'summit',
    'temple',
    'thunder',
    'vertex',
    'voyage',
    'wave',
    'zenith',
  ],
  reviewOpeners: [
    'Opening sequence carried strong momentum and set the tone immediately.',
    'Performance quality stayed consistent and emotionally grounded throughout.',
    'Pacing felt tighter than expected and avoided dead air in key acts.',
    'Visual design stayed coherent and supported the story instead of distracting.',
    'Character decisions mostly felt earned with a clear internal logic.',
    'Sound design created tension effectively, especially in transitional scenes.',
    'Editing rhythm gave the narrative a confident forward movement.',
    'Dialogue quality was cleaner than average with memorable exchanges.',
  ],
  reviewClosers: [
    'Final act lands well and leaves enough detail to discuss after credits.',
    'Not flawless, but technically solid and easy to recommend.',
    'A few rough edges exist, yet the overall craft level is high.',
    'Good rewatch value due to consistent scene construction.',
    'Worth seeing for execution quality alone.',
    'Core idea is delivered with clarity and discipline.',
    'Strong balance between style and narrative intent.',
    'Would keep this on a yearly rewatch shortlist.',
  ],
  bioFragments: [
    'movie collector',
    'night cinema walker',
    'list curator',
    'slow-burn fan',
    'sci-fi regular',
    'thriller enjoyer',
    'weekend reviewer',
    'dialogue hunter',
    'soundtrack listener',
    'plot-hole inspector',
    'film notebook owner',
    'poster wall builder',
  ],
});

const GENRE_CATALOG = Object.freeze([
  Object.freeze({ id: 28, name: 'Action' }),
  Object.freeze({ id: 12, name: 'Adventure' }),
  Object.freeze({ id: 16, name: 'Animation' }),
  Object.freeze({ id: 35, name: 'Comedy' }),
  Object.freeze({ id: 80, name: 'Crime' }),
  Object.freeze({ id: 99, name: 'Documentary' }),
  Object.freeze({ id: 18, name: 'Drama' }),
  Object.freeze({ id: 10751, name: 'Family' }),
  Object.freeze({ id: 14, name: 'Fantasy' }),
  Object.freeze({ id: 36, name: 'History' }),
  Object.freeze({ id: 27, name: 'Horror' }),
  Object.freeze({ id: 10402, name: 'Music' }),
  Object.freeze({ id: 9648, name: 'Mystery' }),
  Object.freeze({ id: 10749, name: 'Romance' }),
  Object.freeze({ id: 878, name: 'Science Fiction' }),
  Object.freeze({ id: 53, name: 'Thriller' }),
  Object.freeze({ id: 10770, name: 'TV Movie' }),
  Object.freeze({ id: 10752, name: 'War' }),
  Object.freeze({ id: 37, name: 'Western' }),
]);

const GENRE_MAP = Object.freeze(
  GENRE_CATALOG.reduce((accumulator, item) => {
    accumulator[item.id] = item.name;
    return accumulator;
  }, {})
);

const PROVIDER_CATALOG = Object.freeze([
  Object.freeze({ id: 8, name: 'Netflix' }),
  Object.freeze({ id: 9, name: 'Amazon Prime Video' }),
  Object.freeze({ id: 337, name: 'Disney Plus' }),
  Object.freeze({ id: 350, name: 'Apple TV Plus' }),
  Object.freeze({ id: 531, name: 'Paramount Plus' }),
  Object.freeze({ id: 384, name: 'HBO Max' }),
  Object.freeze({ id: 15, name: 'Hulu' }),
  Object.freeze({ id: 386, name: 'Peacock' }),
  Object.freeze({ id: 1899, name: 'MUBI' }),
  Object.freeze({ id: 283, name: 'Crunchyroll' }),
]);

const ACTIVITY_EVENT_TYPES = Object.freeze({
  LIST_CREATED: 'LIST_CREATED',
  LIST_LIKED: 'LIST_LIKED',
  REVIEW_PUBLISHED: 'REVIEW_PUBLISHED',
  WATCHED_MARKED: 'WATCHED_MARKED',
  WATCHLIST_ADDED: 'WATCHLIST_ADDED',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function randomInt(min, max) {
  return crypto.randomInt(min, max + 1);
}

function randomPick(list = []) {
  return list[randomInt(0, Math.max(list.length - 1, 0))];
}

function shuffle(items = []) {
  const arr = [...items];

  for (let index = arr.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    const tmp = arr[index];
    arr[index] = arr[swapIndex];
    arr[swapIndex] = tmp;
  }

  return arr;
}

function sampleUnique(items = [], count, predicate = null) {
  const source = typeof predicate === 'function' ? items.filter(predicate) : [...items];

  if (!source.length || count <= 0) {
    return [];
  }

  if (count >= source.length) {
    return shuffle(source);
  }

  return shuffle(source).slice(0, count);
}

function chunk(items = [], size = 500) {
  const output = [];

  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }

  return output;
}

function randomPastIso(maxDaysBack = 365) {
  const now = Date.now();
  const offsetMs = randomInt(0, maxDaysBack * 24 * 60 * 60) * 1000;
  return new Date(now - offsetMs).toISOString();
}

function randomReleaseDate() {
  const year = randomInt(1965, 2026);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeGenreIds(rawGenreIds = []) {
  const ids = [...new Set((Array.isArray(rawGenreIds) ? rawGenreIds : []).map((value) => Number(value)).filter(Boolean))].filter(
    (id) => GENRE_MAP[id]
  );

  if (ids.length > 0) {
    return ids.slice(0, 4);
  }

  return sampleUnique(GENRE_CATALOG, randomInt(1, 3)).map((genre) => genre.id);
}

function buildProviderMeta() {
  const picked = sampleUnique(PROVIDER_CATALOG, randomInt(1, 3));
  const providers = picked.map((provider) => ({
    display_priority: randomInt(1, 100),
    logo_path: null,
    provider_id: provider.id,
    provider_name: provider.name,
  }));

  return {
    providerIds: providers.map((provider) => provider.provider_id),
    providerNames: providers.map((provider) => provider.provider_name),
    providers,
    watchProviders: {
      TR: {
        flatrate: providers,
      },
    },
  };
}

function withMovieMeta(movie = {}) {
  const genreIds = normalizeGenreIds(movie.genre_ids || movie.genreIds);
  const genres = genreIds.map((id) => ({
    id,
    name: GENRE_MAP[id],
  }));
  const providerMeta = buildProviderMeta();
  const voteAverageRaw = Number(movie.vote_average ?? movie.voteAverage);
  const voteAverage = Number.isFinite(voteAverageRaw) && voteAverageRaw > 0 ? Number(voteAverageRaw.toFixed(1)) : Number((randomInt(35, 95) / 10).toFixed(1));
  const voteCountRaw = Number(movie.vote_count ?? movie.voteCount);
  const voteCount = Number.isFinite(voteCountRaw) && voteCountRaw > 0 ? Math.floor(voteCountRaw) : randomInt(120, 20000);
  const popularityRaw = Number(movie.popularity);
  const popularity = Number.isFinite(popularityRaw) && popularityRaw > 0 ? Number(popularityRaw.toFixed(3)) : Number((randomInt(50, 4000) / 10).toFixed(3));
  const runtimeRaw = Number(movie.runtime);
  const runtime = Number.isFinite(runtimeRaw) && runtimeRaw > 0 ? Math.floor(runtimeRaw) : randomInt(78, 188);
  const releaseDate = normalizeValue(movie.release_date || movie.releaseDate) || randomReleaseDate();

  return {
    ...movie,
    genreIds,
    genreNames: genres.map((genre) => genre.name),
    genres,
    popularity,
    providerIds: providerMeta.providerIds,
    providerNames: providerMeta.providerNames,
    providers: providerMeta.providers,
    releaseDate,
    runtime,
    voteAverage,
    voteCount,
    watchProviders: providerMeta.watchProviders,
  };
}

function buildMediaPayload(movie, extra = {}) {
  return {
    backdrop_path: movie.backdropPath,
    entityId: movie.entityId,
    entityType: 'movie',
    genreNames: movie.genreNames || [],
    genre_ids: movie.genreIds || [],
    genres: movie.genres || [],
    id: movie.entityId,
    mediaKey: movie.mediaKey,
    media_type: 'movie',
    popularity: movie.popularity ?? null,
    poster_path: movie.posterPath,
    providerIds: movie.providerIds || [],
    providerNames: movie.providerNames || [],
    providers: movie.providers || [],
    release_date: movie.releaseDate || null,
    runtime: movie.runtime ?? null,
    title: movie.title,
    vote_average: movie.voteAverage ?? null,
    vote_count: movie.voteCount ?? null,
    watchProviders: movie.watchProviders || null,
    ...extra,
  };
}

function buildMovieSubject(movie) {
  return {
    href: `/movie/${movie.entityId}`,
    id: movie.entityId,
    ownerId: null,
    ownerUsername: null,
    poster: movie.posterPath || null,
    slug: null,
    title: movie.title,
    type: 'movie',
  };
}

function buildListSubject({ coverPoster = null, listId, listSlug, listTitle, ownerId, ownerUsername }) {
  return {
    href: ownerUsername && listSlug ? `/account/${ownerUsername}/lists/${listSlug}` : null,
    id: listId,
    ownerId: ownerId || null,
    ownerUsername: ownerUsername || null,
    poster: coverPoster || null,
    slug: listSlug || null,
    title: listTitle || 'Untitled List',
    type: 'list',
  };
}

function buildActorSnapshot(user) {
  return {
    avatarUrl: user?.avatarUrl || null,
    displayName: user?.displayName || user?.username || 'Someone',
    id: user?.id || null,
    username: user?.username || null,
  };
}

function buildActivityRow({
  actor,
  createdAt,
  dedupeSuffix,
  eventType,
  payload,
  subject,
  visibility = 'public',
}) {
  const normalizedCreatedAt = normalizeValue(createdAt) || toIsoNow();

  return {
    created_at: normalizedCreatedAt,
    dedupe_key: `seed:${eventType}:${subject?.type || 'unknown'}:${subject?.id || 'unknown'}:${dedupeSuffix || crypto.randomUUID()}`,
    event_type: eventType,
    payload: {
      actor,
      eventType,
      payload: payload && typeof payload === 'object' ? payload : {},
      subject,
      visibility,
    },
    updated_at: normalizedCreatedAt,
    user_id: actor?.id || null,
  };
}

function buildRunId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `social-${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function mediaKey(entityId) {
  return `movie_${entityId}`;
}

function buildAvatarUrl(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/512/512`;
}

function buildBannerUrl(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1400/420`;
}

function buildTmdbImagePath(pathValue) {
  return normalizeValue(pathValue) || null;
}

function buildUsername(existing = new Set()) {
  let username = '';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate =
      `${randomPick(WORD_BANK.adjectives)}_${randomPick(WORD_BANK.nouns)}_${randomInt(100, 9999)}`.toLowerCase();

    if (!existing.has(candidate)) {
      username = candidate;
      break;
    }
  }

  if (!username) {
    username = `user_${crypto.randomBytes(5).toString('hex')}`;
  }

  existing.add(username);
  return username;
}

function buildDisplayName() {
  return `${randomPick(WORD_BANK.adjectives)} ${randomPick(WORD_BANK.nouns)}`
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function buildBio() {
  const fragments = sampleUnique(WORD_BANK.bioFragments, 3);
  return `${fragments[0]}, ${fragments[1]}, ${fragments[2]}.`;
}

function buildMovieTitle(index) {
  return `${randomPick(WORD_BANK.adjectives)} ${randomPick(WORD_BANK.nouns)} ${index}`
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function buildReviewText() {
  const opener = randomPick(WORD_BANK.reviewOpeners);
  const closer = randomPick(WORD_BANK.reviewClosers);
  const bridge = `Direction and structure stayed deliberate from setup to payoff.`;
  return `${opener} ${bridge} ${closer}`;
}

function buildListTitle() {
  return `${randomPick(WORD_BANK.adjectives)} ${randomPick(WORD_BANK.nouns)} Mix`
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function toRating() {
  return Number((randomInt(1, 10) / 2).toFixed(1));
}

function toIsoNow() {
  return new Date().toISOString();
}

function loadLocalEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = normalizeValue(line);

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

async function fetchMovieCatalog({ tmdbApiKey, targetCount = 800 }) {
  const dedupe = new Map();

  if (!tmdbApiKey) {
    return [];
  }

  const maxPages = Math.min(500, Math.max(5, Math.ceil(targetCount / 20) + 10));

  for (let page = 1; page <= maxPages; page += 1) {
    if (dedupe.size >= targetCount) {
      break;
    }

    const url = new URL('https://api.themoviedb.org/3/discover/movie');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('include_video', 'false');
    url.searchParams.set('language', 'en-US');
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort_by', 'popularity.desc');
    url.searchParams.set('vote_count.gte', '150');

    let response;

    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tmdbApiKey}`,
          Accept: 'application/json',
        },
      });
    } catch {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    const payload = await response.json().catch(() => ({}));
    const results = Array.isArray(payload?.results) ? payload.results : [];

    results.forEach((item) => {
      const entityId = normalizeValue(item?.id);
      const title = normalizeValue(item?.title || item?.original_title || item?.name);

      if (!entityId || !title) {
        return;
      }

      dedupe.set(entityId, {
        backdropPath: buildTmdbImagePath(item?.backdrop_path),
        entityId,
        entityType: 'movie',
        genre_ids: Array.isArray(item?.genre_ids) ? item.genre_ids : [],
        mediaKey: mediaKey(entityId),
        posterPath: buildTmdbImagePath(item?.poster_path),
        popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,
        release_date: normalizeValue(item?.release_date) || null,
        title,
        vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
        vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
      });
    });
  }

  return [...dedupe.values()].map((item) => withMovieMeta(item));
}

function buildFallbackCatalog(targetCount = 800) {
  const rows = [];

  for (let index = 1; index <= targetCount; index += 1) {
    const syntheticId = 900000 + index;
    rows.push({
      backdropPath: null,
      entityId: String(syntheticId),
      entityType: 'movie',
      mediaKey: mediaKey(String(syntheticId)),
      posterPath: null,
      title: buildMovieTitle(index),
    });
  }

  return rows.map((item) => withMovieMeta(item));
}

function createSupabaseAdminClient({ url, serviceRoleKey }) {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function insertInChunks({ admin, label, onConflict = null, rows = [], table, upsert = false, chunkSize = 400 }) {
  if (!rows.length) {
    return;
  }

  const batches = chunk(rows, chunkSize);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    let query = upsert ? admin.from(table).upsert(batch, onConflict ? { onConflict } : {}) : admin.from(table).insert(batch);

    const result = await query;

    if (result.error) {
      throw new Error(`${label} failed on chunk ${index + 1}/${batches.length}: ${result.error.message}`);
    }
  }
}

async function deleteAllRows(admin, table, filterColumn) {
  const result = await admin.from(table).delete().not(filterColumn, 'is', null);

  if (result.error) {
    throw new Error(`Reset failed on table "${table}": ${result.error.message}`);
  }
}

async function purgeAllAccountData(admin) {
  const deletePlan = [
    ['notifications', 'id'],
    ['review_likes', 'user_id'],
    ['list_reviews', 'user_id'],
    ['media_reviews', 'user_id'],
    ['list_likes', 'user_id'],
    ['list_items', 'list_id'],
    ['lists', 'user_id'],
    ['likes', 'user_id'],
    ['watchlist', 'user_id'],
    ['watched', 'user_id'],
    ['activity', 'user_id'],
    ['follows', 'follower_id'],
    ['auth_challenges', 'user_id'],
    ['auth_audit_logs', 'id'],
    ['auth_rate_limit_windows', 'key_hash'],
    ['auth_revocation_state', 'user_id'],
    ['account_lifecycle', 'user_id'],
    ['profile_counters', 'user_id'],
    ['usernames', 'user_id'],
    ['profiles', 'id'],
    ['feedback_submissions', 'id'],
  ];

  for (const [table, filterColumn] of deletePlan) {
    await deleteAllRows(admin, table, filterColumn);
  }

  let page = 1;
  const perPage = 200;

  while (true) {
    const listResult = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (listResult.error) {
      throw new Error(`Reset auth users list failed: ${listResult.error.message}`);
    }

    const users = Array.isArray(listResult.data?.users) ? listResult.data.users : [];

    if (!users.length) {
      break;
    }

    for (const user of users) {
      const userId = normalizeValue(user?.id);

      if (!userId) {
        continue;
      }

      const deleteResult = await admin.auth.admin.deleteUser(userId);

      if (deleteResult.error) {
        throw new Error(`Reset auth user delete failed (${userId}): ${deleteResult.error.message}`);
      }
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, {
    recursive: true,
  });
}

async function main() {
  loadLocalEnvFile();

  const supabaseUrl = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceRoleKey = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const tmdbApiKey = normalizeValue(process.env.TMDB_API_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  const config = {
    likesPerUser: normalizeNumber(process.env.SEED_LIKES_PER_USER, DEFAULTS.likesPerUser),
    listCountPerUser: normalizeNumber(process.env.SEED_LISTS_PER_USER, DEFAULTS.listCountPerUser),
    listItemsPerList: normalizeNumber(process.env.SEED_LIST_ITEMS_PER_LIST, DEFAULTS.listItemsPerList),
    reviewsPerUser: normalizeNumber(process.env.SEED_REVIEWS_PER_USER, DEFAULTS.reviewsPerUser),
    userCount: normalizeNumber(process.env.SEED_USER_COUNT, DEFAULTS.userCount),
    watchedPerUser: normalizeNumber(process.env.SEED_WATCHED_PER_USER, DEFAULTS.watchedPerUser),
    watchlistPerUser: normalizeNumber(process.env.SEED_WATCHLIST_PER_USER, DEFAULTS.watchlistPerUser),
  };
  const shouldResetAll = normalizeValue(process.env.SEED_RESET_ALL) === '1';
  const shouldIncludeActivity = normalizeValue(process.env.SEED_INCLUDE_ACTIVITY || '1') !== '0';

  const runId = normalizeValue(process.env.SEED_RUN_ID) || buildRunId();
  const sharedPassword = normalizeValue(process.env.SEED_USER_PASSWORD) || `TvizzieSeed!${new Date().getFullYear()}`;

  const admin = createSupabaseAdminClient({
    serviceRoleKey,
    url: supabaseUrl,
  });

  console.log(`[INFO] Seed run id: ${runId}`);
  console.log(`[INFO] Reset all account data: ${shouldResetAll ? 'yes' : 'no'}`);
  console.log(`[INFO] Include activity rows: ${shouldIncludeActivity ? 'yes' : 'no'}`);
  console.log(`[INFO] Users: ${config.userCount}, watched/likes/watchlist/reviews per user: ${config.watchedPerUser}/${config.likesPerUser}/${config.watchlistPerUser}/${config.reviewsPerUser}`);
  console.log(`[INFO] Lists per user: ${config.listCountPerUser}, items per list: ${config.listItemsPerList}`);

  if (shouldResetAll) {
    console.log('[INFO] Purging all account-related data...');
    await purgeAllAccountData(admin);
    console.log('[INFO] Purge completed');
  }

  let catalog = await fetchMovieCatalog({
    tmdbApiKey,
    targetCount: 900,
  });

  if (catalog.length < 120) {
    catalog = buildFallbackCatalog(1200);
    console.log('[WARN] TMDB catalog unavailable or too small; using synthetic movie catalog.');
  } else {
    console.log(`[INFO] Movie catalog loaded from TMDB: ${catalog.length}`);
  }

  const usernameDedupe = new Set();
  const users = [];
  const profiles = [];
  const usernames = [];
  const accountLifecycleRows = [];
  const profileCounters = new Map();

  const watchedRows = [];
  const likesRows = [];
  const watchlistRows = [];
  const listRows = [];
  const listItemsRows = [];
  const mediaReviewRows = [];
  const activityRows = [];

  for (let index = 1; index <= config.userCount; index += 1) {
    const username = buildUsername(usernameDedupe);
    const displayName = buildDisplayName();
    const email = `seed.social.${runId}.${index}@example.com`;
    const createdAt = randomPastIso(280);
    const avatarUrl = buildAvatarUrl(`${runId}-${username}`);
    const bannerUrl = buildBannerUrl(`${runId}-${username}`);
    const isPrivate = Math.random() < 0.2;

    const createdUser = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: sharedPassword,
      user_metadata: {
        seed_batch: runId,
        seed_label: 'social-graph',
        seed_username: username,
      },
    });

    if (createdUser.error || !createdUser.data?.user?.id) {
      throw new Error(`createUser failed (${email}): ${createdUser.error?.message || 'missing-user-id'}`);
    }

    const userId = createdUser.data.user.id;
    const watchedSet = sampleUnique(catalog, config.watchedPerUser);
    const likesSet = sampleUnique(catalog, config.likesPerUser);
    const watchlistSet = sampleUnique(catalog, config.watchlistPerUser);
    const reviewsSet = sampleUnique(catalog, config.reviewsPerUser);
    const favoriteShowcase = sampleUnique(likesSet.length ? likesSet : catalog, Math.min(6, (likesSet.length ? likesSet : catalog).length));
    const actorSnapshot = buildActorSnapshot({
      avatarUrl,
      displayName,
      id: userId,
      username,
    });
    const activityVisibility = isPrivate ? 'followers' : 'public';

    users.push({
      avatarUrl,
      bannerUrl,
      createdAt,
      displayName,
      email,
      id: userId,
      isPrivate,
      username,
    });

    profiles.push({
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      created_at: createdAt,
      description: buildBio(),
      display_name: displayName,
      display_name_lower: displayName.toLowerCase(),
      email,
      favorite_showcase: favoriteShowcase.map((movie) => ({
        entityId: movie.entityId,
        entityType: 'movie',
        mediaKey: movie.mediaKey,
        poster_path: movie.posterPath,
        title: movie.title,
      })),
      id: userId,
      is_private: isPrivate,
      last_activity_at: toIsoNow(),
      updated_at: toIsoNow(),
      username,
      username_lower: username.toLowerCase(),
      watched_count: config.watchedPerUser,
    });

    usernames.push({
      created_at: createdAt,
      updated_at: toIsoNow(),
      user_id: userId,
      username,
      username_lower: username.toLowerCase(),
    });

    accountLifecycleRows.push({
      created_at: createdAt,
      metadata: {
        source: 'seed-social-graph',
      },
      state: 'ACTIVE',
      updated_at: toIsoNow(),
      user_id: userId,
    });

    profileCounters.set(userId, {
      follower_count: 0,
      following_count: 0,
      likes_count: config.likesPerUser,
      lists_count: config.listCountPerUser,
      updated_at: toIsoNow(),
      user_id: userId,
      watched_count: config.watchedPerUser,
      watchlist_count: config.watchlistPerUser,
    });

    watchedSet.forEach((movie) => {
      const firstWatchedAt = randomPastIso(180);
      const lastWatchedAt = randomPastIso(30);
      const watchCount = randomInt(1, 6);
      const payload = buildMediaPayload(movie, {
        firstWatchedAt,
        lastWatchedAt,
        sourceLastAction: 'watched',
        updatedAt: lastWatchedAt,
        userId,
        watchCount,
      });

      watchedRows.push({
        backdrop_path: movie.backdropPath,
        created_at: firstWatchedAt,
        entity_id: movie.entityId,
        entity_type: 'movie',
        last_watched_at: lastWatchedAt,
        media_key: movie.mediaKey,
        payload,
        poster_path: movie.posterPath,
        title: movie.title,
        updated_at: lastWatchedAt,
        user_id: userId,
        watch_count: watchCount,
      });

      if (shouldIncludeActivity) {
        const subject = buildMovieSubject(movie);

        activityRows.push(
          buildActivityRow({
            actor: actorSnapshot,
            createdAt: lastWatchedAt,
            dedupeSuffix: `${runId}:watched:${movie.mediaKey}:${lastWatchedAt}`,
            eventType: ACTIVITY_EVENT_TYPES.WATCHED_MARKED,
            payload: {
              subjectId: movie.entityId,
              subjectPoster: movie.posterPath || null,
              subjectTitle: movie.title,
              subjectType: 'movie',
              watchCount,
            },
            subject,
            visibility: activityVisibility,
          })
        );
      }
    });

    likesSet.forEach((movie) => {
      const addedAt = randomPastIso(160);
      const payload = buildMediaPayload(movie, {
        updatedAt: addedAt,
        userId,
      });

      likesRows.push({
        added_at: addedAt,
        backdrop_path: movie.backdropPath,
        entity_id: movie.entityId,
        entity_type: 'movie',
        media_key: movie.mediaKey,
        payload,
        poster_path: movie.posterPath,
        title: movie.title,
        updated_at: addedAt,
        user_id: userId,
      });

      if (shouldIncludeActivity) {
        const subject = buildMovieSubject(movie);

        activityRows.push(
          buildActivityRow({
            actor: actorSnapshot,
            createdAt: addedAt,
            dedupeSuffix: `${runId}:like:${movie.mediaKey}:${addedAt}`,
            eventType: ACTIVITY_EVENT_TYPES.LIST_LIKED,
            payload: {
              subjectId: movie.entityId,
              subjectPoster: movie.posterPath || null,
              subjectTitle: movie.title,
              subjectType: 'movie',
            },
            subject,
            visibility: activityVisibility,
          })
        );
      }
    });

    watchlistSet.forEach((movie) => {
      const addedAt = randomPastIso(200);
      const payload = buildMediaPayload(movie, {
        updatedAt: addedAt,
        userId,
      });

      watchlistRows.push({
        added_at: addedAt,
        backdrop_path: movie.backdropPath,
        entity_id: movie.entityId,
        entity_type: 'movie',
        media_key: movie.mediaKey,
        payload,
        poster_path: movie.posterPath,
        title: movie.title,
        updated_at: addedAt,
        user_id: userId,
      });

      if (shouldIncludeActivity) {
        const subject = buildMovieSubject(movie);

        activityRows.push(
          buildActivityRow({
            actor: actorSnapshot,
            createdAt: addedAt,
            dedupeSuffix: `${runId}:watchlist:${movie.mediaKey}:${addedAt}`,
            eventType: ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED,
            payload: {
              subjectId: movie.entityId,
              subjectPoster: movie.posterPath || null,
              subjectTitle: movie.title,
              subjectType: 'movie',
            },
            subject,
            visibility: activityVisibility,
          })
        );
      }
    });

    reviewsSet.forEach((movie) => {
      const createdAtIso = randomPastIso(170);
      const ratingValue = toRating();
      const reviewText = buildReviewText();
      const reviewMode = Math.random() < 0.22 ? 'rating' : 'review';

      mediaReviewRows.push({
        content: reviewMode === 'rating' ? '' : reviewText,
        created_at: createdAtIso,
        is_spoiler: Math.random() < 0.08,
        likes_count: 0,
        media_key: movie.mediaKey,
        payload: {
          authorId: userId,
          content: reviewMode === 'rating' ? '' : reviewText,
          isSpoiler: false,
          rating: ratingValue,
          reviewMode,
          subjectHref: `/movie/${movie.entityId}`,
          subjectId: movie.entityId,
          subjectKey: movie.mediaKey,
          subjectPoster: movie.posterPath,
          subjectTitle: movie.title,
          subjectType: 'movie',
          user: {
            avatarUrl,
            id: userId,
            name: displayName,
            username,
          },
        },
        rating: ratingValue,
        updated_at: createdAtIso,
        user_id: userId,
      });

      if (shouldIncludeActivity) {
        const subject = buildMovieSubject(movie);

        activityRows.push(
          buildActivityRow({
            actor: actorSnapshot,
            createdAt: createdAtIso,
            dedupeSuffix: `${runId}:review:${movie.mediaKey}:${createdAtIso}`,
            eventType: ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED,
            payload: {
              authorId: userId,
              content: reviewMode === 'rating' ? '' : reviewText,
              rating: ratingValue,
              reviewMode,
              subjectId: movie.entityId,
              subjectPoster: movie.posterPath || null,
              subjectTitle: movie.title,
              subjectType: 'movie',
            },
            subject,
            visibility: activityVisibility,
          })
        );
      }
    });

    for (let listIndex = 1; listIndex <= config.listCountPerUser; listIndex += 1) {
      const listId = crypto.randomUUID();
      const listCreatedAt = randomPastIso(200);
      const listTitle = buildListTitle();
      const listSlug = `${username}-${listIndex}-${crypto.randomBytes(2).toString('hex')}`;
      const listItems = sampleUnique(catalog, config.listItemsPerList);
      const previewItems = listItems.slice(0, 6).map((movie) => ({
        ...buildMediaPayload(movie),
        id: movie.entityId,
      }));
      const cover = listItems[0] || null;

      listRows.push({
        created_at: listCreatedAt,
        description: buildBio(),
        id: listId,
        is_private: false,
        is_ranked: Math.random() < 0.35,
        likes_count: 0,
        payload: {
          coverUrl: cover?.posterPath || '',
          description: buildBio(),
          itemsCount: listItems.length,
          likes: [],
          ownerSnapshot: {
            avatarUrl,
            displayName,
            id: userId,
            username,
          },
          previewItems,
          reviewsCount: 0,
          slug: listSlug,
          title: listTitle,
        },
        poster_path: cover?.posterPath || null,
        reviews_count: 0,
        slug: listSlug,
        title: listTitle,
        updated_at: toIsoNow(),
        user_id: userId,
      });

      listItems.forEach((movie, position) => {
        const listItemUpdatedAt = randomPastIso(120);

        listItemsRows.push({
          added_at: listCreatedAt,
          backdrop_path: movie.backdropPath,
          entity_id: movie.entityId,
          entity_type: 'movie',
          list_id: listId,
          media_key: movie.mediaKey,
          payload: buildMediaPayload(movie, {
            position: position + 1,
            updatedAt: listItemUpdatedAt,
            userId,
          }),
          position: position + 1,
          poster_path: movie.posterPath,
          title: movie.title,
          updated_at: listItemUpdatedAt,
          user_id: userId,
        });
      });

      if (shouldIncludeActivity) {
        activityRows.push(
          buildActivityRow({
            actor: actorSnapshot,
            createdAt: listCreatedAt,
            dedupeSuffix: `${runId}:list:${listId}:${listCreatedAt}`,
            eventType: ACTIVITY_EVENT_TYPES.LIST_CREATED,
            payload: {
              listId,
              listSlug,
              listTitle,
              subjectId: listId,
              subjectOwnerId: userId,
              subjectOwnerUsername: username,
              subjectPoster: cover?.posterPath || null,
              subjectSlug: listSlug,
              subjectTitle: listTitle,
              subjectType: 'list',
            },
            subject: buildListSubject({
              coverPoster: cover?.posterPath || null,
              listId,
              listSlug,
              listTitle,
              ownerId: userId,
              ownerUsername: username,
            }),
            visibility: activityVisibility,
          })
        );
      }
    }

    if (index % 5 === 0 || index === config.userCount) {
      console.log(`[INFO] Generated user data: ${index}/${config.userCount}`);
    }
  }

  const followsRows = [];
  const followsDedupe = new Set();

  users.forEach((follower) => {
    const targets = sampleUnique(users, randomInt(4, 10), (candidate) => candidate.id !== follower.id);

    targets.forEach((following) => {
      const key = `${follower.id}:${following.id}`;

      if (followsDedupe.has(key)) {
        return;
      }

      followsDedupe.add(key);

      followsRows.push({
        created_at: randomPastIso(160),
        follower_avatar_url: follower.avatarUrl,
        follower_display_name: follower.displayName,
        follower_id: follower.id,
        follower_username: follower.username,
        following_avatar_url: following.avatarUrl,
        following_display_name: following.displayName,
        following_id: following.id,
        following_username: following.username,
        responded_at: randomPastIso(90),
        status: Math.random() < 0.92 ? 'accepted' : 'pending',
        updated_at: toIsoNow(),
      });
    });
  });

  const listLikesRows = [];
  const listLikesDedupe = new Set();
  const listReviewsRows = [];
  const listReviewDedupe = new Set();
  const allListRows = [...listRows];

  users.forEach((actor) => {
    const candidateLists = sampleUnique(
      allListRows,
      randomInt(18, 32),
      (listItem) => normalizeValue(listItem.user_id) !== normalizeValue(actor.id)
    );

    candidateLists.forEach((listItem) => {
      const key = `${listItem.id}:${actor.id}`;

      if (listLikesDedupe.has(key)) {
        return;
      }

      listLikesDedupe.add(key);
      listLikesRows.push({
        created_at: randomPastIso(120),
        list_id: listItem.id,
        user_id: actor.id,
      });
    });

    const commentedLists = sampleUnique(
      allListRows,
      randomInt(8, 14),
      (listItem) => normalizeValue(listItem.user_id) !== normalizeValue(actor.id)
    );

    commentedLists.forEach((listItem) => {
      const key = `${listItem.id}:${actor.id}`;

      if (listReviewDedupe.has(key)) {
        return;
      }

      listReviewDedupe.add(key);
      const owner = users.find((user) => normalizeValue(user.id) === normalizeValue(listItem.user_id));
      const createdAtIso = randomPastIso(100);
      listReviewsRows.push({
        content: buildReviewText(),
        created_at: createdAtIso,
        is_spoiler: Math.random() < 0.06,
        likes_count: 0,
        list_id: listItem.id,
        payload: {
          authorId: actor.id,
          content: buildReviewText(),
          isSpoiler: false,
          rating: toRating(),
          subjectHref: `/account/${owner?.username || 'user'}/lists/${listItem.slug}`,
          subjectId: listItem.id,
          subjectKey: `list:${listItem.user_id}:${listItem.id}`,
          subjectOwnerId: listItem.user_id,
          subjectOwnerUsername: owner?.username || null,
          subjectPoster: listItem.poster_path || null,
          subjectSlug: listItem.slug,
          subjectTitle: listItem.title,
          subjectType: 'list',
          user: {
            avatarUrl: actor.avatarUrl,
            id: actor.id,
            name: actor.displayName,
            username: actor.username,
          },
        },
        rating: toRating(),
        updated_at: toIsoNow(),
        user_id: actor.id,
      });
    });
  });

  const reviewLikesRows = [];
  const reviewLikesDedupe = new Set();
  const reviewLikeCandidates = mediaReviewRows.map((row) => ({
    mediaKey: row.media_key,
    reviewUserId: row.user_id,
  }));

  users.forEach((actor) => {
    const likes = sampleUnique(
      reviewLikeCandidates,
      randomInt(26, 40),
      (candidate) => normalizeValue(candidate.reviewUserId) !== normalizeValue(actor.id)
    );

    likes.forEach((candidate) => {
      const key = `${candidate.mediaKey}:${candidate.reviewUserId}:${actor.id}`;

      if (reviewLikesDedupe.has(key)) {
        return;
      }

      reviewLikesDedupe.add(key);
      reviewLikesRows.push({
        created_at: randomPastIso(110),
        media_key: candidate.mediaKey,
        review_user_id: candidate.reviewUserId,
        user_id: actor.id,
      });
    });
  });

  const followerCountMap = new Map();
  const followingCountMap = new Map();

  followsRows.forEach((row) => {
    if (normalizeValue(row.status) !== 'accepted') {
      return;
    }

    followingCountMap.set(row.follower_id, (followingCountMap.get(row.follower_id) || 0) + 1);
    followerCountMap.set(row.following_id, (followerCountMap.get(row.following_id) || 0) + 1);
  });

  const listLikeCountMap = new Map();
  listLikesRows.forEach((row) => {
    listLikeCountMap.set(row.list_id, (listLikeCountMap.get(row.list_id) || 0) + 1);
  });

  const listReviewCountMap = new Map();
  listReviewsRows.forEach((row) => {
    listReviewCountMap.set(row.list_id, (listReviewCountMap.get(row.list_id) || 0) + 1);
  });

  const reviewLikeCountMap = new Map();
  reviewLikesRows.forEach((row) => {
    const key = `${row.media_key}:${row.review_user_id}`;
    reviewLikeCountMap.set(key, (reviewLikeCountMap.get(key) || 0) + 1);
  });

  listRows.forEach((row) => {
    row.likes_count = listLikeCountMap.get(row.id) || 0;
    row.reviews_count = listReviewCountMap.get(row.id) || 0;

    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    row.payload = {
      ...payload,
      itemsCount: config.listItemsPerList,
      likes: [],
      reviewsCount: row.reviews_count,
    };
  });

  mediaReviewRows.forEach((row) => {
    const key = `${row.media_key}:${row.user_id}`;
    row.likes_count = reviewLikeCountMap.get(key) || 0;
  });

  users.forEach((user) => {
    const counters = profileCounters.get(user.id);

    if (!counters) {
      return;
    }

    counters.follower_count = followerCountMap.get(user.id) || 0;
    counters.following_count = followingCountMap.get(user.id) || 0;
    profileCounters.set(user.id, counters);
  });

  console.log('[INFO] Writing seed rows to database...');

  await insertInChunks({
    admin,
    label: 'profiles upsert',
    onConflict: 'id',
    rows: profiles,
    table: 'profiles',
    upsert: true,
    chunkSize: 100,
  });
  await insertInChunks({
    admin,
    label: 'usernames upsert',
    onConflict: 'username',
    rows: usernames,
    table: 'usernames',
    upsert: true,
    chunkSize: 100,
  });
  await insertInChunks({
    admin,
    label: 'account lifecycle upsert',
    onConflict: 'user_id',
    rows: accountLifecycleRows,
    table: 'account_lifecycle',
    upsert: true,
    chunkSize: 100,
  });
  await insertInChunks({
    admin,
    label: 'profile counters upsert',
    onConflict: 'user_id',
    rows: [...profileCounters.values()],
    table: 'profile_counters',
    upsert: true,
    chunkSize: 100,
  });
  await insertInChunks({
    admin,
    label: 'follows insert',
    rows: followsRows,
    table: 'follows',
    chunkSize: 300,
  });
  await insertInChunks({
    admin,
    label: 'lists insert',
    rows: listRows,
    table: 'lists',
    chunkSize: 150,
  });
  await insertInChunks({
    admin,
    label: 'list items insert',
    rows: listItemsRows,
    table: 'list_items',
    chunkSize: 400,
  });
  await insertInChunks({
    admin,
    label: 'list likes insert',
    rows: listLikesRows,
    table: 'list_likes',
    chunkSize: 400,
  });
  await insertInChunks({
    admin,
    label: 'list reviews insert',
    rows: listReviewsRows,
    table: 'list_reviews',
    chunkSize: 300,
  });
  await insertInChunks({
    admin,
    label: 'watched insert',
    rows: watchedRows,
    table: 'watched',
    chunkSize: 350,
  });
  await insertInChunks({
    admin,
    label: 'likes insert',
    rows: likesRows,
    table: 'likes',
    chunkSize: 350,
  });
  await insertInChunks({
    admin,
    label: 'watchlist insert',
    rows: watchlistRows,
    table: 'watchlist',
    chunkSize: 350,
  });
  await insertInChunks({
    admin,
    label: 'media reviews insert',
    rows: mediaReviewRows,
    table: 'media_reviews',
    chunkSize: 300,
  });
  await insertInChunks({
    admin,
    label: 'activity insert',
    rows: activityRows,
    table: 'activity',
    chunkSize: 350,
  });
  await insertInChunks({
    admin,
    label: 'review likes insert',
    rows: reviewLikesRows,
    table: 'review_likes',
    chunkSize: 400,
  });

  const outputDir = path.resolve(process.cwd(), 'scripts', 'output');
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, `seed-social-${runId}.json`);
  const outputPayload = {
    config,
    createdAt: toIsoNow(),
    password: sharedPassword,
    runId,
    users: users.map((user) => ({
      email: user.email,
      id: user.id,
      username: user.username,
    })),
  };
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');

  console.log('[PASS] Social seed completed');
  console.log(`[INFO] Run id: ${runId}`);
  console.log(`[INFO] Created users: ${users.length}`);
  console.log(`[INFO] Data rows -> watched:${watchedRows.length}, likes:${likesRows.length}, watchlist:${watchlistRows.length}, lists:${listRows.length}, list_items:${listItemsRows.length}, media_reviews:${mediaReviewRows.length}, activity:${activityRows.length}`);
  console.log(`[INFO] Credentials file: ${outputPath}`);
}

main().catch((error) => {
  console.error(`[FAIL] Social seed failed: ${error?.message || error}`);
  process.exit(1);
});
