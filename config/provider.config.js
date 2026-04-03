function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function resolveProvider(value, allowedValues = [], fallback) {
  const normalized = normalizeValue(value)

  if (allowedValues.includes(normalized)) {
    return normalized
  }

  return fallback
}

export function getDataProvider() {
  return resolveProvider(
    process.env.DATA_PROVIDER,
    ['supabase'],
    'supabase'
  )
}

export function getAuthProvider() {
  return resolveProvider(
    process.env.AUTH_PROVIDER,
    ['supabase'],
    'supabase'
  )
}

export function getRealtimeMode() {
  return resolveProvider(
    process.env.REALTIME_MODE,
    ['polling', 'realtime'],
    'polling'
  )
}

export function isSupabaseDataProvider() {
  return getDataProvider() === 'supabase'
}

export function isSupabaseAuthProvider() {
  return getAuthProvider() === 'supabase'
}

export function isSupabaseRealtimeEnabled() {
  return isSupabaseDataProvider() && getRealtimeMode() === 'realtime'
}

export const PROVIDER_CONFIG = Object.freeze({
  authProvider: getAuthProvider(),
  dataProvider: getDataProvider(),
  realtimeMode: getRealtimeMode(),
})
