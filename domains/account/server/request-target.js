import 'server-only';

import { normalizeValue } from '@/shared/normalize';
import { getAccountIdByUsername } from './profile';

export async function resolveAccountRequestUserId({ fallbackUserId = null, searchParams } = {}) {
  const userId = normalizeValue(searchParams?.get('userId'));
  if (userId) return userId;

  const username = normalizeValue(searchParams?.get('username'));
  if (username) return getAccountIdByUsername(username);

  return normalizeValue(fallbackUserId) || null;
}
