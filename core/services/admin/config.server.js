import 'server-only';

import { SUPABASE_URL } from '@/core/clients/supabase/constants';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function parseBoolean(value, fallback = false) {
  const normalized = normalizeLowerValue(value);

  if (!normalized) {
    return fallback;
  }

  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return fallback;
}

function parseCsvSet(value) {
  return new Set(
    normalizeValue(value)
      .split(',')
      .map((entry) => normalizeLowerValue(entry))
      .filter(Boolean)
  );
}

function resolveProjectRef() {
  const explicitProjectRef = normalizeValue(process.env.SUPABASE_PROJECT_REF);

  if (explicitProjectRef) {
    return explicitProjectRef;
  }

  const explicitSupabaseUrl = normalizeValue(process.env.SUPABASE_URL);

  if (explicitSupabaseUrl) {
    try {
      const hostname = new URL(explicitSupabaseUrl).hostname;
      return normalizeValue(hostname.split('.')[0] || '');
    } catch {
      // Continue fallback chain.
    }
  }

  try {
    const hostname = new URL(SUPABASE_URL).hostname;
    return normalizeValue(hostname.split('.')[0] || '');
  } catch {
    return '';
  }
}

function resolveManagementToken() {
  return (
    normalizeValue(process.env.SUPABASE_MANAGEMENT_TOKEN) ||
    normalizeValue(process.env.SUPABASE_ACCESS_TOKEN) ||
    normalizeValue(process.env.SUPABASE_PAT)
  );
}

export const ADMIN_CONFIG = Object.freeze({
  allowlistTransition: parseBoolean(process.env.ADMIN_ALLOWLIST_TRANSITION, false),
  allowlistUserIds: parseCsvSet(process.env.ADMIN_ALLOWLIST_USER_IDS),
  requiredRole: normalizeLowerValue(process.env.ADMIN_REQUIRED_ROLE) || 'admin',
  managementToken: resolveManagementToken(),
  projectRef: resolveProjectRef(),
});

export function getAdminConfigSnapshot() {
  return ADMIN_CONFIG;
}
