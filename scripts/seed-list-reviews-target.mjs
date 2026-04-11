#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

const DEFAULTS = Object.freeze({
  reviewCount: 100,
  slug: 'misty_flux_3887-5-c26e',
  username: 'misty_flux_3887',
});

const WORDS = Object.freeze({
  closers: [
    'Saved this list for later.',
    'Great flow between entries.',
    'This list has strong curation.',
    'Will revisit this one often.',
    'Easy recommendation.',
  ],
  openers: [
    'Strong list with a clear theme.',
    'Solid pacing across the lineup.',
    'Good balance of classics and newer picks.',
    'Consistent tone throughout the selections.',
    'Nice mix with clean transitions.',
  ],
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function randomInt(min, max) {
  return crypto.randomInt(min, max + 1);
}

function randomPick(list = []) {
  if (!Array.isArray(list) || list.length === 0) {
    return '';
  }

  return list[randomInt(0, list.length - 1)];
}

function shuffle(items = []) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    const temp = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = temp;
  }

  return copy;
}

function sampleUnique(items = [], count = 0) {
  if (!Array.isArray(items) || items.length === 0 || count <= 0) {
    return [];
  }

  if (count >= items.length) {
    return shuffle(items);
  }

  return shuffle(items).slice(0, count);
}

function chunk(items = [], size = 200) {
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function toIsoNow() {
  return new Date().toISOString();
}

function randomPastIso(maxDays = 120) {
  const offsetSeconds = randomInt(0, maxDays * 24 * 60 * 60);
  return new Date(Date.now() - offsetSeconds * 1000).toISOString();
}

function toRating() {
  return Number((randomInt(2, 10) / 2).toFixed(1));
}

function buildReviewText() {
  return `${randomPick(WORDS.openers)} ${randomPick(WORDS.closers)}`;
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

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    reviewCount: parseNumber(process.env.TARGET_REVIEW_COUNT, DEFAULTS.reviewCount),
    slug: normalizeValue(process.env.TARGET_LIST_SLUG || DEFAULTS.slug),
    username: normalizeValue(process.env.TARGET_USERNAME || DEFAULTS.username),
  };

  args.forEach((arg) => {
    if (arg.startsWith('--username=')) {
      parsed.username = normalizeValue(arg.slice('--username='.length)) || parsed.username;
    } else if (arg.startsWith('--slug=')) {
      parsed.slug = normalizeValue(arg.slice('--slug='.length)) || parsed.slug;
    } else if (arg.startsWith('--count=')) {
      parsed.reviewCount = parseNumber(arg.slice('--count='.length), parsed.reviewCount);
    }
  });

  return parsed;
}

function createAdminClient() {
  const supabaseUrl = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceRoleKey = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env vars.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function insertInChunks({ admin, table, rows, size = 200 }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  for (const batch of chunk(rows, size)) {
    const result = await admin.from(table).insert(batch);

    if (result.error) {
      throw new Error(`${table} insert failed: ${result.error.message}`);
    }
  }
}

async function createSyntheticUsers(admin, count) {
  const createdProfiles = [];
  const profilesRows = [];
  const usernamesRows = [];
  const countersRows = [];
  const lifecycleRows = [];
  const nowIso = toIsoNow();

  for (let index = 0; index < count; index += 1) {
    const token = crypto.randomBytes(4).toString('hex');
    const username = `review_seed_${token}`.toLowerCase();
    const email = `list.review.seed.${token}@example.com`;
    const displayName = `Review Seed ${token.slice(0, 4).toUpperCase()}`;
    const createdAt = randomPastIso(50);

    const createUserResult = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: `TvizzieSeed!${new Date().getFullYear()}`,
      user_metadata: {
        seed_label: 'list-review-target',
        seed_username: username,
      },
    });

    if (createUserResult.error || !createUserResult.data?.user?.id) {
      throw new Error(`createUser failed: ${createUserResult.error?.message || 'missing-user-id'}`);
    }

    const userId = createUserResult.data.user.id;
    const avatarUrl = `https://picsum.photos/seed/${encodeURIComponent(username)}/512/512`;

    profilesRows.push({
      avatar_url: avatarUrl,
      banner_url: `https://picsum.photos/seed/${encodeURIComponent(`${username}-banner`)}/1400/420`,
      created_at: createdAt,
      description: 'seeded profile for list review target',
      display_name: displayName,
      display_name_lower: displayName.toLowerCase(),
      email,
      favorite_showcase: [],
      id: userId,
      is_private: false,
      last_activity_at: nowIso,
      updated_at: nowIso,
      username,
      username_lower: username.toLowerCase(),
      watched_count: 0,
    });

    usernamesRows.push({
      created_at: createdAt,
      updated_at: nowIso,
      user_id: userId,
      username,
      username_lower: username.toLowerCase(),
    });

    countersRows.push({
      follower_count: 0,
      following_count: 0,
      likes_count: 0,
      lists_count: 0,
      updated_at: nowIso,
      user_id: userId,
      watched_count: 0,
      watchlist_count: 0,
    });

    lifecycleRows.push({
      created_at: createdAt,
      metadata: {
        source: 'seed-list-reviews-target',
      },
      state: 'ACTIVE',
      updated_at: nowIso,
      user_id: userId,
    });

    createdProfiles.push({
      avatar_url: avatarUrl,
      display_name: displayName,
      id: userId,
      username,
    });
  }

  await insertInChunks({
    admin,
    rows: profilesRows,
    table: 'profiles',
    size: 100,
  });
  await insertInChunks({
    admin,
    rows: usernamesRows,
    table: 'usernames',
    size: 100,
  });
  await insertInChunks({
    admin,
    rows: countersRows,
    table: 'profile_counters',
    size: 100,
  });
  await insertInChunks({
    admin,
    rows: lifecycleRows,
    table: 'account_lifecycle',
    size: 100,
  });

  return createdProfiles;
}

