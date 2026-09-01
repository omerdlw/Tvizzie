// Account adapter seam: domain clients satisfy this contract while the React
// runtime remains independent from request and persistence details.
const ACCOUNT_ADAPTER_METHOD_NAMES = Object.freeze([
  'ensureAccount',
  'getAccount',
  'getAccountByUsername',
  'getAccountIdByUsername',
  'primeAccountByUsername',
  'searchAccounts',
  'subscribeToAccount',
  'subscribeToAccountByUsername',
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

  return {
    ...Object.fromEntries(
      ACCOUNT_ADAPTER_METHOD_NAMES.map((methodName) => [
        methodName,
        (...args) => getRequiredMethod(adapter, methodName)(...args),
      ]),
    ),
    primeAccount: (userId, profile) =>
      typeof adapter.primeAccount === 'function' ? adapter.primeAccount(userId, profile) : profile,
    primeAccountByUsername: (username, profile) =>
      typeof adapter.primeAccountByUsername === 'function'
        ? adapter.primeAccountByUsername(username, profile)
        : profile,
  };
}
