'use client';

export const ACCOUNT_LOADING_NAV_PRIORITY = 190;
export const ACCOUNT_LOADING_NAV_CLEANUP_DELAY_MS = 8000;

export const EMPTY_ACCOUNT_REGISTRY_AUTH = Object.freeze({
  isAuthenticated: false,
});

export function noopAccountRegistryHandler() {}

export function buildAccountLoadingState({ isLoading = false, navRegistrySource }) {
  return {
    isLoading,
    showOverlay: false,
    registry: navRegistrySource
      ? {
          source: navRegistrySource,
        }
      : undefined,
  };
}
