import 'server-only';

import { createHash } from 'crypto';

import { createAdminClient } from '@/infrastructure/supabase/server';
import { normalizeValue } from '@/shared';

function normalizeUuid(value) {
  const normalized = normalizeValue(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null;
}

function hashUserId(userId) {
  const normalized = normalizeUuid(userId);
  return normalized ? createHash('sha256').update(normalized).digest('hex') : null;
}

function normalizeSession(row = {}) {
  return {
    id: normalizeValue(row.session_id || row.id) || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    refreshedAt: row.refreshed_at || null,
    userAgent: normalizeValue(row.user_agent) || null,
    ip: normalizeValue(row.ip) || null,
    aal: normalizeValue(row.aal) || 'aal1',
    isCurrent: Boolean(row.is_current),
  };
}

export async function listAuthSessions({ userId, currentSessionId }) {
  const normalizedUserId = normalizeUuid(userId);
  if (!normalizedUserId) throw new Error('Valid User ID UUID is required');

  const result = await createAdminClient().rpc('list_auth_sessions', {
    p_current_session_id: normalizeUuid(currentSessionId),
    p_user_id: normalizedUserId,
  });
  if (result.error) throw new Error(result.error.message || 'Sessions could not be loaded');

  return (Array.isArray(result.data) ? result.data : []).map(normalizeSession);
}

export async function revokeAuthSession({ userId, sessionId, currentSessionId, reason }) {
  const normalizedUserId = normalizeUuid(userId);
  const normalizedSessionId = normalizeUuid(sessionId);
  if (!normalizedUserId || !normalizedSessionId) {
    throw new Error('A valid session is required');
  }

  const result = await createAdminClient().rpc('revoke_auth_session', {
    p_current_session_id: normalizeUuid(currentSessionId),
    p_reason: normalizeValue(reason) || 'user-session-revoke',
    p_session_id: normalizedSessionId,
    p_user_id: normalizedUserId,
  });
  if (result.error) throw new Error(result.error.message || 'Session could not be revoked');

  return Boolean(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function recordAuthMetric({
  deviceHash = null,
  eventName,
  metadata = {},
  outcome = 'success',
  provider = null,
  purpose = null,
  userId = null,
} = {}) {
  try {
    const normalizedEventName = normalizeValue(eventName).slice(0, 80);
    if (!normalizedEventName) return false;

    const result = await createAdminClient()
      .from('auth_metric_events')
      .insert({
        device_hash: normalizeValue(deviceHash) || null,
        event_name: normalizedEventName,
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
        outcome: normalizeValue(outcome).slice(0, 64) || 'success',
        provider: normalizeValue(provider).slice(0, 64) || null,
        purpose: normalizeValue(purpose).slice(0, 64) || null,
        user_id_hash: hashUserId(userId),
      });
    return !result.error;
  } catch {
    return false;
  }
}

export async function claimAuthSecurityNotification({ dedupeKey, eventType, userId }) {
  const normalizedUserId = normalizeUuid(userId);
  const normalizedDedupeKey = normalizeValue(dedupeKey);
  if (!normalizedUserId || !normalizedDedupeKey) return false;

  const result = await createAdminClient().rpc('claim_auth_security_notification', {
    p_dedupe_key: normalizedDedupeKey,
    p_event_type: normalizeValue(eventType) || 'security',
    p_user_id: normalizedUserId,
  });
  if (result.error) throw new Error(result.error.message || 'Notification claim failed');
  return Boolean(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function hasVerifiedMfaFactor(userId) {
  const normalizedUserId = normalizeUuid(userId);
  if (!normalizedUserId) return false;
  const result = await createAdminClient().rpc('has_verified_mfa_factor', {
    p_user_id: normalizedUserId,
  });
  if (result.error) throw new Error(result.error.message || 'MFA status could not be loaded');
  return Boolean(Array.isArray(result.data) ? result.data[0] : result.data);
}

export async function requireHighRiskAal2(session) {
  if (normalizeValue(process.env.AUTH_REQUIRE_AAL2_FOR_HIGH_RISK).toLowerCase() !== 'true') {
    return session;
  }

  const hasFactor = await hasVerifiedMfaFactor(session?.userId);
  if (!hasFactor) return session;

  const aal = normalizeValue(session?.decodedToken?.aal).toLowerCase();
  if (aal === 'aal2') return session;

  const error = new Error('AAL2 verification is required for this security action');
  error.code = 'MFA_REQUIRED';
  error.status = 403;
  throw error;
}

export function getSessionDeviceLabel(userAgent) {
  const value = normalizeValue(userAgent);
  if (!value) return 'Unknown device';
  if (/iphone|ipad|ipod/i.test(value)) return 'iPhone or iPad';
  if (/android/i.test(value)) return 'Android device';
  if (/macintosh|mac os/i.test(value)) return 'Mac';
  if (/windows/i.test(value)) return 'Windows PC';
  if (/linux/i.test(value)) return 'Linux device';
  return 'Browser session';
}
