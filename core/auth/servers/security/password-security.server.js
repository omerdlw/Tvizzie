import { createClient } from '@supabase/supabase-js';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseBrowserEnv } from '@/core/clients/supabase/constants';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizePassword(value) {
  return String(value || '');
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

export function validateStrongPassword(value) {
  const password = normalizePassword(value);

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least 1 uppercase letter');
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least 1 symbol');
  }

  return password;
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
