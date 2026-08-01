import MediaAction from '@/app/_shell/navigation/media-action';
import NotFoundAction from '@/ui/feedback/not-found-action';
import { createConfirmationSurfaceEntry } from '@/ui/feedback/confirmation-surface';

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
