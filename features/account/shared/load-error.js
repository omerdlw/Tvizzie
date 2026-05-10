import { isPermissionDeniedError } from '@/core/utils';

export function notifyAccountLoadError(toast, error, fallbackMessage) {
  if (!toast || isPermissionDeniedError(error) || process.env.NODE_ENV === 'production') {
    return;
  }

  toast.error(error?.message || fallbackMessage);
}
