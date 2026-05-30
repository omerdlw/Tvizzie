function getDataErrorCode(error) {
  return typeof error?.code === 'string' ? error.code.trim().toLowerCase() : '';
}

export function isPermissionDeniedError(error) {
  const errorCode = getDataErrorCode(error);

  if (errorCode === 'permission-denied') {
    return true;
  }

  const message = typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '';

  return message.includes('missing or insufficient permissions') || message.includes('permission denied');
}

export function logDataError(message, error, options = {}) {
  const { suppressPermissionDenied = true } = options;

  if (suppressPermissionDenied && isPermissionDeniedError(error)) {
    return false;
  }

  console.error(message, error);
  return true;
}
