const APP_ENV = process.env.NODE_ENV || 'development'
const IS_DEVELOPMENT = APP_ENV === 'development'

function parseBooleanFlag(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()

  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false

  return fallback
}

function deepFreeze(target) {
  if (!target || typeof target !== 'object' || Object.isFrozen(target)) {
    return target
  }

  Object.freeze(target)
  Object.values(target).forEach((value) => {
    deepFreeze(value)
  })

  return target
}

const RAW_ENV_FLAGS = {
  appEnv: APP_ENV,
  features: {
    auth: parseBooleanFlag(process.env.NEXT_PUBLIC_FEATURE_AUTH, false),
    countdown: parseBooleanFlag(process.env.NEXT_PUBLIC_FEATURE_COUNTDOWN, false),
    firebase: parseBooleanFlag(process.env.NEXT_PUBLIC_FEATURE_FIREBASE, true),
  },
  debug: {
    registry: {
      panel: parseBooleanFlag(
        process.env.NEXT_PUBLIC_DEBUG_REGISTRY_PANEL,
        IS_DEVELOPMENT
      ),
      captureHistory: parseBooleanFlag(
        process.env.NEXT_PUBLIC_DEBUG_REGISTRY_CAPTURE,
        IS_DEVELOPMENT
      ),
    },
  },
}

export const ENV_FLAGS = deepFreeze(RAW_ENV_FLAGS)
