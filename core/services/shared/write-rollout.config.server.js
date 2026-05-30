import { createHash } from 'crypto';

import { normalizeLowerValue as normalizeValue } from '@/core/utils/string';

import { ROLLOUT_CANARY_PERCENT, ROLLOUT_DEFAULT_MODE } from './runtime-policy.constants.js';

const VALID_ROLLOUT_MODES = new Set(['legacy', 'shadow', 'edge_canary', 'edge_full']);

function hashToPercent(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return 0;
  }

  const hex = createHash('sha256').update(normalized).digest('hex').slice(0, 8);
  const numeric = Number.parseInt(hex, 16);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return numeric % 100;
}

function toMode(value, fallback = 'shadow') {
  const normalized = normalizeValue(value);

  if (VALID_ROLLOUT_MODES.has(normalized)) {
    return normalized;
  }

  return fallback;
}

function toPercent(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, parsed));
}

function parseConfigPatch(rawValue) {
  const normalized = String(rawValue || '').trim();

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return base;
  }

  return Object.entries(patch).reduce(
    (output, [key, value]) => ({
      ...output,
      [key]: value && typeof value === 'object' && !Array.isArray(value) ? deepMerge(base?.[key] || {}, value) : value,
    }),
    { ...base }
  );
}

function deepFreeze(target) {
  if (!target || typeof target !== 'object' || Object.isFrozen(target)) {
    return target;
  }

  Object.freeze(target);
  Object.values(target).forEach(deepFreeze);
  return target;
}

const BASE_ROLLOUT_CONFIG = {
  defaultMode: 'shadow',
  canaryPercent: 5,
  domains: {
    account: {
      defaultMode: 'shadow',
      endpoints: {
        'account-media-upload': {
          mode: 'edge_canary',
          canaryPercent: 10,
        },
        'account-profile-write': {
          mode: 'shadow',
          canaryPercent: 10,
        },
      },
    },
    auth: {
      defaultMode: 'shadow',
      endpoints: {
        'auth-challenge-write': {
          mode: 'shadow',
          canaryPercent: 5,
        },
      },
    },
    follows: {
      defaultMode: 'edge_canary',
      endpoints: {},
    },
    notifications: {
      defaultMode: 'edge_canary',
      endpoints: {},
    },
    reviews: {
      defaultMode: 'shadow',
      endpoints: {},
    },
  },
};

function normalizeRolloutDomains(domains = {}, defaultMode, defaultCanaryPercent) {
  return Object.fromEntries(
    Object.entries(domains).map(([domainKey, domainConfig]) => {
      const normalizedDomain = normalizeValue(domainKey);
      const rawDomainConfig = domainConfig || {};
      const domainMode = toMode(rawDomainConfig.defaultMode, defaultMode);
      const domainCanaryPercent = toPercent(rawDomainConfig.canaryPercent, defaultCanaryPercent);

      return [
        normalizedDomain,
        {
          defaultMode: domainMode,
          canaryPercent: domainCanaryPercent,
          endpoints: Object.fromEntries(
            Object.entries(rawDomainConfig.endpoints || {}).map(([endpointKey, endpointConfig]) => {
              const rawEndpointConfig = endpointConfig || {};

              return [
                normalizeValue(endpointKey),
                {
                  mode: toMode(rawEndpointConfig.mode, domainMode),
                  canaryPercent: toPercent(rawEndpointConfig.canaryPercent, domainCanaryPercent),
                },
              ];
            })
          ),
        },
      ];
    })
  );
}

function createRolloutConfig() {
  const rawConfig = deepMerge(BASE_ROLLOUT_CONFIG, parseConfigPatch(process.env.ROLLOUT_CONFIG_JSON) || {});
  const defaultMode = toMode(ROLLOUT_DEFAULT_MODE, toMode(rawConfig.defaultMode, 'shadow'));
  const canaryPercent = toPercent(ROLLOUT_CANARY_PERCENT, toPercent(rawConfig.canaryPercent, 5));

  return deepFreeze({
    defaultMode,
    canaryPercent,
    domains: normalizeRolloutDomains(rawConfig.domains || {}, defaultMode, canaryPercent),
  });
}

export const ROLLOUT_CONFIG = createRolloutConfig();

function resolveDomainConfig(domain) {
  const normalizedDomain = normalizeValue(domain);

  if (!normalizedDomain) {
    return null;
  }

  return ROLLOUT_CONFIG.domains?.[normalizedDomain] || null;
}

export function resolveWriteRolloutDecision({ domain, endpoint, userId } = {}) {
  const domainConfig = resolveDomainConfig(domain);
  const normalizedEndpoint = normalizeValue(endpoint);
  const endpointConfig = normalizedEndpoint ? domainConfig?.endpoints?.[normalizedEndpoint] || null : null;
  const defaultMode = toMode(domainConfig?.defaultMode, toMode(ROLLOUT_CONFIG.defaultMode, 'shadow'));
  const mode = toMode(endpointConfig?.mode, defaultMode);
  const canaryPercent = toPercent(endpointConfig?.canaryPercent, toPercent(domainConfig?.canaryPercent, 0));
  const userPercent = hashToPercent(userId);
  const inCanary = userPercent < canaryPercent;
  const shouldRunEdgeAuthoritative = mode === 'edge_full' || (mode === 'edge_canary' && inCanary);
  const shouldRunShadow = mode === 'shadow' || (mode === 'edge_canary' && !inCanary);

  return {
    canaryPercent,
    endpoint: normalizedEndpoint || null,
    inCanary,
    mode,
    shouldRunEdgeAuthoritative,
    shouldRunShadow,
    userPercent,
  };
}

export function isRecoverableRolloutError(error, recoverableStatuses = [408, 409, 429, 500, 502, 503, 504]) {
  const status = Number(error?.status || 0);

  if (recoverableStatuses.includes(status)) {
    return true;
  }

  const message = normalizeValue(error?.message || '');

  return (
    message.includes('timed out') ||
    message.includes('temporarily unavailable') ||
    message.includes('network') ||
    message.includes('rate limit')
  );
}
