'use client';

import { requestApiJson } from '@/core/services/shared/api-request.service';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function submitFeedback({ message, source = 'context-menu' } = {}) {
  const payload = await requestApiJson('/api/feedback', {
    method: 'POST',
    body: {
      message: normalizeValue(message),
      source: normalizeValue(source) || 'context-menu',
    },
  });

  return payload?.data || null;
}
