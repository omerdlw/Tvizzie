export const EMPTY_OBJECT = Object.freeze({});

const DEFAULT_ACCOUNT_BOOTSTRAP_CONFIG = Object.freeze({
  clearPayload: null,
  resolvePayload: null,
});

export const DEFAULT_ACCOUNT_CONFIG = Object.freeze({
  adapter: null,
  autoBootstrap: true,
  autoSubscribeCurrentAccount: true,
  bootstrap: DEFAULT_ACCOUNT_BOOTSTRAP_CONFIG,
  debug: false,
});

export const DEFAULT_ACCOUNT_STATE = Object.freeze({
  currentAccount: null,
  error: null,
  isBootstrapping: false,
  isLoading: true,
  isReady: false,
  lastUpdatedAt: null,
});

export const CURRENT_ACCOUNT_SUBSCRIPTION_INTERVAL_MS = 15000;
export const CURRENT_ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 60000;

export const FALLBACK_ACCOUNT_ACTIONS = Object.freeze({
  clearError: () => {},
  ensureCurrentAccount: async () => null,
  refreshCurrentAccount: async () => null,
  syncCurrentAccountEmail: async () => null,
  updateCurrentAccount: async () => null,
});

export function toAccountError(error, fallbackMessage) {
  if (error instanceof Error) {
    return error;
  }

  const normalizedError = new Error(error?.message || fallbackMessage || 'Account request failed');

  normalizedError.name = error?.name || 'AccountError';
  normalizedError.status = error?.status || 0;
  normalizedError.data = error?.data || null;

  return normalizedError;
}

export function createResolvedConfig(config = EMPTY_OBJECT) {
  const providedBootstrap = config?.bootstrap && typeof config.bootstrap === 'object' ? config.bootstrap : EMPTY_OBJECT;

  return {
    ...DEFAULT_ACCOUNT_CONFIG,
    ...config,
    bootstrap: {
      ...DEFAULT_ACCOUNT_CONFIG.bootstrap,
      ...providedBootstrap,
    },
  };
}
