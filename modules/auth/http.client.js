'use client';

import { ApiRequestError, requestJson } from '@/shared/client-request';

export class AuthRequestError extends Error {
  constructor(payload, fallbackMessage, status = 0) {
    super(payload?.error || payload?.message || fallbackMessage);
    this.name = 'AuthRequestError';
    this.code = payload?.code || null;
    this.data = payload?.data || payload || null;
    this.status = status;
  }
}

export async function requestAuthJson(
  path,
  { body, fallbackMessage = 'Authentication request failed', headers = {}, method = 'POST' } = {},
) {
  try {
    const payload = await requestJson(path, {
      body,
      fallbackMessage,
      headers,
      method,
      retryCount: 0,
    });

    if (payload?.success === false) {
      throw new AuthRequestError(payload, fallbackMessage, 200);
    }

    return payload;
  } catch (error) {
    if (error instanceof AuthRequestError) throw error;
    if (error instanceof ApiRequestError) {
      throw new AuthRequestError(error.data, fallbackMessage, error.status);
    }
    throw error;
  }
}
