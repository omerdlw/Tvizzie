'use client';

import { REGISTRY_METADATA_KEYS, withRegistryMetadata } from './contracts';
import { usePageRegistry } from './hooks';

// ── Feature-facing registration adapters ─────────────────────────────────────

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getMetadata(options) {
  if (!isObject(options)) return {};

  const metadata = {};
  REGISTRY_METADATA_KEYS.forEach((key) => {
    if (options[key] !== undefined) metadata[key] = options[key];
  });

  return metadata;
}

function createFeatureConfig(feature, value, options) {
  if (options?.enabled === false || value === null || value === undefined) {
    return null;
  }

  const metadata = getMetadata(options);
  const payload = Array.isArray(value)
    ? value.map((entry) => withRegistryMetadata(entry, metadata))
    : withRegistryMetadata(value, metadata);

  return {
    [feature]: payload,
  };
}

/** Register one page navigation item without exposing the registry type. */
export function useNavRegistration(config, options) {
  usePageRegistry(createFeatureConfig('nav', config, options));
}

/** Register page background state without exposing the registry type. */
export function useBackgroundRegistration(config, options) {
  usePageRegistry(createFeatureConfig('background', config, options));
}

/** Register one or more page controls without exposing the registry type. */
export function useControlsRegistration(config, options) {
  usePageRegistry(createFeatureConfig('controls', config, options));
}

/** Register page loading state with the standard graceful lifecycle. */
export function useLoadingRegistration(config, options) {
  usePageRegistry(createFeatureConfig('loading', config, options));
}

/** Register the context-menu payload for the current route. */
export function useContextMenuRegistration(config, options) {
  usePageRegistry(createFeatureConfig('contextMenu', config, options));
}

/** Register one or more modal components by their registry keys. */
export function useModalRegistration(config, options) {
  usePageRegistry(createFeatureConfig('modal', config, options));
}
