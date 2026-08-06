'use server';

import { createAdminClient } from '@/infrastructure/supabase/admin';
import { executeReviewWriteAction } from '../server/reviews-write-actions';
import { normalizePayloadObject, normalizeValue } from '../server/reviews-write-shared';

export async function executeReviewWriteServer({ action, userId, ...body }) {
  try {
    const normAction = normalizeValue(action);
    if (!normAction) {
      return { success: false, error: 'action is required' };
    }

    const admin = createAdminClient();
    const result = await executeReviewWriteAction({
      action: normAction,
      admin,
      body,
      userId,
    });

    return {
      success: true,
      result,
      source: 'authoritative',
      ...normalizePayloadObject(result),
    };
  } catch (error) {
    return { success: false, error: error.message || 'Review write failed' };
  }
}
