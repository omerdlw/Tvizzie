import 'server-only';

import { ACTOR_PROFILE_SELECT } from './event-processor.constants';
import { normalizeValue } from './event-processor.shared';

export async function getUserProfile(admin, userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  const result = await admin.from('profiles').select(ACTOR_PROFILE_SELECT).eq('id', normalizedUserId).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Actor profile could not be loaded');
  }

  return result.data || null;
}

export async function getExistingActivity(admin, userId, dedupeKey) {
  if (!dedupeKey) {
    return null;
  }

  const result = await admin
    .from('activity')
    .select('id')
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Activity event could not be loaded');
  }

  return result.data || null;
}

export async function deleteByExactDedupeKey(admin, { dedupeKey, userId }) {
  const query = admin.from('activity').delete().eq('dedupe_key', dedupeKey);
  const result = userId ? await query.eq('user_id', userId) : await query;

  if (result.error) {
    throw new Error(result.error.message || 'Activity rows could not be removed');
  }

  return Array.isArray(result.data) ? result.data.length : 0;
}

export async function deleteByDedupePattern(admin, pattern) {
  const result = await admin.from('activity').delete().like('dedupe_key', pattern);

  if (result.error) {
    throw new Error(result.error.message || 'Activity rows could not be removed');
  }

  return Array.isArray(result.data) ? result.data.length : 0;
}
