'use client';

import { normalizeValue } from '@/domains/shell/shared/utils';
import { createAuthenticatedDataClient } from '@/infrastructure/supabase/supabase-client';

export function getSupabaseClient() {
  return createAuthenticatedDataClient();
}

export function normalizeSupabaseError(error, fallbackMessage) {
  const message =
    normalizeValue(error?.message) ||
    normalizeValue(error?.error_description) ||
    normalizeValue(fallbackMessage) ||
    'Supabase request failed';
  const normalized = new Error(message);

  normalized.name = error?.name || 'SupabaseError';
  normalized.code = normalizeValue(error?.code || '') || null;
  normalized.status = Number(error?.status) || 0;
  normalized.data = error || null;

  return normalized;
}

export function assertSupabaseResult(result, fallbackMessage) {
  if (result?.error) {
    throw normalizeSupabaseError(result.error, fallbackMessage);
  }

  return result;
}

export function toIsoTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
