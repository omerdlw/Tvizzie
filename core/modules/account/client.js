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
]);

function resolveAccountAdapter(adapterOrConfig) {
  const candidate =
    adapterOrConfig?.adapter && typeof adapterOrConfig.adapter === 'object' ? adapterOrConfig.adapter : adapterOrConfig;

  if (!candidate || typeof candidate !== 'object') {
    throw new Error('A valid account adapter is required');
  }

  return candidate;
}

function getRequiredMethod(adapter, methodName) {
  const method = adapter?.[methodName];

  if (typeof method !== 'function') {
    throw new Error(`Account adapter method "${methodName}" is not configured`);
  }

  return method;
}

export function createAccountAdapter(adapter = {}) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('createAccountAdapter requires a valid adapter object');
  }

  ACCOUNT_ADAPTER_METHOD_NAMES.forEach((methodName) => {
    const method = adapter[methodName];

    if (method !== undefined && typeof method !== 'function') {
      throw new Error(`Account adapter method "${methodName}" must be a function`);
    }
  });

  return adapter;
}

export function createAccountClient(adapterOrConfig) {
  const adapter = resolveAccountAdapter(adapterOrConfig);

  return {
    ensureAccount(user, options = {}) {
      return getRequiredMethod(adapter, 'ensureAccount')(user, options);
    },

    getAccount(userId) {
      return getRequiredMethod(adapter, 'getAccount')(userId);
    },

    getAccountByUsername(username) {
      return getRequiredMethod(adapter, 'getAccountByUsername')(username);
    },

    getAccountIdByUsername(username) {
      return getRequiredMethod(adapter, 'getAccountIdByUsername')(username);
    },

    searchAccounts(searchTerm, options = {}) {
      return getRequiredMethod(adapter, 'searchAccounts')(searchTerm, options);
    },

    subscribeToAccount(userId, callback, options = {}) {
      return getRequiredMethod(adapter, 'subscribeToAccount')(userId, callback, options);
    },

    syncAccountEmail(payload = {}) {
      return getRequiredMethod(adapter, 'syncAccountEmail')(payload);
    },

    updateAccount(payload = {}) {
      return getRequiredMethod(adapter, 'updateAccount')(payload);
    },

    primeAccount(userId, profile) {
      const method = adapter?.primeAccount;

      if (typeof method === 'function') {
        return method(userId, profile);
      }

      return profile;
    },

    validateUsername(value) {
      return getRequiredMethod(adapter, 'validateUsername')(value);
    },
  };
}
