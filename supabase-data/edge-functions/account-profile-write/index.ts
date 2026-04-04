import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  buildAvailableUsername,
  getDefaultUsernameBase,
  normalizeOptionalUrl,
  normalizeProfileResponse,
  validateUsername,
} from '../_shared/account.js';
import { assertMethod, errorResponse, jsonResponse, mapErrorToStatus, readJsonBody } from '../_shared/http.js';
import { assertInternalAccess } from '../_shared/internal.js';
import { cleanString, normalizeBoolean, normalizeEmail, normalizeValue } from '../_shared/normalize.js';
import { createAdminClient, isMissingFunctionError } from '../_shared/supabase.js';

type ActionType = 'ensure' | 'update' | 'sync-email';

type ProfileWriteRequest = {
  action?: ActionType;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  displayName?: string | null;
  email?: string | null;
  isPrivate?: boolean;
  userId?: string;
  username?: string | null;
};

const CLAIM_USERNAME_RPC = 'claim_username';
const PROMOTE_PENDING_RPC = 'promote_pending_followers_to_accepted';

const PROFILE_SELECT = [
  'avatar_url',
  'banner_url',
  'created_at',
  'description',
  'display_name',
  'display_name_lower',
  'email',
  'favorite_showcase',
  'id',
  'is_private',
  'last_activity_at',
  'updated_at',
  'username',
  'username_lower',
].join(',');

const COUNTER_SELECT = [
  'follower_count',
  'following_count',
  'likes_count',
  'lists_count',
  'watched_count',
  'watchlist_count',
].join(',');

function normalizeAction(value: unknown): ActionType {
  const action = normalizeValue(value).toLowerCase();

  if (action === 'ensure' || action === 'update' || action === 'sync-email') {
    return action;
  }

  throw new Error('action must be one of: ensure, update, sync-email');
}

function normalizeDisplayName(value: unknown, fallback = 'Anonymous User') {
  return cleanString(value) || fallback;
}

function normalizeDescription(value: unknown, fallback = '') {
  return cleanString(value) || fallback;
}

function isUsernameTakenError(error: unknown) {
  const message = normalizeValue((error as Error)?.message).toLowerCase();

  return (
    message.includes('username_taken') || message.includes('duplicate key value') || message.includes('already exists')
  );
}

async function getProfileRow(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const result = await admin.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Profile could not be loaded');
  }

  return (result.data || null) as Record<string, unknown> | null;
}

async function getProfileSnapshot(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const [profile, countersResult] = await Promise.all([
    getProfileRow(admin, userId),
    admin.from('profile_counters').select(COUNTER_SELECT).eq('user_id', userId).maybeSingle(),
  ]);

  if (countersResult.error) {
    throw new Error(countersResult.error.message || 'Profile counters could not be loaded');
  }

  return normalizeProfileResponse(profile, (countersResult.data || null) as Record<string, unknown> | null);
}

async function ensureUsernameMapping(
  admin: ReturnType<typeof createAdminClient>,
  {
    userId,
    username,
    createdAt,
  }: {
    userId: string;
    username: string;
    createdAt?: string | null;
  }
) {
  const result = await admin.from('usernames').upsert(
    {
      created_at: normalizeValue(createdAt) || undefined,
      updated_at: new Date().toISOString(),
      user_id: userId,
      username,
      username_lower: username,
    },
    { onConflict: 'user_id' }
  );

  if (result.error) {
    if (isUsernameTakenError(result.error)) {
      throw new Error('USERNAME_TAKEN');
    }

    throw new Error(result.error.message || 'Username mapping could not be synced');
  }
}

async function claimUsernameManual(
  admin: ReturnType<typeof createAdminClient>,
  {
    userId,
    username,
    displayName,
    email,
    avatarUrl,
    preserveExisting,
    failIfProfileHasUsername,
  }: {
    userId: string;
    username: string;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
    preserveExisting: boolean;
    failIfProfileHasUsername: boolean;
  }
) {
  const currentProfile = await getProfileRow(admin, userId);

  if (failIfProfileHasUsername && normalizeValue(currentProfile?.username)) {
    throw new Error('PROFILE_USERNAME_EXISTS');
  }

  if (preserveExisting && normalizeValue(currentProfile?.username)) {
    return;
  }

  await ensureUsernameMapping(admin, {
    createdAt: normalizeValue(currentProfile?.created_at) || null,
    userId,
    username,
  });

  const result = await admin
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
      display_name: displayName,
      display_name_lower: displayName.toLowerCase(),
      email,
      updated_at: new Date().toISOString(),
      username,
      username_lower: username,
    })
    .eq('id', userId);

  if (result.error) {
    throw new Error(result.error.message || 'Username could not be claimed');
  }
}

