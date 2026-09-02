'use client';

import { ACCOUNT_CLIENT } from '@/domains/account/client/profile';
import { getOAuthProviderLabel } from '@/domains/auth/utils/oauth';
import {
  AUTH_ROUTE_NOTICE,
  AUTH_ROUTES,
  buildAuthHref,
  validateAllowedEmailDomain,
} from '@/domains/auth/utils/routes';
import { createError } from '@/domains/auth/utils/errors';
import { assertSignUpEmailAvailable, completeVerifiedSignUp } from './requests.js';

export const SIGN_UP_FEEDBACK = Object.freeze({
  'creating-account': Object.freeze({
    description: 'Creating your account and starting your session',
    phase: 'start',
    title: 'Creating account',
  }),
  redirecting: Object.freeze({
    description: 'Redirecting to your account',
    duration: 3000,
    phase: 'success',
    title: 'Account ready',
  }),
});

export function getSignUpStepTitle(step) {
  return ['Create account', 'Profile details'][step] || 'Create account';
}

export function getSignUpSubmitLabel(step, pendingAction) {
  if (step === 0) return pendingAction === 'step-email' ? 'Checking email' : 'Continue';
  if (step === 1) return pendingAction === 'step-profile' ? 'Checking username' : 'Continue';

  return (
    {
      email: 'Sending verification',
      'creating-account': 'Creating account',
      redirecting: 'Redirecting',
    }[pendingAction] || 'Verify and create'
  );
}

export async function validateSignUpEmail(email) {
  const normalizedEmail = validateAllowedEmailDomain(email);
  await assertSignUpEmailAvailable({ email: normalizedEmail });
  return normalizedEmail;
}

export async function validateSignUpProfile({ displayName, username }) {
  const normalizedUsername = ACCOUNT_CLIENT.validateUsername(username);
  const existingUserId = await ACCOUNT_CLIENT.getAccountIdByUsername(normalizedUsername);

  if (existingUserId) throw createError('USERNAME_TAKEN');

  return {
    displayName: String(displayName || '').trim(),
    username: normalizedUsername,
  };
}

export function resolveSignUpEmailFallback({ email, error, nextPath }) {
  if (error?.code !== 'OAUTH_ACCOUNT_ALREADY_REGISTERED') return '';

  return buildAuthHref(AUTH_ROUTES.SIGN_IN, {
    identifier: email,
    next: nextPath,
    notice: AUTH_ROUTE_NOTICE.OAUTH_ACCOUNT_ALREADY_REGISTERED,
    provider: error?.data?.provider,
  });
}

export async function createPendingSignUpPayload(form = {}) {
  const username = ACCOUNT_CLIENT.validateUsername(form.username);
  const displayName = String(form.displayName || '').trim() || username;
  const email = validateAllowedEmailDomain(form.email);
  return { displayName, email, username };
}

export async function finalizeSignUp({ auth, displayName, email, signUpProof, username }) {
  const completion = await completeVerifiedSignUp({
    displayName,
    email,
    signUpProof,
    username,
  });
  const session = await auth.refreshSession();

  if (!session?.user?.id) {
    throw new Error('Sign-up completed but no authenticated session was returned');
  }

  return { ...session, recovered: completion?.recovered === true };
}

export async function finalizeOAuthSignUp({ auth, nextPath = '/account', provider = 'google' }) {
  const providerLabel = getOAuthProviderLabel(provider);
  const session = await auth.signUp({ oauthIntent: 'sign-up', next: nextPath, provider });

  if (session?.requiresRedirect) return session;
  if (!session?.user?.id) {
    throw new Error(`${providerLabel} sign-up completed but no authenticated session was returned`);
  }

  await ACCOUNT_CLIENT.ensureAccount(session.user);
  return session;
}
