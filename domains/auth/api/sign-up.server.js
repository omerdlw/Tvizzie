'use server';

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { ensurePasswordAccountRecord } from '../server/account.server';

export async function completeSignUpServer({ email, password, username }) {
  try {
    const normEmail = normalizeEmailValue(email);
    const normPassword = String(password || '');
    const normUsername = normalizeValue(username);

    if (!normEmail || !normPassword || !normUsername) {
      return { success: false, error: 'email, password, and username are required' };
    }

    const admin = createAdminClient();
    const createRes = await admin.auth.admin.createUser({
      email: normEmail,
      password: normPassword,
      email_confirm: true,
    });

    if (createRes.error || !createRes.data?.user?.id) {
      return { success: false, error: createRes.error?.message || 'Failed to create user' };
    }

    const userId = createRes.data.user.id;
    await ensurePasswordAccountRecord({ displayName: normUsername, email: normEmail, userId, username: normUsername });

    return { success: true, userId };
  } catch (error) {
    return { success: false, error: error.message || 'Sign up failed' };
  }
}
