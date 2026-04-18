import { createClient } from '@supabase/supabase-js';

import { normalizePassword, validatePasswordRules } from '@/core/auth/password-validation';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseBrowserEnv } from '@/core/clients/supabase/constants';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function getPasswordSecurityClient() {
  assertSupabaseBrowserEnv();

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function createAuthError(message, code = null) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeAuthFailure(error) {
  const message = normalizeValue(error?.message || '').toLowerCase();
  const code = normalizeValue(error?.code || error?.error_code || '').toLowerCase();

  if (
    code === 'invalid_credentials' ||
    code === 'invalid_login_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid_credentials') ||
    message.includes('invalid credentials')
  ) {
    throw createAuthError('Invalid login credentials', 'invalid_login_credentials');
  }

  if (message.includes('user banned') || message.includes('user_disabled')) {
    throw createAuthError('This account has been disabled', 'auth/user-disabled');
  }

  throw createAuthError(error?.message || 'Sign in failed', error?.code || error?.error_code || null);
}

export function validateStrongPassword(value) {
  return validatePasswordRules(value);
}

export async function verifyPasswordWithIdentityToolkit({ email, password }) {
  const client = getPasswordSecurityClient();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Current password could not be verified');
  }

  const response = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (!response.error) {
    return;
  }

  const message = normalizeValue(response.error?.message).toLowerCase();

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid_credentials') ||
    message.includes('invalid credentials')
  ) {
    throw new Error('Current password is incorrect');
  }

  if (message.includes('user banned') || message.includes('user_disabled')) {
    throw new Error('This account has been disabled');
  }

  throw new Error('Current password could not be verified');
}

export async function createPendingPasswordSignIn({ email, password }) {
  const client = getPasswordSecurityClient();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || password === undefined || password === null || password === '') {
    throw createAuthError('Email and password are required');
  }

  const response = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: String(password),
  });

  if (response.error) {
    normalizeAuthFailure(response.error);
  }

  const session = response.data?.session || null;
  const user = response.data?.user || session?.user || null;
  const accessToken = normalizeValue(session?.access_token);
  const refreshToken = normalizeValue(session?.refresh_token);
  const userId = normalizeValue(user?.id);
  const userEmail = normalizeEmail(user?.email || normalizedEmail);

  if (!accessToken || !refreshToken || !userId || !userEmail) {
    throw createAuthError('Sign in failed');
  }

  return {
    accessToken,
    email: userEmail,
    provider: normalizeValue(session?.user?.app_metadata?.provider) || 'password',
    refreshToken,
    user,
    userId,
  };
}
