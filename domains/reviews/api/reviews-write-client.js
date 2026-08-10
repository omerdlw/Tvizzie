'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';

export async function executeReviewWrite({ action, ...body }) {
  return requestApiJson('/api/reviews/write', {
    method: 'POST',
    body: {
      action,
      ...body,
    },
  });
}
