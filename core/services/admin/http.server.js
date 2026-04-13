import 'server-only';

import { createAdminErrorEnvelope } from './response.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeStatus(error, fallback = 500) {
  const explicitStatus = Number(error?.status || 0);

  if (Number.isFinite(explicitStatus) && explicitStatus > 0) {
    return explicitStatus;
  }

  const message = normalizeValue(error?.message).toLowerCase();

  if (message.includes('authentication') || message.includes('unauthorized')) {
    return 401;
  }

  if (message.includes('forbidden') || message.includes('access')) {
    return 403;
  }

  return fallback;
}

export function createAdminRouteErrorResponse(error, { source = 'admin', fallbackStatus = 500 } = {}) {
  const status = normalizeStatus(error, fallbackStatus);

  const payload = createAdminErrorEnvelope({
    code:
      normalizeValue(error?.code) ||
      (status === 401 ? 'ADMIN_UNAUTHORIZED' : status === 403 ? 'ADMIN_FORBIDDEN' : 'ADMIN_INTERNAL_ERROR'),
    message: normalizeValue(error?.message) || 'Admin request failed',
    partial: false,
    source: normalizeValue(error?.source) || source,
  });

  return {
    payload,
    status,
  };
}

