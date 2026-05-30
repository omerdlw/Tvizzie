import { toLowercase } from './session.shared';

export function normalizeSupabaseError(error) {
  const message = toLowercase(error?.message);

  if (
    message.includes('jwt') &&
    (message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('malformed') ||
      message.includes('not found'))
  ) {
    return new Error('Invalid or expired authentication token');
  }

  if (message.includes('session') && (message.includes('missing') || message.includes('not found'))) {
    return new Error('Authentication session is required');
  }

  return error;
}

export function isTransientNetworkError(error) {
  const message = toLowercase(error?.message);
  const cause = toLowercase(error?.cause?.message || error?.cause?.code);

  return (
    message.includes('fetch failed') ||
    message.includes('connect timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network request failed') ||
    cause.includes('connect timeout') ||
    cause.includes('und_err_connect_timeout')
  );
}

export function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Supabase session fetch timed out'));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function isTransientSessionError(error) {
  const message = toLowercase(error?.message);

  return isTransientNetworkError(error) || message.includes('supabase session fetch timed out');
}
