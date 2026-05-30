import { normalizeValue } from '@/core/utils/string';

function warnOnce(globalKey, message) {
  if (globalThis[globalKey]) {
    return;
  }

  globalThis[globalKey] = true;
  console.warn(message);
}

export function resolveSecretWithFallback({
  primaryEnvName,
  fallbackEnvNames = [],
  missingMessage,
  warningGlobalKey,
  warningMessage,
}) {
  const primarySecret = normalizeValue(process.env[primaryEnvName]);

  if (primarySecret) {
    return primarySecret;
  }

  for (const envName of fallbackEnvNames) {
    const fallbackSecret = normalizeValue(process.env[envName]);

    if (fallbackSecret) {
      if (warningGlobalKey && warningMessage) {
        warnOnce(warningGlobalKey, warningMessage);
      }

      return fallbackSecret;
    }
  }

  throw new Error(missingMessage);
}
