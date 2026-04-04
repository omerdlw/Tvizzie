'use client';

import { EVENT_TYPES, globalEvents } from '@/core/constants/events';

const DEFAULT_PRIORITY = 112;
const DEFAULT_THEME_TYPE = 'LOGIN';

const ACCOUNT_FEEDBACK_CONFIG = Object.freeze({
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
  'google-link': Object.freeze({
    description: 'Preparing secure provider connection',
    icon: 'flat-color-icons:google',
    statusType: 'GOOGLE_LINK',
    successDescription: 'Google sign-in is now linked to this account',
    successTitle: 'Google Linked',
    title: 'Linking Google',
  }),
  'password-change': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'PASSWORD_CHANGE',
    successDescription: 'Please sign in again with your new password',
    successTitle: 'Password Updated',
    title: 'Updating Password',
  }),
  'password-set': Object.freeze({
    description: 'Adding password sign-in to your account',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'PASSWORD_SET',
    successDescription: 'Please sign in again with your new password',
    successTitle: 'Password Added',
    title: 'Setting Password',
  }),
});

function resolveFlowConfig(flow) {
  return (
    ACCOUNT_FEEDBACK_CONFIG[
      String(flow || '')
        .trim()
        .toLowerCase()
    ] || {}
  );
}

export function emitAccountFeedback(flow, phase, overrides = {}) {
  const config = resolveFlowConfig(flow);

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
      (phase === 'success' ? config.successTitle || config.title || 'Account' : config.title || 'Account'),
    description:
      overrides.description ??
      (phase === 'success' ? config.successDescription || config.description || '' : config.description || ''),
    icon: overrides.icon || config.icon || 'solar:user-circle-bold',
    themeType: overrides.themeType || config.themeType || DEFAULT_THEME_TYPE,
    priority: overrides.priority ?? config.priority ?? DEFAULT_PRIORITY,
    ...(overrides.duration != null ? { duration: overrides.duration } : {}),
    ...(overrides.isOverlay != null ? { isOverlay: overrides.isOverlay } : {}),
  });
}

export function clearAccountFeedback(flow) {
  emitAccountFeedback(flow, 'clear');
}
