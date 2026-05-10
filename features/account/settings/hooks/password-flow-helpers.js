import { logAuthAuditEvent } from '@/core/auth/clients';
import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref } from '@/features/auth/utils';
import { clearAccountFeedback, emitAccountFeedback } from '../account-feedback';

export function redirectToSignIn(currentAuthEmail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.replace(
    buildAuthHref(AUTH_ROUTES.SIGN_IN, {
      email: currentAuthEmail || '',
    })
  );
}

export function startPasswordFeedback(flow) {
  emitAccountFeedback(flow, 'start');
}

export function completePasswordFeedback(flow) {
  emitAccountFeedback(flow, 'success');
}

export function clearPasswordFeedback(flow) {
  clearAccountFeedback(flow);
}

export function logPasswordAuditSuccess({ currentAuthEmail, eventType, userId }) {
  logAuthAuditEvent({
    email: currentAuthEmail || null,
    eventType,
    metadata: {
      source: 'app/account/edit',
    },
    provider: 'password',
    status: 'success',
    userId: userId || null,
  });
}

export function logPasswordAuditFailure({ action, currentAuthEmail, error, userId }) {
  logAuthAuditEvent({
    email: currentAuthEmail || null,
    eventType: 'failed-attempt',
    metadata: {
      action,
      message: error?.message || 'Password action failed',
      source: 'app/account/edit',
    },
    provider: 'password',
    status: 'failure',
    userId: userId || null,
  });
}
