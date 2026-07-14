import { CRITICAL_TYPES, TOAST_TYPES } from './context';

export const NOTIFICATION_CONFIG = Object.freeze({
  [CRITICAL_TYPES.OFFLINE]: {
    colorClass: 'bg-primary text-warning',
    dismissible: false,
  },
  [CRITICAL_TYPES.SESSION_EXPIRED]: {
    colorClass: 'bg-primary text-warning',
    dismissible: true,
  },
  [CRITICAL_TYPES.PERMISSION_DENIED]: {
    colorClass: 'bg-primary text-error',
    dismissible: true,
  },
  [CRITICAL_TYPES.SERVER_ERROR]: {
    colorClass: 'bg-primary text-error',
    dismissible: true,
  },
  [TOAST_TYPES.SUCCESS]: {
    colorClass: 'bg-primary text-success',
    dismissible: true,
  },
  [TOAST_TYPES.ERROR]: {
    colorClass: 'bg-primary text-error',
    dismissible: true,
  },
  [TOAST_TYPES.WARNING]: {
    colorClass: 'bg-primary text-error',
    dismissible: true,
  },
  [TOAST_TYPES.INFO]: {
    colorClass: 'bg-primary text-info',
    dismissible: true,
  },
});
