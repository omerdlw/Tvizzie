#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const scriptFilename = fileURLToPath(import.meta.url);
const scriptDirname = path.dirname(scriptFilename);
const REPO_ROOT = path.resolve(scriptDirname, '..');

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

function normalizeValue(value) {
  return String(value ?? '').trim();
}

function log(message) {
  console.log(`[backfill:genres] ${message}`);
}

async function loadEnvFile(filePath) {
  const raw = await readFile(filePath, 'utf8').catch(() => '');

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

    if (!match) {
      return;
    }

    const [, key, rawValue] = match;

    if (process.env[key]) {
      return;
    }

    let value = rawValue.trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed with status ${response.status}`);
  }

  return response.json();
}

async function fetchDiscoverGenreMap(apiKey, targetMediaIds = []) {
  const mediaIdSet = new Set((Array.isArray(targetMediaIds) ? targetMediaIds : []).map((value) => normalizeValue(value)).filter(Boolean));
  const genreMap = new Map();

  for (let page = 1; page <= 250; page += 1) {
    const payload = await fetchJson(
      `https://api.themoviedb.org/3/discover/movie?language=en-US&page=${page}&sort_by=popularity.desc&with_runtime.gte=40`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    const results = Array.isArray(payload?.results) ? payload.results : [];

    results.forEach((movie) => {
      const entityId = normalizeValue(movie?.id);

      if (!entityId || (mediaIdSet.size > 0 && !mediaIdSet.has(entityId))) {
        return;
      }

      const genreIds = Array.isArray(movie?.genre_ids)
        ? movie.genre_ids.map((genreId) => Number(genreId)).filter((genreId) => Number.isFinite(genreId))
        : [];

      genreMap.set(entityId, {
        genreNames: genreIds.map((genreId) => TMDB_GENRE_ID_TO_NAME[genreId]).filter(Boolean),
        genre_ids: genreIds,
        genres: genreIds
          .map((genreId) => ({
            id: genreId,
            name: TMDB_GENRE_ID_TO_NAME[genreId] || null,
          }))
          .filter((genre) => genre.name),
      });
    });

    if (mediaIdSet.size > 0 && genreMap.size >= mediaIdSet.size) {
      break;
    }
  }

  return genreMap;
}

async function fetchMovieGenresById(apiKey, entityId) {
  const payload = await fetchJson(`https://api.themoviedb.org/3/movie/${entityId}?language=en-US`, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const genres = Array.isArray(payload?.genres) ? payload.genres : [];
  const genreIds = genres.map((genre) => Number(genre?.id)).filter((genreId) => Number.isFinite(genreId));

  return {
    genreNames: genres.map((genre) => genre?.name).filter(Boolean),
    genre_ids: genreIds,
    genres: genres
      .map((genre) => ({
        id: Number(genre?.id),
        name: genre?.name || null,
      }))
      .filter((genre) => Number.isFinite(genre.id) && genre.name),
  };
}

async function ensureGenreMap(apiKey, mediaIds = []) {
  const genreMap = await fetchDiscoverGenreMap(apiKey, mediaIds);
  const missingIds = mediaIds.filter((mediaId) => !genreMap.has(normalizeValue(mediaId)));

  for (const mediaId of missingIds) {
    try {
      genreMap.set(normalizeValue(mediaId), await fetchMovieGenresById(apiKey, mediaId));
    } catch (error) {
      log(`skipping TMDB genre backfill for movie ${mediaId}: ${error.message || error}`);
    }
  }

  return genreMap;
}

function applyGenresToPayload(payload = {}, genres = null) {
  if (!genres || !Array.isArray(genres.genre_ids) || genres.genre_ids.length === 0) {
    return payload;
  }

  return {
    ...payload,
    genreNames: genres.genreNames,
    genre_ids: genres.genre_ids,
    genres: genres.genres,
  };
}

function payloadHasGenres(payload = {}) {
  return Array.isArray(payload?.genre_ids) && payload.genre_ids.length > 0;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries(task, { attempts = 5, label = 'operation' } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const message = normalizeValue(error?.message).toLowerCase();
      const isRetryable =
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504') ||
        message.includes('bad gateway') ||
        message.includes('cloudflare') ||
        message.includes('fetch failed');

      if (!isRetryable || attempt === attempts) {
        break;
      }

      await wait(300 * attempt);
      log(`retrying ${label} (${attempt + 1}/${attempts})`);
    }
  }

  throw lastError;
}

async function upsertInChunks(admin, table, rows, onConflict, size = 250) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const result = await withRetries(() => admin.from(table).upsert(chunk, { onConflict }), {
      label: `${table} upsert chunk ${index / size + 1}`,
    });

    if (result.error) {
      throw new Error(`${table} upsert failed: ${result.error.message || 'unknown error'}`);
    }
  }
}

