const ACCOUNT_ADAPTER_METHOD_NAMES = Object.freeze([
  'ensureAccount',
  'getAccount',
  'getAccountByUsername',
  'getAccountIdByUsername',
  'searchAccounts',
  'subscribeToAccount',
  'syncAccountEmail',
  'updateAccount',
  'validateUsername',
])

export function createAccountAdapter(adapter = {}) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('createAccountAdapter requires a valid adapter object')
  }

  ACCOUNT_ADAPTER_METHOD_NAMES.forEach((methodName) => {
    const method = adapter[methodName]

    if (method !== undefined && typeof method !== 'function') {
      throw new Error(
        `Account adapter method "${methodName}" must be a function`
      )
    }
  })

  return adapter
}
