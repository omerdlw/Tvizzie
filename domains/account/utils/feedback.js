import { EVENT_TYPES, globalEvents } from '@/shared';
import { isPermissionDeniedError } from './validation.js';

const DEFAULT_ACCOUNT_FEEDBACK_PRIORITY = 112;
const DEFAULT_ACCOUNT_FEEDBACK_THEME_TYPE = 'LOGIN';

export const ACCOUNT_FEEDBACK_CONFIG = Object.freeze({
  'account-delete': Object.freeze({
    description: 'Deleting account and removing active access',
    icon: 'solar:danger-triangle-bold',
    statusType: 'ACCOUNT_DELETE',
    successDescription: 'Account deleted successfully',
    successTitle: 'Account Deleted',
    title: 'Deleting Account',
  }),
  'account-update': Object.freeze({
    description: 'Saving profile changes',
    icon: 'solar:user-circle-bold',
    statusType: 'ACCOUNT_UPDATE',
    successDescription: 'Profile changes saved',
    successTitle: 'Account Updated',
    title: 'Updating Account',
  }),
  'email-change': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:letter-bold',
    statusType: 'EMAIL_CHANGE',
    successDescription: 'Please sign in again with your new email',
    successTitle: 'Email Updated',
    title: 'Updating Email',
  }),
  'email-update': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:letter-bold',
    statusType: 'EMAIL_CHANGE',
    successDescription: 'Please sign in again with your new email',
    successTitle: 'Email Updated',
    title: 'Updating Email',
  }),
  'google-link': Object.freeze({
    description: 'Preparing secure provider connection',
    icon: 'flat-color-icons:google',
    statusType: 'GOOGLE_LINK',
    successDescription: 'Google sign-in is now linked to this account',
    successTitle: 'Google Linked',
    title: 'Linking Google',
  }),
  'provider-link': Object.freeze({
    description: 'Preparing secure provider connection',
    icon: 'solar:link-bold',
    statusType: 'PROVIDER_LINK',
    successDescription: 'Provider connected to this account',
    successTitle: 'Provider Connected',
    title: 'Connecting Provider',
  }),
  'provider-unlink': Object.freeze({
    description: 'Removing provider connection',
    icon: 'solar:link-broken-bold',
    statusType: 'PROVIDER_UNLINK',
    successDescription: 'Provider disconnected from this account',
    successTitle: 'Provider Disconnected',
    title: 'Disconnecting Provider',
  }),
  'passkey-add': Object.freeze({
    description: 'Waiting for passkey confirmation',
    icon: 'solar:key-bold',
    statusType: 'PASSKEY_ADD',
    successDescription: 'Passkey added to this account',
    successTitle: 'Passkey Added',
    title: 'Adding Passkey',
  }),
  'passkey-remove': Object.freeze({
    description: 'Removing passkey from this account',
    icon: 'solar:key-bold',
    statusType: 'PASSKEY_REMOVE',
    successDescription: 'Passkey removed from this account',
    successTitle: 'Passkey Removed',
    title: 'Removing Passkey',
  }),
  'passkey-rename': Object.freeze({
    description: 'Saving passkey name',
    icon: 'solar:key-bold',
    statusType: 'PASSKEY_RENAME',
    successDescription: 'Passkey name saved',
    successTitle: 'Passkey Renamed',
    title: 'Renaming Passkey',
  }),
  'mfa-enroll': Object.freeze({
    description: 'Preparing authenticator setup',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'MFA_ENROLL',
    successDescription: 'Authenticator enabled for this account',
    successTitle: 'Authenticator Enabled',
    title: 'Setting Up Authenticator',
  }),
  'mfa-remove': Object.freeze({
    description: 'Removing authenticator protection',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'MFA_REMOVE',
    successDescription: 'Authenticator removed from this account',
    successTitle: 'Authenticator Removed',
    title: 'Removing Authenticator',
  }),
  'session-revoke': Object.freeze({
    description: 'Revoking selected session',
    icon: 'solar:monitor-smartphone-bold',
    statusType: 'SESSION_REVOKE',
    successDescription: 'Session revoked',
    successTitle: 'Session Revoked',
    title: 'Revoking Session',
  }),
  'session-revoke-others': Object.freeze({
    description: 'Signing out other active sessions',
    icon: 'solar:monitor-smartphone-bold',
    statusType: 'SESSION_REVOKE_OTHERS',
    successDescription: 'Other sessions signed out',
    successTitle: 'Sessions Revoked',
    title: 'Revoking Other Sessions',
  }),
});

function resolveAccountFeedbackConfig(flow) {
  return (
    ACCOUNT_FEEDBACK_CONFIG[
      String(flow || '')
        .trim()
        .toLowerCase()
    ] || {}
  );
}

export function notifyAccountLoadError(toast, error, fallbackMessage) {
  if (!toast || isPermissionDeniedError(error) || process.env.NODE_ENV === 'production') {
    return;
  }
  toast.error(error?.message || fallbackMessage);
}

export function emitAccountFeedback(flow, phase, overrides = {}) {
  const config = resolveAccountFeedbackConfig(flow);

  globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
    flow,
    phase,
    statusType:
      overrides.statusType ||
      config.statusType ||
      String(flow || 'ACCOUNT_FEEDBACK')
        .trim()
        .toUpperCase(),
    title:
      overrides.title ||
      (phase === 'success'
        ? config.successTitle || config.title || 'Account'
        : config.title || 'Account'),
    description:
      overrides.description ??
      (phase === 'success'
        ? config.successDescription || config.description || ''
        : config.description || ''),
    icon: overrides.icon || config.icon || 'solar:user-circle-bold',
    themeType: overrides.themeType || config.themeType || DEFAULT_ACCOUNT_FEEDBACK_THEME_TYPE,
    priority: overrides.priority ?? config.priority ?? DEFAULT_ACCOUNT_FEEDBACK_PRIORITY,
    ...(overrides.duration != null ? { duration: overrides.duration } : {}),
    ...(overrides.isOverlay != null ? { isOverlay: overrides.isOverlay } : {}),
  });
}

export function clearAccountFeedback(flow) {
  emitAccountFeedback(flow, 'clear');
}
