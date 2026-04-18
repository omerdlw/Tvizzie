import { createAdminClient } from '@/core/clients/supabase/admin';
import { validateUsername } from '@/core/utils/account-username';
import { ensureAccountLifecycle } from '@/core/auth/servers/account/account-lifecycle.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

async function claimUsernameForProfile({
  avatarUrl = null,
  displayName,
  email = null,
  failIfProfileHasUsername = false,
  preserveExisting = false,
  userId,
  username,
}) {
  const admin = createAdminClient();
  const { error } = await admin.rpc('claim_username', {
    p_avatar_url: normalizeValue(avatarUrl) || null,
    p_display_name: normalizeValue(displayName) || username,
    p_email: normalizeEmail(email) || null,
    p_fail_if_profile_has_username: Boolean(failIfProfileHasUsername),
    p_preserve_existing: Boolean(preserveExisting),
    p_user_id: normalizeValue(userId),
    p_username: validateUsername(username),
  });

  if (error) {
    throw new Error(error.message || 'Username could not be claimed');
  }
}

export async function ensurePasswordAccountRecord({ avatarUrl = null, displayName, email, userId, username }) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = validateUsername(username);
  const resolvedDisplayName = normalizeValue(displayName) || normalizedUsername;

  if (!normalizedUserId || !normalizedEmail) {
    throw new Error('User ID and email are required to create the account profile');
  }

  await claimUsernameForProfile({
    avatarUrl,
    displayName: resolvedDisplayName,
    email: normalizedEmail,
    preserveExisting: false,
    userId: normalizedUserId,
    username: normalizedUsername,
  });

  const profileResult = await createAdminClient()
    .from('profiles')
    .select('id, email, username')
    .eq('id', normalizedUserId)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded');
  }

  const profile = profileResult.data || null;

  if (!profile?.id || !normalizeValue(profile?.username)) {
    throw new Error('Profile could not be bootstrapped');
  }

  await ensureAccountLifecycle(normalizedUserId);

  return profile;
}
