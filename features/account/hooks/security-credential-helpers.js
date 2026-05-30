import { logAuthAuditEvent } from '@/core/auth/clients/audit.client';
import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref } from '@/features/auth/auth-flow';

const ACCOUNT_EDIT_AUDIT_SOURCE = 'app/account/edit';

export function resetLinkedProviderOverrides({ setLinkedProviderDescriptorsOverride, setLinkedProviderIdsOverride }) {
  if (typeof setLinkedProviderIdsOverride === 'function') {
    setLinkedProviderIdsOverride(null);
  }

  if (typeof setLinkedProviderDescriptorsOverride === 'function') {
    setLinkedProviderDescriptorsOverride(null);
  }
}

export function redirectToSignInWithEmail(email = '') {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.replace(
    buildAuthHref(AUTH_ROUTES.SIGN_IN, {
      email: email || '',
    })
  );
}

export function logCredentialAuditSuccess({ email, eventType, provider = 'password', userId }) {
  logAuthAuditEvent({
    email: email || null,
    eventType,
    metadata: {
      source: ACCOUNT_EDIT_AUDIT_SOURCE,
    },
    provider,
    status: 'success',
    userId: userId || null,
  });
}

export function logCredentialAuditFailure({ action, email, error, provider = 'password', userId }) {
  logAuthAuditEvent({
    email: email || null,
    eventType: 'failed-attempt',
    metadata: {
      action,
      message: error?.message || 'Credential update failed',
      source: ACCOUNT_EDIT_AUDIT_SOURCE,
    },
    provider,
    status: 'failure',
    userId: userId || null,
  });
}

export async function signOutIfRequested(auth, result, reason) {
  if (result?.nextAction !== 'signed_out') {
    return;
  }

  await auth.signOut({ reason });
}
