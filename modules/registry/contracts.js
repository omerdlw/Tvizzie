// ── Public Registry contracts, definitions, and metadata normalization ───────

export const REGISTRY_TYPES = Object.freeze({
  CONTEXT_MENU: 'CONTEXT_MENU',
  BACKGROUND: 'BACKGROUND',
  LOADING: 'LOADING',
  MODAL: 'MODAL',
  NAV: 'NAV',
  NAV_RUNTIME: 'NAV_RUNTIME',
});

export const REGISTRY_KEYS = Object.freeze({
  CONTEXT_MENU_CURRENT: 'current-page',
  BACKGROUND: 'page-background',
  LOADING: 'page-loading',
  NAV_RUNTIME: 'default',
});

export const DEFAULT_SOURCE = 'dynamic';
export const DYNAMIC_SOURCE = DEFAULT_SOURCE;

export const REGISTRY_SOURCES = Object.freeze({
  STATIC: 'static',
  DYNAMIC: 'dynamic',
  USER: 'user',
});

export const REGISTRY_LIFECYCLES = Object.freeze({
  IMMEDIATE: 'immediate',
  GRACEFUL: 'graceful',
  PERSISTENT: 'persistent',
  ROUTE: 'route',
});

export const REGISTRY_VALIDATION_MODES = Object.freeze({
  WARN: 'warn',
  STRICT: 'strict',
});

export const REGISTRY_RESOLVERS = Object.freeze({
  [REGISTRY_TYPES.NAV]: 'merge',
  [REGISTRY_TYPES.NAV_RUNTIME]: 'merge',
});

export const REGISTRY_DEFINITIONS = Object.freeze({
  [REGISTRY_TYPES.CONTEXT_MENU]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: 'route',
    resolver: 'priority',
    valueKind: 'object',
  }),
  [REGISTRY_TYPES.BACKGROUND]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: 'singleton',
    resolver: 'priority',
    valueKind: 'object',
  }),
  [REGISTRY_TYPES.LOADING]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.GRACEFUL,
    keyPolicy: 'singleton',
    resolver: 'priority',
    valueKind: 'object',
  }),
  [REGISTRY_TYPES.MODAL]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.IMMEDIATE,
    keyPolicy: 'named',
    resolver: 'priority',
    valueKind: 'component',
  }),
  [REGISTRY_TYPES.NAV]: Object.freeze({
    defaultCleanupDelayMs: 600,
    defaultLifecycle: REGISTRY_LIFECYCLES.ROUTE,
    keyPolicy: 'path',
    resolver: 'merge',
    valueKind: 'object',
  }),
  [REGISTRY_TYPES.NAV_RUNTIME]: Object.freeze({
    defaultCleanupDelayMs: null,
    defaultLifecycle: REGISTRY_LIFECYCLES.PERSISTENT,
    keyPolicy: 'singleton',
    resolver: 'merge',
    valueKind: 'object',
  }),
});

export function getRegistryDefinition(type) {
  return REGISTRY_DEFINITIONS[type] || null;
}

export const REGISTRY_SOURCE_PRIORITY = Object.freeze({
  [REGISTRY_SOURCES.STATIC]: 100,
  [REGISTRY_SOURCES.DYNAMIC]: 200,
  [REGISTRY_SOURCES.USER]: 300,
});

export const REGISTRY_SOURCE_RANK = Object.freeze({
  [REGISTRY_SOURCES.STATIC]: 10,
  [REGISTRY_SOURCES.DYNAMIC]: 20,
  [REGISTRY_SOURCES.USER]: 30,
});

const REGISTRY_FEATURE_KEYS = new Set([
  'background',
  'contextMenu',
  'loading',
  'modal',
  'modals',
  'nav',
]);

const REGISTRY_LIFECYCLE_VALUES = new Set(Object.values(REGISTRY_LIFECYCLES));

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveLifecycle(metadata, fallback) {
  const lifecycle = metadata?.lifecycle ?? metadata?.cleanup;
  return REGISTRY_LIFECYCLE_VALUES.has(lifecycle) ? lifecycle : fallback;
}

export function validateRegistryMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return { issues: [], valid: true };
  }

  if (!isObject(metadata)) {
    return { issues: ['registry metadata must be an object'], valid: false };
  }

  const issues = [];
  if (
    metadata.source !== undefined &&
    (typeof metadata.source !== 'string' || metadata.source.trim().length === 0)
  ) {
    issues.push('source must be a non-empty string');
  }

  if (
    metadata.instanceId !== undefined &&
    (typeof metadata.instanceId !== 'string' || metadata.instanceId.trim().length === 0)
  ) {
    issues.push('instanceId must be a non-empty string');
  }

  if (metadata.priority !== undefined && parseFiniteNumber(metadata.priority) === null) {
    issues.push('priority must be a finite number');
  }

  if (
    metadata.cleanupDelayMs !== undefined &&
    (parseFiniteNumber(metadata.cleanupDelayMs) === null || Number(metadata.cleanupDelayMs) < 0)
  ) {
    issues.push('cleanupDelayMs must be a non-negative finite number');
  }

  const lifecycle = metadata.lifecycle ?? metadata.cleanup;
  if (lifecycle !== undefined && !REGISTRY_LIFECYCLE_VALUES.has(lifecycle)) {
    issues.push(`lifecycle must be one of: ${[...REGISTRY_LIFECYCLE_VALUES].join(', ')}`);
  }

  if (
    metadata.validation !== undefined &&
    !Object.values(REGISTRY_VALIDATION_MODES).includes(metadata.validation)
  ) {
    issues.push(
      `validation must be one of: ${Object.values(REGISTRY_VALIDATION_MODES).join(', ')}`,
    );
  }

  return { issues, valid: issues.length === 0 };
}

