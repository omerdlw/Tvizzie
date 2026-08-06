'use server';

import { normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { verifyPasswordResetProofToken } from '../server/proof-tokens.server';

export async function completePasswordResetServer({ token, passwordResetProof, newPassword }) {
  try {
    const normToken = normalizeValue(token || passwordResetProof);
    const normNewPassword = String(newPassword || '');

    if (!normToken || !normNewPassword) {
      return { success: false, error: 'token and newPassword are required' };
    }

    const verified = verifyPasswordResetProofToken(normToken);
    const admin = createAdminClient();
    const updateRes = await admin.auth.admin.updateUserById(verified.userId, { password: normNewPassword });

    if (updateRes.error) throw updateRes.error;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Password reset failed' };
  }
}