async function main() {
  loadLocalEnvFile();

  const { reviewCount, slug, username } = parseArgs();
  const admin = createAdminClient();

  const usernameResult = await admin
    .from('usernames')
    .select('user_id,username')
    .eq('username_lower', username.toLowerCase())
    .maybeSingle();

  if (usernameResult.error) {
    throw new Error(`Username lookup failed: ${usernameResult.error.message}`);
  }

  if (!usernameResult.data?.user_id) {
    throw new Error(`User not found: @${username}`);
  }

  const ownerId = usernameResult.data.user_id;
  const ownerUsername = normalizeValue(usernameResult.data.username) || username;

  const listResult = await admin
    .from('lists')
    .select('id,user_id,slug,title,poster_path,payload,reviews_count')
    .eq('user_id', ownerId)
    .eq('slug', slug)
    .maybeSingle();

  if (listResult.error) {
    throw new Error(`List lookup failed: ${listResult.error.message}`);
  }

  if (!listResult.data?.id) {
    throw new Error(`List not found: ${slug}`);
  }

  const list = listResult.data;

  const existingReviewsResult = await admin
    .from('list_reviews')
    .select('user_id')
    .eq('list_id', list.id);

  if (existingReviewsResult.error) {
    throw new Error(`Existing reviews fetch failed: ${existingReviewsResult.error.message}`);
  }

  const existingReviews = Array.isArray(existingReviewsResult.data) ? existingReviewsResult.data : [];
  const existingCount = existingReviews.length;
  const needed = Math.max(0, reviewCount - existingCount);

  console.log(`[INFO] Target list: ${slug} (${list.id})`);
  console.log(`[INFO] Existing reviews: ${existingCount}; target: ${reviewCount}; to create: ${needed}`);

  if (needed > 0) {
    const profilesResult = await admin
      .from('profiles')
      .select('id,username,display_name,avatar_url')
      .neq('id', ownerId)
      .limit(10000);

    if (profilesResult.error) {
      throw new Error(`Profiles fetch failed: ${profilesResult.error.message}`);
    }

    const existingReviewerIds = new Set(existingReviews.map((row) => normalizeValue(row.user_id)).filter(Boolean));
    let reviewersPool = (profilesResult.data || []).filter((profile) => {
      const id = normalizeValue(profile.id);
      return id && !existingReviewerIds.has(id);
    });

    if (reviewersPool.length < needed) {
      const missingUsers = needed - reviewersPool.length;
      console.log(`[INFO] Creating ${missingUsers} synthetic users to reach ${reviewCount} unique reviews...`);
      const createdProfiles = await createSyntheticUsers(admin, missingUsers);
      reviewersPool = [...reviewersPool, ...createdProfiles];
    }

    const selectedReviewers = sampleUnique(reviewersPool, needed);

    if (selectedReviewers.length < needed) {
      throw new Error(`Not enough reviewers available (${selectedReviewers.length}/${needed}).`);
    }

    const nowIso = toIsoNow();
    const rows = selectedReviewers.map((reviewer) => {
      const rating = toRating();
      const content = buildReviewText();
      const createdAt = randomPastIso(90);

      return {
        content,
        created_at: createdAt,
        is_spoiler: Math.random() < 0.08,
        likes_count: 0,
        list_id: list.id,
        payload: {
          authorId: reviewer.id,
          content,
          isSpoiler: false,
          rating,
          subjectHref: `/account/${ownerUsername}/lists/${list.slug}`,
          subjectId: list.id,
          subjectKey: `list:${ownerId}:${list.id}`,
          subjectOwnerId: ownerId,
          subjectOwnerUsername: ownerUsername,
          subjectPoster: list.poster_path || null,
          subjectSlug: list.slug,
          subjectTitle: list.title || 'Untitled List',
          subjectType: 'list',
          user: {
            avatarUrl: reviewer.avatar_url || null,
            id: reviewer.id,
            name: reviewer.display_name || reviewer.username || 'User',
            username: reviewer.username || null,
          },
        },
        rating,
        updated_at: nowIso,
        user_id: reviewer.id,
      };
    });

    await insertInChunks({
      admin,
      rows,
      table: 'list_reviews',
      size: 200,
    });

    console.log(`[INFO] Inserted reviews: ${rows.length}`);
  }

  const recountResult = await admin
    .from('list_reviews')
    .select('list_id', { count: 'exact', head: true })
    .eq('list_id', list.id);

  if (recountResult.error) {
    throw new Error(`Review recount failed: ${recountResult.error.message}`);
  }

  const totalReviews = Number(recountResult.count || 0);
  const payload = list?.payload && typeof list.payload === 'object' ? list.payload : {};
  const nowIso = toIsoNow();

  const updateListResult = await admin
    .from('lists')
    .update({
      payload: {
        ...payload,
        reviewsCount: totalReviews,
      },
      reviews_count: totalReviews,
      updated_at: nowIso,
    })
    .eq('id', list.id)
    .eq('user_id', ownerId);

  if (updateListResult.error) {
    throw new Error(`List update failed: ${updateListResult.error.message}`);
  }

  console.log('[PASS] List reviews seeded');
  console.log(`[INFO] Final reviews on ${slug}: ${totalReviews}`);
}

main().catch((error) => {
  console.error(`[FAIL] ${error?.message || error}`);
  process.exit(1);
});
