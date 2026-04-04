import { CRITICAL_TYPES, TOAST_TYPES } from './context';

export const NOTIFICATION_CONFIG = {
  [CRITICAL_TYPES.OFFLINE]: {
    colorClass: 'text-warning border-warning',
    dismissible: false,
  },
  [CRITICAL_TYPES.SESSION_EXPIRED]: {
    colorClass: 'text-warning border-warning',
    dismissible: true,
  },
  [CRITICAL_TYPES.PERMISSION_DENIED]: {
    colorClass: 'text-error border-error',
    dismissible: true,
  },
  [CRITICAL_TYPES.SERVER_ERROR]: {
    colorClass: 'text-error border-error',
    dismissible: true,
  },
  [TOAST_TYPES.SUCCESS]: {
    colorClass: 'text-success border-success',
    dismissible: true,
  },
  [TOAST_TYPES.ERROR]: {
    colorClass: 'text-error border-error',
    dismissible: true,
  },
  [TOAST_TYPES.WARNING]: {
    colorClass: 'text-error border-error',
    dismissible: true,
  },
  [TOAST_TYPES.INFO]: {
    colorClass: 'text-info border-info',
    dismissible: true,
  },
};
