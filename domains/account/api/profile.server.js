'use server';

import { normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { getAccountIdByUsername, getAccountProfileByUserId } from '../server/profile.server';
import { validateUsername } from '../utils';

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

    const profile = await getAccountProfileByUserId(targetUserId, { viewerId });
    return { success: true, profile: profile || null };
  } catch (error) {
    return { success: false, error: error.message || 'Profile could not be loaded' };
  }
}

export async function updateAccountProfileServer({ userId, displayName, username, avatarUrl, bannerUrl, description, isPrivate }) {
  try {
    const admin = createAdminClient();
    const updates = {};

    if (displayName !== undefined) updates.display_name = normalizeValue(displayName);
    if (username !== undefined) updates.username = validateUsername(username);
    if (avatarUrl !== undefined) updates.avatar_url = normalizeValue(avatarUrl) || null;
    if (bannerUrl !== undefined) updates.banner_url = normalizeValue(bannerUrl) || null;
    if (description !== undefined) updates.description = normalizeValue(description);
    if (isPrivate !== undefined) updates.is_private = Boolean(isPrivate);

    updates.updated_at = new Date().toISOString();

    const { data, error } = await admin.from('accounts').update(updates).eq('id', userId).select().single();
    if (error) throw new Error(error.message || 'Account update failed');

    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message || 'Account update failed' };
  }
}
