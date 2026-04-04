function deepFreeze(target) {
  if (!target || typeof target !== 'object' || Object.isFrozen(target)) {
    return target;
  }

  Object.freeze(target);
  Object.values(target).forEach((value) => {
    deepFreeze(value);
  });

  return target;
}

const BASE_PROJECT_CONFIG = {
  app: {
    name: 'Tvizzie',
    env: process.env.NODE_ENV || 'development',
  },
  features: {
    auth: true,
    countdown: false,
    supabase: true,
    media_social_proof: true,
    social_follows: true,
  },
  debug: {
    registry: {
      panel: false,
      captureHistory: false,
    },
  },
};

const RAW_PROJECT_CONFIG = BASE_PROJECT_CONFIG;

export const PROJECT_CONFIG = deepFreeze(RAW_PROJECT_CONFIG);

export function isProjectFeatureEnabled(featureKey) {
  return Boolean(PROJECT_CONFIG.features?.[featureKey]);
}

export function isRegistryDebugPanelEnabled() {
  return Boolean(PROJECT_CONFIG.debug?.registry?.panel);
}

export function isRegistryHistoryCaptureEnabled() {
  return Boolean(PROJECT_CONFIG.debug?.registry?.captureHistory);
}
