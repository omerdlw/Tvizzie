import { CRITICAL_TYPES, TOAST_TYPES } from './context'

export const NOTIFICATION_CONFIG = {
  [CRITICAL_TYPES.OFFLINE]: {
    description: 'You are offline. Some features may not be available.',
    title: 'No Internet Connection',
    colorClass: 'text-warning',
    icon: 'solar:home-wifi-bold',
    dismissible: false,
  },
  [CRITICAL_TYPES.SESSION_EXPIRED]: {
    description: 'Your session has expired. Please sign in again.',
    colorClass: 'text-error',
    title: 'Session Expired',
    icon: 'solar:lock-linear',
    dismissible: true,
  },
  [CRITICAL_TYPES.PERMISSION_DENIED]: {
    description: "You don't have permission to perform this action.",
    icon: 'solar:forbidden-bold',
    colorClass: 'text-error',
    title: 'Permission Denied',
    dismissible: true,
  },
  [CRITICAL_TYPES.SERVER_ERROR]: {
    description: 'Something went wrong on the server. Please try again.',
    icon: 'solar:danger-circle-linear',
    colorClass: 'text-error',
    title: 'Server Error',
    dismissible: true,
  },
  [TOAST_TYPES.SUCCESS]: {
    description: 'Operation completed successfully.',
    icon: 'solar:check-circle-bold',
    colorClass: 'text-success',
    title: 'Success',
    dismissible: true,
  },
  [TOAST_TYPES.ERROR]: {
    description: 'Something went wrong.',
    icon: 'solar:danger-circle-bold',
    colorClass: 'text-error',
    title: 'Error',
    dismissible: true,
  },
  [TOAST_TYPES.WARNING]: {
    description: 'Please proceed with caution.',
    icon: 'solar:shield-warning-bold',
    colorClass: 'text-warning',
    title: 'Warning',
    dismissible: true,
  },
  [TOAST_TYPES.INFO]: {
    description: 'Here is some useful information.',
    icon: 'solar:info-circle-bold',
    colorClass: 'text-info',
    title: 'Information',
    dismissible: true,
  },
}