async function claimUsername(
  admin: ReturnType<typeof createAdminClient>,
  {
    userId,
    username,
    displayName,
    email,
    avatarUrl,
    preserveExisting = false,
    failIfProfileHasUsername = false,
  }: {
    userId: string;
    username: string;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
    preserveExisting?: boolean;
    failIfProfileHasUsername?: boolean;
  }
) {
  const payload = {
    p_avatar_url: avatarUrl,
    p_display_name: displayName,
    p_email: email,
    p_fail_if_profile_has_username: failIfProfileHasUsername,
    p_preserve_existing: preserveExisting,
    p_user_id: userId,
    p_username: username,
  };

  const result = await admin.rpc(CLAIM_USERNAME_RPC, payload);

  if (result.error) {
    if (isMissingFunctionError(result.error)) {
      await claimUsernameManual(admin, {
        avatarUrl,
        displayName,
        email,
        failIfProfileHasUsername,
        preserveExisting,
        userId,
        username,
      });
      return;
    }

    throw new Error(result.error.message || 'Username could not be claimed');
  }
}

async function resolveUsernameCandidate(
  admin: ReturnType<typeof createAdminClient>,
  {
    userId,
    displayName,
    email,
    avatarUrl,
  }: {
    userId: string;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
  }
) {
  const base = getDefaultUsernameBase({
    displayName,
    email,
    userId,
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = buildAvailableUsername(base, attempt);

    try {
      await claimUsername(admin, {
        avatarUrl,
        displayName,
        email,
        failIfProfileHasUsername: true,
        preserveExisting: true,
        userId,
        username: candidate,
      });
      return candidate;
    } catch (error) {
      if (isUsernameTakenError(error)) {
        continue;
      }

      const message = normalizeValue((error as Error)?.message);

      if (message.includes('PROFILE_USERNAME_EXISTS')) {
        return null;
      }

      throw error;
    }
  }

  throw new Error('Could not generate an available username');
}

async function applyProfileSyncPatch(
  admin: ReturnType<typeof createAdminClient>,
  {
    userId,
    avatarUrl,
    bannerUrl,
    description,
    displayName,
    email,
    isPrivate,
    username,
  }: {
    userId: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    description: string;
    displayName: string;
    email: string | null;
    isPrivate: boolean;
    username: string;
  }
) {
  const result = await admin
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      description,
      display_name: displayName,
      display_name_lower: displayName.toLowerCase(),
      email,
      is_private: isPrivate,
      updated_at: new Date().toISOString(),
      username,
      username_lower: username,
    })
    .eq('id', userId);

  if (result.error) {
    throw new Error(result.error.message || 'Profile could not be synced');
  }
}

async function runEnsureAction(admin: ReturnType<typeof createAdminClient>, payload: ProfileWriteRequest) {
  const userId = normalizeValue(payload.userId);

  if (!userId) {
    throw new Error('userId is required');
  }

  const currentProfile = await getProfileRow(admin, userId);
  const normalizedEmail = normalizeEmail(payload.email || currentProfile?.email);
  const displayName = normalizeDisplayName(
    payload.displayName,
    normalizeDisplayName(
      currentProfile?.display_name,
      normalizeValue(normalizedEmail.split('@')[0] || 'Anonymous User')
    )
  );
  const avatarUrl =
    payload.avatarUrl !== undefined
      ? normalizeOptionalUrl(payload.avatarUrl)
      : normalizeOptionalUrl(currentProfile?.avatar_url);
  const bannerUrl =
    payload.bannerUrl !== undefined
      ? normalizeOptionalUrl(payload.bannerUrl)
      : normalizeOptionalUrl(currentProfile?.banner_url);
  const description =
    payload.description !== undefined
      ? normalizeDescription(payload.description)
      : normalizeDescription(currentProfile?.description);
  const preferredUsername =
    payload.username !== undefined && payload.username !== null ? validateUsername(payload.username) : null;

  let nextUsername = normalizeValue(currentProfile?.username);

  if (preferredUsername) {
    await claimUsername(admin, {
      avatarUrl,
      displayName,
      email: normalizedEmail || null,
      preserveExisting: false,
      userId,
      username: preferredUsername,
    });
    nextUsername = preferredUsername;
  } else if (!nextUsername) {
    const generated = await resolveUsernameCandidate(admin, {
      avatarUrl,
      displayName,
      email: normalizedEmail || null,
      userId,
    });

    if (generated) {
      nextUsername = generated;
    }
  } else {
    await ensureUsernameMapping(admin, {
      createdAt: normalizeValue(currentProfile?.created_at) || null,
      userId,
      username: nextUsername,
    });
  }

  if (!nextUsername) {
    throw new Error('Username could not be resolved');
  }

  await applyProfileSyncPatch(admin, {
    avatarUrl,
    bannerUrl,
    description,
    displayName,
    email: normalizedEmail || null,
    isPrivate: currentProfile?.is_private === true,
    userId,
    username: nextUsername,
  });

  return getProfileSnapshot(admin, userId);
}

