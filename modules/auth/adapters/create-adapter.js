const ADAPTER_METHOD_NAMES = [
  'confirmPasswordReset',
  'getSession',
  'onAuthStateChange',
  'refreshSession',
  'requestPasswordReset',
  'signIn',
  'signOut',
  'signUp',
  'updateProfile',
]

export function createAuthAdapter(adapter = {}) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('createAuthAdapter requires a valid adapter object')
  }

  if (!adapter.name || typeof adapter.name !== 'string') {
    throw new Error('Auth adapter requires a string "name"')
  }

  ADAPTER_METHOD_NAMES.forEach((methodName) => {
    const method = adapter[methodName]
    if (method !== undefined && typeof method !== 'function') {
      throw new Error(`Auth adapter method "${methodName}" must be a function`)
    }
  })

  return adapter
}
