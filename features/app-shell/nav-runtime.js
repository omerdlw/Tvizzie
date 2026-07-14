import MediaAction from '@/features/navigation/actions/media-action';
import NotFoundAction from '@/features/navigation/actions/not-found-action';
import { createConfirmationSurfaceEntry } from '@/features/navigation/surfaces/confirmation-surface';

function createGuardSurface({ message, onCancel, onConfirm }) {
  return createConfirmationSurfaceEntry({
    title: 'Warning',
    description: message,
    cancelText: 'Stay Here',
    confirmText: 'Leave Page',
    tone: 'danger',
    isDestructive: true,
    onCancel,
    onConfirm,
  });
}

export const NAV_RUNTIME = Object.freeze({
  createGuardSurface,
  mediaAction: MediaAction,
  notFoundAction: NotFoundAction,
});
