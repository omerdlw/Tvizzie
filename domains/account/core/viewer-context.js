import 'server-only';

import { resolveOptionalSessionRequest } from '@/domains/auth/server/session';

function toOptionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function toAccountViewer(sessionContext) {
  const id = toOptionalString(sessionContext?.userId);
  if (!id) return null;

  return Object.freeze({
    email: toOptionalString(sessionContext?.email),
    id,
    sessionId: toOptionalString(sessionContext?.sessionJti),
  });
}

export async function resolveAccountViewer(request) {
  const sessionContext = await resolveOptionalSessionRequest(request);
  return toAccountViewer(sessionContext);
}
