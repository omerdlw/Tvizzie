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
    adapterOrConfig?.adapter && typeof adapterOrConfig.adapter === 'object'
      ? adapterOrConfig.adapter
      : adapterOrConfig;

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

  const client = {};

  // Dynamically map standard required adapter methods
  ACCOUNT_ADAPTER_METHOD_NAMES.forEach((methodName) => {
    client[methodName] = (...args) => getRequiredMethod(adapter, methodName)(...args);
  });

  // Optional method with default fallback
  client.primeAccount = (userId, profile) => {
    if (typeof adapter?.primeAccount === 'function') {
      return adapter.primeAccount(userId, profile);
    }
    return profile;
  };

  return client;
}
