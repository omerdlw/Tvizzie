export const REGISTRY_TYPES = Object.freeze({
  CONTEXT_MENU: 'CONTEXT_MENU',
  BACKGROUND: 'BACKGROUND',
  LOADING: 'LOADING',
  THEME: 'THEME',
  MODAL: 'MODAL',
  NAV: 'NAV',
  NAV_RUNTIME: 'NAV_RUNTIME',
});

export const REGISTRY_RESOLVERS = Object.freeze({
  [REGISTRY_TYPES.NAV]: 'merge',
  [REGISTRY_TYPES.NAV_RUNTIME]: 'merge',
});

const REGISTRY_TYPE_VALUES = new Set(Object.values(REGISTRY_TYPES));

export function isRegistryType(type) {
  return REGISTRY_TYPE_VALUES.has(type);
}

export const DEFAULT_SOURCE = 'dynamic';
export const DYNAMIC_SOURCE = 'dynamic';
export const HISTORY_LIMIT = 300;
