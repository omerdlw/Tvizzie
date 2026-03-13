import { ENV_FLAGS } from './env-config'

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

const BASE_PROJECT_CONFIG = {
  app: {
    name: 'Tvizzie',
  },
}

const RAW_PROJECT_CONFIG = {
  ...BASE_PROJECT_CONFIG,
  app: {
    ...BASE_PROJECT_CONFIG.app,
    env: ENV_FLAGS.appEnv,
  },
  features: {
    ...ENV_FLAGS.features,
  },
  debug: {
    registry: {
      ...ENV_FLAGS.debug.registry,
    },
  },
}

export const PROJECT_CONFIG = deepFreeze(RAW_PROJECT_CONFIG)

export function isProjectFeatureEnabled(featureKey) {
  return Boolean(PROJECT_CONFIG.features?.[featureKey])
}

export function isRegistryDebugPanelEnabled() {
  return Boolean(PROJECT_CONFIG.debug?.registry?.panel)
}

export function isRegistryHistoryCaptureEnabled() {
  return Boolean(PROJECT_CONFIG.debug?.registry?.captureHistory)
}
