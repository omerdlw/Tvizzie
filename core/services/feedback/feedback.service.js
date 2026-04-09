'use client';

import { requestApiJson } from '@/core/services/shared/api-request.service';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function submitFeedback({ message, page = null, scope = 'project', source = 'context-menu' } = {}) {
  const payload = await requestApiJson('/api/feedback', {
    method: 'POST',
    body: {
      message: normalizeValue(message),
      pageDescription: normalizeValue(page?.descriptionText) || null,
      pagePath: normalizeValue(page?.path) || null,
      pageTitle: normalizeValue(page?.titleText) || null,
      scope: scope === 'page' ? 'page' : 'project',
      source: normalizeValue(source) || 'context-menu',
    },
  });

  return payload?.data || null;
}
