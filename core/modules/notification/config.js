import { CRITICAL_TYPES, TOAST_TYPES } from './context'

export const NOTIFICATION_CONFIG = {
  [CRITICAL_TYPES.OFFLINE]: {
    colorClass: 'warning-classes bg-black/50! hover:bg-black/20!',
    dismissible: false,
  },
  [CRITICAL_TYPES.SESSION_EXPIRED]: {
    colorClass: 'error-classes bg-black/50! hover:bg-black/20!',
    dismissible: true,
  },
  [CRITICAL_TYPES.PERMISSION_DENIED]: {
    colorClass: 'error-classes bg-black/50! hover:bg-black/20!',
    dismissible: true,
  },
  [CRITICAL_TYPES.SERVER_ERROR]: {
    colorClass: 'error-classes bg-black/50! hover:bg-black/20!',
    dismissible: true,
  },
  [TOAST_TYPES.SUCCESS]: {
    colorClass: 'success-classes bg-black/50! hover:bg-black/20!',
    dismissible: true,
  },
  [TOAST_TYPES.ERROR]: {
    colorClass: 'error-classes bg-black/50! hover:bg-black/20!',
    dismissible: true,
  },
  [TOAST_TYPES.WARNING]: {
    colorClass: 'warning-classes bg-black/50! hover:bg-black/20!',
    dismissible: true,
  },
  [TOAST_TYPES.INFO]: {
    colorClass: 'info-classes bg-black/50! hover:bg-black/20!',
    dismissible: true,
  },
}
