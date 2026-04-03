'use client'

const DEFAULT_ACCOUNT_BOOTSTRAP_CONFIG = Object.freeze({
  clearPayload: null,
  resolvePayload: null,
})

export const DEFAULT_ACCOUNT_CONFIG = Object.freeze({
  adapter: null,
  autoBootstrap: true,
  autoSubscribeCurrentAccount: true,
  bootstrap: DEFAULT_ACCOUNT_BOOTSTRAP_CONFIG,
  debug: false,
})

export const DEFAULT_ACCOUNT_STATE = Object.freeze({
  currentAccount: null,
  error: null,
  isBootstrapping: false,
  isLoading: true,
  isReady: false,
  lastUpdatedAt: null,
})
