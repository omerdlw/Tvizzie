'use client';

function isInvalidCredentialsError(error) {
  const code = String(error?.code || '')
    .trim()
    .toLowerCase();
  const message = String(error?.message || '')
    .trim()
    .toLowerCase();

  return (
    code === 'invalid_credentials' ||
    code === 'invalid_login_credentials' ||
    code === 'auth/invalid-credential' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid_credentials') ||
    message.includes('auth/invalid-credential')
  );
}

export async function signInWithPassword({ auth, identifier, password }) {
  const rawPassword = String(password || '');
  const trimmedPassword = rawPassword.trim();

  if (!trimmedPassword) throw new Error('Password is required');

  try {
    return await auth.signIn({ identifier, password: rawPassword });
  } catch (error) {
    if (!isInvalidCredentialsError(error) || rawPassword === trimmedPassword) throw error;
    return auth.signIn({ identifier, password: trimmedPassword });
  }
}
