'use server';

import { normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { ensurePasswordAccountRecord } from '@/domains/auth/server/account.server.js';
import { getAccountIdByUsername, getAccountProfileByUserId } from '../server/profile.server';
import { getViewerSessionContext } from '../server/routes.server';
import { sanitizeUsername, validateUsername } from '../utils';

export async function getAccountProfileServer({ userId, username, viewerId }) {
  try {
    let targetUserId = userId || null;
    if (!targetUserId && username) {
      targetUserId = await getAccountIdByUsername(username);
    }
    if (!targetUserId && viewerId) {
      targetUserId = viewerId;
    }

    if (!targetUserId) {
      return { success: true, profile: null };
    }

    const sessionContext = await getViewerSessionContext().catch(() => null);
    const effectiveViewerId = viewerId || sessionContext?.userId || null;

    const profile = await getAccountProfileByUserId(targetUserId, { viewerId: effectiveViewerId });
    return { success: true, profile: profile || null };
  } catch (error) {
    return { success: false, error: error.message || 'Profile could not be loaded' };
  }
}

export async function updateAccountProfileServer({ userId, displayName, username, avatarUrl, bannerUrl, description, isPrivate, email }) {
  try {
    const normalizedUserId = normalizeValue(userId);
    if (!normalizedUserId) throw new Error('User ID is required');

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
      const targetUsername = validateUsername(rawUsername);
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

    const profile = await getAccountProfileByUserId(normalizedUserId);
    return { success: true, profile };
  } catch (error) {
    return { success: false, error: error.message || 'Account update failed' };
  }
}
