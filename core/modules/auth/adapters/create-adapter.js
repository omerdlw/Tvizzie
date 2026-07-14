const ADAPTER_METHOD_NAMES = Object.freeze([
  'requestPasswordReset',
  'confirmPasswordReset',
  'onAuthStateChange',
  'unlinkProvider',
  'reauthenticate',
  'refreshSession',
  'updateProfile',
  'linkProvider',
  'getSession',
  'signOut',
  'signIn',
  'signUp',
]);

export function createAuthAdapter(adapter = {}) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('createAuthAdapter requires a valid adapter object');
  }

  if (typeof adapter.name !== 'string' || !adapter.name.trim()) {
    throw new Error('Auth adapter requires a non-empty string "name"');
  }

  ADAPTER_METHOD_NAMES.forEach((methodName) => {
    const method = adapter[methodName];

    if (method !== undefined && typeof method !== 'function') {
      throw new Error(`Auth adapter method "${methodName}" must be a function`);
    }
  });

  return adapter;
}