async function updateListItemsInChunks(admin, rows = [], concurrency = 20) {
  for (let index = 0; index < rows.length; index += concurrency) {
    const chunk = rows.slice(index, index + concurrency);

    await Promise.all(
      chunk.map(async (row) => {
        const result = await withRetries(
          () =>
            admin
              .from('list_items')
              .update({
                payload: row.payload,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', row.user_id)
              .eq('list_id', row.list_id)
              .eq('media_key', row.media_key),
          {
            label: `list_items update ${row.list_id}:${row.media_key}`,
          }
        );

        if (result.error) {
          throw new Error(`list_items update failed: ${result.error.message || 'unknown error'}`);
        }
      })
    );
  }
}

async function loadAllRowsByUserIds(admin, table, userIds = [], pageSize = 1000) {
  const rows = [];
  let offset = 0;

  while (true) {
    const result = await admin.from(table).select('*').in('user_id', userIds).range(offset, offset + pageSize - 1);

    if (result.error) {
      throw new Error(result.error.message || `${table} could not be loaded`);
    }

    const batch = Array.isArray(result.data) ? result.data : [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

async function main() {
  await loadEnvFile(path.join(REPO_ROOT, '.env'));

  const summaryPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(REPO_ROOT, 'scripts', 'output', 'seed-social-social-20260414-activity-1.json');
  const supabaseUrl = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const tmdbApiKey = normalizeValue(process.env.TMDB_API_KEY);

  if (!supabaseUrl || !serviceRoleKey || !tmdbApiKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and TMDB_API_KEY are required');
  }

  const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
  const usernames = (Array.isArray(summary?.users) ? summary.users : []).map((user) => normalizeValue(user?.username)).filter(Boolean);

  if (usernames.length === 0) {
    throw new Error(`No users found in summary file: ${summaryPath}`);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const profilesResult = await admin.from('profiles').select('id,username').in('username', usernames);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message || 'Profiles could not be loaded');
  }

  const userIds = (profilesResult.data || []).map((row) => normalizeValue(row?.id)).filter(Boolean);

  if (userIds.length === 0) {
    throw new Error('No matching seeded users were found in profiles');
  }

  log(`targeting ${userIds.length} seeded users`);

  const [likesRowsSource, watchlistRowsSource, watchedRowsSource, listItemRowsSource] = await Promise.all([
    loadAllRowsByUserIds(admin, 'likes', userIds),
    loadAllRowsByUserIds(admin, 'watchlist', userIds),
    loadAllRowsByUserIds(admin, 'watched', userIds),
    loadAllRowsByUserIds(admin, 'list_items', userIds),
  ]);

  const allRows = [
    ...likesRowsSource,
    ...watchlistRowsSource,
    ...watchedRowsSource,
    ...listItemRowsSource,
  ];
  const mediaIds = [...new Set(allRows.map((row) => normalizeValue(row?.entity_id)).filter(Boolean))];

  log(`loaded ${allRows.length} collection rows across ${mediaIds.length} unique movies`);

  const genreMap = await ensureGenreMap(tmdbApiKey, mediaIds);

  const likesRows = likesRowsSource
    .filter((row) => !payloadHasGenres(row.payload))
    .map((row) => ({
      ...row,
      payload: applyGenresToPayload(row.payload || {}, genreMap.get(normalizeValue(row?.entity_id)) || null),
    }))
    .filter((row) => payloadHasGenres(row.payload));
  const watchlistRows = watchlistRowsSource
    .filter((row) => !payloadHasGenres(row.payload))
    .map((row) => ({
      ...row,
      payload: applyGenresToPayload(row.payload || {}, genreMap.get(normalizeValue(row?.entity_id)) || null),
    }))
    .filter((row) => payloadHasGenres(row.payload));
  const watchedRows = watchedRowsSource
    .filter((row) => !payloadHasGenres(row.payload))
    .map((row) => ({
      ...row,
      payload: applyGenresToPayload(row.payload || {}, genreMap.get(normalizeValue(row?.entity_id)) || null),
    }))
    .filter((row) => payloadHasGenres(row.payload));
  const listItemRows = listItemRowsSource
    .filter((row) => !payloadHasGenres(row.payload))
    .map((row) => ({
      ...row,
      payload: applyGenresToPayload(row.payload || {}, genreMap.get(normalizeValue(row?.entity_id)) || null),
    }))
    .filter((row) => payloadHasGenres(row.payload));

  log(
    `pending updates -> likes:${likesRows.length} watchlist:${watchlistRows.length} watched:${watchedRows.length} list_items:${listItemRows.length}`
  );

  await upsertInChunks(admin, 'likes', likesRows, 'media_key,user_id');
  await upsertInChunks(admin, 'watchlist', watchlistRows, 'media_key,user_id');
  await upsertInChunks(admin, 'watched', watchedRows, 'media_key,user_id');
  await updateListItemsInChunks(admin, listItemRows);

  const profilesWithFavoritesResult = await admin.from('profiles').select('id,favorite_showcase').in('id', userIds);

  if (profilesWithFavoritesResult.error) {
    throw new Error(profilesWithFavoritesResult.error.message || 'Profiles could not be loaded for favorites backfill');
  }

  for (const profile of profilesWithFavoritesResult.data || []) {
    const favoriteShowcase = Array.isArray(profile.favorite_showcase) ? profile.favorite_showcase : [];
    const nextShowcase = favoriteShowcase.map((item) => {
      const entityId = normalizeValue(item?.entityId ?? item?.id);
      return applyGenresToPayload(item, genreMap.get(entityId) || null);
    });

    if (JSON.stringify(nextShowcase) === JSON.stringify(favoriteShowcase)) {
      continue;
    }

    const updateResult = await admin
      .from('profiles')
      .update({
        favorite_showcase: nextShowcase,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message || 'Favorite showcase could not be updated');
    }
  }

  log('genre metadata backfill completed');
}

main().catch((error) => {
  console.error(`[backfill:genres] failed: ${error.message || error}`);
  process.exitCode = 1;
});
