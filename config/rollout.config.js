function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function parsePercent(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < 0) {
    return 0;
  }

  if (parsed > 100) {
    return 100;
  }

  return parsed;
}

function parseMode(value, fallback = 'shadow') {
  const normalized = normalizeValue(value);
  const validModes = new Set(['legacy', 'shadow', 'edge_canary', 'edge_full']);

  if (validModes.has(normalized)) {
    return normalized;
  }

  return fallback;
}

function parseConfigPatch(rawValue) {
  const normalized = String(rawValue || '').trim();

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return base;
  }

  const output = {
    ...base,
  };

  Object.entries(patch).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = deepMerge(base?.[key] || {}, value);
      return;
    }

    output[key] = value;
  });

  return output;
}

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

const ENV_PATCH = parseConfigPatch(process.env.ROLLOUT_CONFIG_JSON);
const RAW_ROLLOUT_CONFIG = deepMerge(BASE_ROLLOUT_CONFIG, ENV_PATCH || {});

const normalizedDefaultMode = parseMode(process.env.ROLLOUT_DEFAULT_MODE, RAW_ROLLOUT_CONFIG.defaultMode || 'shadow');

const normalizedCanaryPercent = parsePercent(
  process.env.ROLLOUT_CANARY_PERCENT,
  parsePercent(RAW_ROLLOUT_CONFIG.canaryPercent, 5)
);

const normalizedDomains = Object.fromEntries(
  Object.entries(RAW_ROLLOUT_CONFIG.domains || {}).map(([domainKey, domainConfig]) => {
    const normalizedDomain = normalizeValue(domainKey);
    const rawDomainConfig = domainConfig || {};

    const normalizedEndpoints = Object.fromEntries(
      Object.entries(rawDomainConfig.endpoints || {}).map(([endpointKey, endpointConfig]) => {
        const normalizedEndpoint = normalizeValue(endpointKey);
        const rawEndpointConfig = endpointConfig || {};

        return [
          normalizedEndpoint,
          {
            mode: parseMode(rawEndpointConfig.mode, parseMode(rawDomainConfig.defaultMode, normalizedDefaultMode)),
            canaryPercent: parsePercent(rawEndpointConfig.canaryPercent, normalizedCanaryPercent),
          },
        ];
      })
    );

    return [
      normalizedDomain,
      {
        defaultMode: parseMode(rawDomainConfig.defaultMode, normalizedDefaultMode),
        canaryPercent: parsePercent(rawDomainConfig.canaryPercent, normalizedCanaryPercent),
        endpoints: normalizedEndpoints,
      },
    ];
  })
);

export const ROLLOUT_CONFIG = deepFreeze({
  defaultMode: normalizedDefaultMode,
  canaryPercent: normalizedCanaryPercent,
  domains: normalizedDomains,
});

export function getRolloutConfigSnapshot() {
  return ROLLOUT_CONFIG;
}
