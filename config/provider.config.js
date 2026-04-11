function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function resolveProvider(value, allowedValues = [], fallback) {
  const normalized = normalizeValue(value);

  if (allowedValues.includes(normalized)) {
    return normalized;
  }

  return fallback;
}

export function getDataProvider() {
  return resolveProvider(process.env.DATA_PROVIDER, ['supabase'], 'supabase');
}

export function getAuthProvider() {
  return resolveProvider(process.env.AUTH_PROVIDER, ['supabase'], 'supabase');
}

export function getRealtimeMode() {
  const resolved = resolveProvider(process.env.REALTIME_MODE, ['polling', 'sse', 'realtime', 'dual_observe'], 'realtime');

  if (resolved === 'polling') {
    return 'realtime';
  }

  return resolved;
}

export function isSupabaseDataProvider() {
  return getDataProvider() === 'supabase';
}

export function isSupabaseAuthProvider() {
  return getAuthProvider() === 'supabase';
}

export function isSupabaseRealtimeEnabled() {
  const mode = getRealtimeMode();
  return isSupabaseDataProvider() && (mode === 'realtime' || mode === 'dual_observe');
}

export const PROVIDER_CONFIG = Object.freeze({
  authProvider: getAuthProvider(),
  dataProvider: getDataProvider(),
  realtimeMode: getRealtimeMode(),
});
