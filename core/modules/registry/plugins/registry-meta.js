function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function splitRegistryConfig(config, options = {}) {
  const { defaultCleanupDelayMs = null, defaultSource = 'dynamic' } = options;

  const registryMeta = isObject(config) && isObject(config.registry) ? config.registry : {};

  const source = typeof registryMeta.source === 'string' ? registryMeta.source : defaultSource;

  const registerOptions = {};
  const priority = parseFiniteNumber(registryMeta.priority);
  if (priority !== null) {
    registerOptions.priority = priority;
  }

  const ttlMs = parseFiniteNumber(registryMeta.ttlMs);
  if (ttlMs !== null && ttlMs > 0) {
    registerOptions.ttlMs = ttlMs;
  }

  const cleanupDelayMsCandidate = parseFiniteNumber(registryMeta.cleanupDelayMs);
  const cleanupDelayMs =
    cleanupDelayMsCandidate !== null && cleanupDelayMsCandidate >= 0 ? cleanupDelayMsCandidate : defaultCleanupDelayMs;

  const payload = isObject(config)
    ? Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'registry'))
    : config;

  return { cleanupDelayMs, payload, registerOptions, source };
}
