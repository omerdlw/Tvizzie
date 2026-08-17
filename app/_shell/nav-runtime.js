import NotFoundAction from '@/domains/shell/navigation/action/not-found-action';
import { createConfirmationSurfaceEntry } from '@/domains/shell/navigation/surfaces/confirmation-surface';

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
  notFoundAction: NotFoundAction,
});
