'use client';

// Public Registry entry point. State operations live in operations.js so React
// adapters can depend on the implementation without importing this entry point.

const REGISTRY_METADATA_KEYS = [
  'cleanup',
  'cleanupDelayMs',
  'lifecycle',
  'priority',
  'source',
  'validation',
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Attach page-level Registry defaults while preserving feature-level overrides.
 * usePageRegistry consumes this descriptor and removes metadata before publish.
 */
export function defineRegistryConfig(config, defaults = {}) {
  if (!isObject(config) || !isObject(defaults)) return config;

  const metadata = Object.fromEntries(
    REGISTRY_METADATA_KEYS.filter((key) => defaults[key] !== undefined).map((key) => [
      key,
      defaults[key],
    ]),
  );
  if (Object.keys(metadata).length === 0) return config;

  return {
    ...config,
    registry: {
      ...metadata,
      ...(isObject(config.registry) ? config.registry : {}),
    },
  };
}

export {
  applyOperation,
  createInitialRegistries,
  createResolverCache,
  createRecordKey,
  createRegisterOperation,
  createUnregisterOperation,
  hasOperationEffect,
  isRegistryType,
  isValidRegistryTarget,
  removeSourceRecord,
  resolveEffectiveOperations,
  resolveEntryValue,
  runScopedBatch,
  toSourceRecord,
} from './operations';

export {
  DEFAULT_SOURCE,
  DYNAMIC_SOURCE,
  getRegistryDefinition,
  normalizePageRegistryConfig,
  normalizeRegistryMetadata,
  REGISTRY_DEFINITIONS,
  REGISTRY_KEYS,
  REGISTRY_LIFECYCLES,
  REGISTRY_RESOLVERS,
  REGISTRY_SOURCE_PRIORITY,
  REGISTRY_SOURCE_RANK,
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
  REGISTRY_VALIDATION_MODES,
  validateRegistryValue,
  validateRegistryMetadata,
  withRegistryMetadata,
} from './contracts';

export {
  createRegistryStore,
  RegistryProvider,
  useRegistryActions,
  useRegistryEntries,
  useRegistrySelector,
  useRegistryValue,
} from './provider';

export { applyRegistryConfig } from './config';

export {
  useBackgroundValue,
  useContextMenuRegistry,
  useContextMenuValue,
  useLoadingValue,
  useModalRegistry,
  useModalValue,
  useNavRegistry,
  useNavRegistryActions,
  useNavRuntimeRegistry,
  useNavRuntimeValue,
  useNavValue,
  usePageRegistry,
  useRegistry,
} from './hooks';

export { createRouteRegistry, RegistryBootstrap } from './bootstrap';

export {
  useBackgroundRegistration,
  useContextMenuRegistration,
  useLoadingRegistration,
  useModalRegistration,
  useNavRegistration,
} from './registrations';

export {
  clearRegistryDiagnostics,
  getRegistryDiagnostics,
  subscribeRegistryDiagnostics,
  useRegistryDiagnostics,
} from './diagnostics';
