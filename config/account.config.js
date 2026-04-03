import {
  clearPendingAccountBootstrap,
  getPendingAccountBootstrap,
} from '@/core/auth/clients/pending-account.client'
import { createAccountAdapter, createAccountClient } from '@/core/modules/account'
import {
  ensureUserAccount,
  getUserAccount,
  getUserAccountByUsername,
  getUserIdByUsername,
  primeUserAccount,
  searchUserAccounts,
  subscribeToUserAccount,
  syncUserAccountEmail,
  updateUserAccount,
  validateUsername,
} from '@/core/services/account/account.service'

function isFreshEmailPasswordSession(user) {
  const providerIds = Array.isArray(user?.metadata?.providerIds)
    ? user.metadata.providerIds
    : []
  const createdAt = Date.parse(user?.metadata?.creationTime || '')
  const lastSignInAt = Date.parse(user?.metadata?.lastSignInTime || '')

  if (!providerIds.includes('password')) {
    return false
  }

  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) {
    return false
  }

  return Math.abs(lastSignInAt - createdAt) <= 60 * 1000
}

function resolveBootstrapPayload(user = null) {
  if (!isFreshEmailPasswordSession(user)) {
    return null
  }

  return getPendingAccountBootstrap(user)
}

export const ACCOUNT_ADAPTER = createAccountAdapter({
  ensureAccount: ensureUserAccount,
  getAccount: getUserAccount,
  getAccountByUsername: getUserAccountByUsername,
  getAccountIdByUsername: getUserIdByUsername,
  primeAccount: primeUserAccount,
  searchAccounts: searchUserAccounts,
  subscribeToAccount: subscribeToUserAccount,
  syncAccountEmail: syncUserAccountEmail,
  updateAccount: updateUserAccount,
  validateUsername,
})

export const ACCOUNT_CLIENT = createAccountClient(ACCOUNT_ADAPTER)

export const ACCOUNT_CONFIG = {
  adapter: ACCOUNT_ADAPTER,
  autoBootstrap: true,
  autoSubscribeCurrentAccount: true,
  bootstrap: {
    clearPayload: clearPendingAccountBootstrap,
    resolvePayload: resolveBootstrapPayload,
  },
}
