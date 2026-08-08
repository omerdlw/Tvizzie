'use server';

import { normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { ensurePasswordAccountRecord } from '@/domains/auth/server/account.server.js';
import {
  getAccountIdByUsername,
  getAccountProfileByUserId,
  getAccountSnapshotByUserId,
  invalidateCachedAccountProfiles,
} from '../server/profile.server';
import { getViewerSessionContext } from '../server/routes.server';
import { sanitizeUsername, validateUsername } from '../utils';

const MAX_USERNAME_GENERATION_ATTEMPTS = 100;

export async function getAccountProfileServer({ userId, username }) {
  try {
    let targetUserId = userId || null;
    if (!targetUserId && username) {
      targetUserId = await getAccountIdByUsername(username);
    }
    const sessionContext = await getViewerSessionContext().catch(() => null);
    const authenticatedViewerId = sessionContext?.userId || null;
    if (!targetUserId && authenticatedViewerId) targetUserId = authenticatedViewerId;

    if (!targetUserId) {
      return { success: true, profile: null };
    }

    const profile = await getAccountProfileByUserId(targetUserId, {
      viewerId: authenticatedViewerId,
    });
    return { success: true, profile: profile || null };
  } catch (error) {
    return { success: false, error: error.message || 'Profile could not be loaded' };
  }
}

export async function updateAccountProfileServer({
  displayName,
  username,
  avatarUrl,
  bannerUrl,
  description,
  isPrivate,
  email,
}) {
  try {
    const sessionContext = await getViewerSessionContext().catch(() => null);
    const normalizedUserId = normalizeValue(sessionContext?.userId);
    if (!normalizedUserId) throw new Error('Authentication is required to update an account');

    const admin = createAdminClient();

    const existing = await admin
      .from('profiles')
      .select('id, username')
      .eq('id', normalizedUserId)
      .maybeSingle();

    if (!existing.data?.id) {
      let rawUsername = username;
      if (!rawUsername) {
        const base = displayName || email?.split('@')[0] || `user_${normalizedUserId.slice(0, 8)}`;
        rawUsername = sanitizeUsername(base) || `user_${normalizedUserId.slice(0, 8)}`;
        if (rawUsername.length < 3) rawUsername = `user_${rawUsername}`;
      }

      let targetUsername = validateUsername(rawUsername);
      let candidateUsername = targetUsername;

      for (let suffix = 0; suffix <= MAX_USERNAME_GENERATION_ATTEMPTS; suffix += 1) {
        const checkResult = await admin
          .from('usernames')
          .select('user_id')
          .eq('username_lower', candidateUsername.toLowerCase())
          .maybeSingle();

        if (checkResult.error)
          throw new Error(
            checkResult.error.message || 'Username availability could not be checked',
          );
        if (!checkResult.data?.user_id) {
          targetUsername = candidateUsername;
          break;
        } else {
          const suffixStr = `_${suffix + 1}`;
          const baseLength = 24 - suffixStr.length;
          candidateUsername = validateUsername(targetUsername.slice(0, baseLength) + suffixStr);
        }

        if (suffix === MAX_USERNAME_GENERATION_ATTEMPTS) {
          throw new Error('Could not generate an available username');
        }
      }

      const targetDisplayName = normalizeValue(displayName) || targetUsername;
      const targetEmail = normalizeValue(email) || `${targetUsername}@tvizzie.local`;

      await ensurePasswordAccountRecord({
        avatarUrl: avatarUrl || null,
        displayName: targetDisplayName,
        email: targetEmail,
        userId: normalizedUserId,
        username: targetUsername,
      });
    } else {
      const updates = {
        updated_at: new Date().toISOString(),
      };

      if (displayName !== undefined) updates.display_name = normalizeValue(displayName);
      if (avatarUrl !== undefined) updates.avatar_url = normalizeValue(avatarUrl) || null;
      if (bannerUrl !== undefined) updates.banner_url = normalizeValue(bannerUrl) || null;
      if (description !== undefined) updates.description = normalizeValue(description);
      if (isPrivate !== undefined) updates.is_private = Boolean(isPrivate);
      if (username) {
        updates.username = validateUsername(username);
        updates.username_lower = updates.username.toLowerCase();
      }

      const { error } = await admin.from('profiles').update(updates).eq('id', normalizedUserId);
      if (error) throw new Error(error.message || 'Profile update failed');
    }

    invalidateCachedAccountProfiles(normalizedUserId);
    const freshSnapshot = await getAccountSnapshotByUserId(normalizedUserId, {
      includeEmail: true,
      includePrivateDetails: true,
    });
    const profile = freshSnapshot.profile;
    return { success: true, profile };
  } catch (error) {
    return { success: false, error: error.message || 'Account update failed' };
  }
}
