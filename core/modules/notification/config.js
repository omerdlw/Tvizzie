import { CRITICAL_TYPES, TOAST_TYPES } from './context';

export const NOTIFICATION_CONFIG = {
  [CRITICAL_TYPES.OFFLINE]: {
    colorClass: 'border-warning bg-warning',
    dismissible: false,
  },
  [CRITICAL_TYPES.SESSION_EXPIRED]: {
    colorClass: 'border-warning bg-warning',
    dismissible: true,
  },
  [CRITICAL_TYPES.PERMISSION_DENIED]: {
    colorClass: 'border-error bg-error',
    dismissible: true,
  },
  [CRITICAL_TYPES.SERVER_ERROR]: {
    colorClass: 'border-error bg-error',
    dismissible: true,
  },
  [TOAST_TYPES.SUCCESS]: {
    colorClass: 'border-success bg-success',
    dismissible: true,
  },
  [TOAST_TYPES.ERROR]: {
    colorClass: 'border-error bg-error',
    dismissible: true,
  },
  [TOAST_TYPES.WARNING]: {
    colorClass: 'border-error bg-error',
    dismissible: true,
  },
  [TOAST_TYPES.INFO]: {
    colorClass: 'border-info bg-info',
    dismissible: true,
  },
};
