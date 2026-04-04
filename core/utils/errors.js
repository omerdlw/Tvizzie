const PERMISSION_DENIED_CODES = new Set(['permission-denied']);

const PERMISSION_DENIED_PATTERNS = ['missing or insufficient permissions', 'permission denied'];

function normalizeErrorString(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function getDataErrorCode(error) {
  return normalizeErrorString(error?.code);
}

export function isPermissionDeniedError(error) {
  const errorCode = getDataErrorCode(error);

  if (PERMISSION_DENIED_CODES.has(errorCode)) {
    return true;
  }

  const message = normalizeErrorString(error?.message);

  return PERMISSION_DENIED_PATTERNS.some((pattern) => message.includes(pattern));
}

export function logDataError(message, error, options = {}) {
  const { suppressPermissionDenied = true } = options;

  if (suppressPermissionDenied && isPermissionDeniedError(error)) {
    return false;
  }

  console.error(message, error);
  return true;
}