function isRecord(value) {
  return isObject(value);
}

/**
 * Validate the value at the typed Registry seam. The store can run this in
 * warn mode for compatibility or strict mode for fail-closed registrations.
 */
export function validateRegistryValue(type, key, value) {
  const definition = getRegistryDefinition(type);
  const issues = [];

  if (!definition) {
    issues.push(`unknown registry type: ${String(type)}`);
  }
  if (typeof key !== 'string' || key.trim().length === 0) {
    issues.push('key must be a non-empty string');
  }

  if (definition?.valueKind === 'object' && !isRecord(value)) {
    issues.push(`${type} values must be plain objects`);
  }
  if (definition?.valueKind === 'component' && typeof value !== 'function' && !isRecord(value)) {
    issues.push(`${type} values must be component functions or component objects`);
  }

  return { issues, valid: issues.length === 0 };
}

export function normalizeRegistryMetadata(
  metadata,
  { defaultCleanupDelayMs = null, defaultLifecycle = null, defaultSource = DEFAULT_SOURCE } = {},
) {
  const registryMeta = isObject(metadata) ? metadata : {};
  const normalizedDefaultDelay = parseFiniteNumber(defaultCleanupDelayMs);
  const fallbackCleanupDelayMs =
    normalizedDefaultDelay !== null && normalizedDefaultDelay >= 0 ? normalizedDefaultDelay : null;
  const fallbackLifecycle = REGISTRY_LIFECYCLE_VALUES.has(defaultLifecycle)
    ? defaultLifecycle
    : null;
  const source =
    typeof registryMeta.source === 'string' && registryMeta.source.length > 0
      ? registryMeta.source
      : typeof defaultSource === 'string' && defaultSource.length > 0
        ? defaultSource
        : DEFAULT_SOURCE;
  const priority = parseFiniteNumber(registryMeta.priority);
  const lifecycle = resolveLifecycle(registryMeta, fallbackLifecycle);
  const validation = Object.values(REGISTRY_VALIDATION_MODES).includes(registryMeta.validation)
    ? registryMeta.validation
    : null;
  const cleanupDelayCandidate = parseFiniteNumber(registryMeta.cleanupDelayMs);

  let cleanupDelayMs =
    cleanupDelayCandidate !== null && cleanupDelayCandidate >= 0
      ? cleanupDelayCandidate
      : fallbackCleanupDelayMs;

  if (lifecycle === REGISTRY_LIFECYCLES.IMMEDIATE) {
    cleanupDelayMs = 0;
  } else if (
    (lifecycle === REGISTRY_LIFECYCLES.GRACEFUL || lifecycle === REGISTRY_LIFECYCLES.ROUTE) &&
    cleanupDelayMs === null
  ) {
    cleanupDelayMs = fallbackCleanupDelayMs;
  }

  return {
    cleanupDelayMs,
    lifecycle,
    priority,
    registerOptions: {
      ...(priority === null ? {} : { priority }),
      ...(validation === REGISTRY_VALIDATION_MODES.STRICT ? { validation } : {}),
    },
    source,
    ...(validation ? { validation } : {}),
  };
}

export function withRegistryMetadata(value, metadata) {
  if (!isObject(value) || !isObject(metadata) || Object.keys(metadata).length === 0) {
    return value;
  }

  const currentMetadata = isObject(value.registry) ? value.registry : {};
  return {
    ...value,
    registry: {
      ...metadata,
      ...currentMetadata,
    },
  };
}

export function normalizePageRegistryConfig(config) {
  if (!isObject(config) || !isObject(config.registry)) {
    return config;
  }

  const pageMetadata = config.registry;
  const normalizedConfig = {};

  Object.entries(config).forEach(([key, value]) => {
    if (key === 'registry') return;

    if (!REGISTRY_FEATURE_KEYS.has(key)) {
      normalizedConfig[key] = value;
      return;
    }

    if (Array.isArray(value)) {
      normalizedConfig[key] = value.map((entry) => withRegistryMetadata(entry, pageMetadata));
      return;
    }

    normalizedConfig[key] = withRegistryMetadata(value, pageMetadata);
  });

  return normalizedConfig;
}
