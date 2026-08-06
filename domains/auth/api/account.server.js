'use server';

import { cookies } from 'next/headers';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  beginAccountDeleteLifecycle,
  completeAccountDeleteLifecycle,
  hasPasswordProvider,
} from '../server/account.server';
import {
  createRecentReauthToken,
  validateStrongPassword,
  verifyPasswordWithIdentityToolkit,
} from '../server/security.server';

export async function getPasswordStatusServer({ userId }) {
  try {
    const admin = createAdminClient();
    const userRecord = await admin.auth.admin.getUserById(userId);
    const passwordEnabled = hasPasswordProvider(userRecord?.data?.user);
    return { success: true, passwordEnabled };
  } catch (error) {
    return { success: false, error: error.message || 'Status check failed' };
  }
}

export async function reauthenticateAccountServer({ email, currentPassword, userId, sessionJti }) {
  try {
    const normPassword = String(currentPassword || '');
    if (!normPassword) {
      return { success: false, error: 'Current password is required' };
    }

    await verifyPasswordWithIdentityToolkit({ email, password: normPassword });
    const reauthToken = createRecentReauthToken({ email, sessionJti, userId });

    const cookieStore = await cookies();
    cookieStore.set('tvz_reauth', reauthToken, {
      httpOnly: true,
      maxAge: 900,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Reauthentication failed' };
  }
}

export async function deleteAccountServer({ userId }) {
  try {
    await beginAccountDeleteLifecycle({ userId });
    await completeAccountDeleteLifecycle({ userId });

    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    cookieStore.delete('tvz_reauth');

    return { success: true, deleted: true };
  } catch (error) {
    return { success: false, error: error.message || 'Account deletion failed' };
  }
}

export async function changeEmailServer({ userId, newEmail }) {
  try {
    const normEmail = normalizeEmailValue(newEmail);
    if (!normEmail || !normEmail.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }

    const admin = createAdminClient();
    const updateRes = await admin.auth.admin.updateUserById(userId, { email: normEmail });
    if (updateRes.error) throw updateRes.error;

    return { success: true, updated: true };
  } catch (error) {
    return { success: false, error: error.message || 'Email change failed' };
  }
}

export async function changePasswordServer({ userId, newPassword }) {
  try {
    const normPassword = validateStrongPassword(newPassword);
    const admin = createAdminClient();
    const updateRes = await admin.auth.admin.updateUserById(userId, { password: normPassword });
    if (updateRes.error) throw updateRes.error;

    return { success: true, updated: true };
  } catch (error) {
    return { success: false, error: error.message || 'Password change failed' };
  }
}

export async function setPasswordServer({ userId, newPassword }) {
  try {
    const normPassword = validateStrongPassword(newPassword);
    const admin = createAdminClient();
    const updateRes = await admin.auth.admin.updateUserById(userId, { password: normPassword });
    if (updateRes.error) throw updateRes.error;

    return { success: true, set: true };
  } catch (error) {
    return { success: false, error: error.message || 'Password setup failed' };
  }
}
