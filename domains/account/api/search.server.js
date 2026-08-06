'use server';

import { normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';

export async function searchAccountsServer({ searchTerm, limitCount = 10 }) {
  try {
    const term = normalizeValue(searchTerm);
    if (!term) return { success: true, items: [] };

    const maxLimit = Math.min(50, Math.max(1, Number(limitCount) || 10));
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_private')
      .or(`username_lower.ilike.%${term.toLowerCase()}%,display_name_lower.ilike.%${term.toLowerCase()}%`)
      .limit(maxLimit);

    if (error) throw new Error(error.message || 'Search failed');

    const items = (data || []).map((row) => ({
      avatarUrl: row.avatar_url || null,
      displayName: row.display_name || 'Anonymous User',
      id: row.id,
      isPrivate: Boolean(row.is_private),
      username: row.username,
    }));

    return { success: true, items };
  } catch (error) {
    return { success: false, error: error.message || 'Account search failed' };
  }
}