async function runUpdateAction(admin: ReturnType<typeof createAdminClient>, payload: ProfileWriteRequest) {
  const userId = normalizeValue(payload.userId);

  if (!userId) {
    throw new Error('userId is required');
  }

  const currentProfile = await getProfileRow(admin, userId);

  if (!currentProfile) {
    const notFoundError = new Error('Profile does not exist');
    (notFoundError as Error & { status?: number }).status = 404;
    throw notFoundError;
  }

  const resolvedCurrentUsername = normalizeValue(currentProfile.username);
  const fallbackGeneratedUsername = getDefaultUsernameBase({
    displayName: payload.displayName || currentProfile.display_name,
    email: payload.email || currentProfile.email,
    userId,
  });
  const nextUsername =
    payload.username !== undefined && payload.username !== null
      ? validateUsername(payload.username)
      : resolvedCurrentUsername
        ? validateUsername(resolvedCurrentUsername)
        : fallbackGeneratedUsername;
  const nextDisplayName =
    payload.displayName !== undefined
      ? normalizeDisplayName(payload.displayName)
      : normalizeDisplayName(currentProfile.display_name);
  const nextAvatarUrl =
    payload.avatarUrl !== undefined
      ? normalizeOptionalUrl(payload.avatarUrl)
      : normalizeOptionalUrl(currentProfile.avatar_url);
  const nextBannerUrl =
    payload.bannerUrl !== undefined
      ? normalizeOptionalUrl(payload.bannerUrl)
      : normalizeOptionalUrl(currentProfile.banner_url);
  const nextDescription =
    payload.description !== undefined
      ? normalizeDescription(payload.description)
      : normalizeDescription(currentProfile.description);
  const nextIsPrivate =
    payload.isPrivate !== undefined
      ? normalizeBoolean(payload.isPrivate, currentProfile.is_private === true)
      : currentProfile.is_private === true;
  const nextEmail = normalizeEmail(payload.email || currentProfile.email);
  const shouldPromoteFollowers = currentProfile.is_private === true && nextIsPrivate === false;

  await claimUsername(admin, {
    avatarUrl: nextAvatarUrl,
    displayName: nextDisplayName,
    email: nextEmail || null,
    preserveExisting: false,
    userId,
    username: nextUsername,
  });

  await applyProfileSyncPatch(admin, {
    avatarUrl: nextAvatarUrl,
    bannerUrl: nextBannerUrl,
    description: nextDescription,
    displayName: nextDisplayName,
    email: nextEmail || null,
    isPrivate: nextIsPrivate,
    userId,
    username: nextUsername,
  });

  if (shouldPromoteFollowers) {
    await admin.rpc(PROMOTE_PENDING_RPC, { p_user_id: userId }).catch(() => null);
  }

  return getProfileSnapshot(admin, userId);
}

async function runSyncEmailAction(admin: ReturnType<typeof createAdminClient>, payload: ProfileWriteRequest) {
  const userId = normalizeValue(payload.userId);
  const nextEmail = normalizeEmail(payload.email);

  if (!userId) {
    throw new Error('userId is required');
  }

  if (!nextEmail || !nextEmail.includes('@')) {
    throw new Error('email must be valid');
  }

  const result = await admin
    .from('profiles')
    .update({
      email: nextEmail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (result.error) {
    throw new Error(result.error.message || 'Email could not be synced');
  }

  return getProfileSnapshot(admin, userId);
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ['POST']);
    assertInternalAccess(request);

    const payload = await readJsonBody<ProfileWriteRequest>(request);
    const action = normalizeAction(payload.action);
    const admin = createAdminClient();

    const profile =
      action === 'ensure'
        ? await runEnsureAction(admin, payload)
        : action === 'update'
          ? await runUpdateAction(admin, payload)
          : await runSyncEmailAction(admin, payload);

    return jsonResponse(200, {
      ok: true,
      action,
      profile,
    });
  } catch (error) {
    const status = mapErrorToStatus(error);
    const message = normalizeValue((error as Error)?.message) || 'account-profile-write failed';

    if (status === 405) {
      return errorResponse(405, 'Method not allowed');
    }

    return errorResponse(status, message);
  }
});
