'use client';

export const AUTH_ROUTES = Object.freeze({
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
});

export const AUTH_PURPOSE = Object.freeze({
  PASSWORD_RESET: 'password-reset',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const EMAIL_DOMAIN_PATTERNS = [
  /^gmail\.com$/i,
  /^outlook\.[a-z.]+$/i,
  /^hotmail\.[a-z.]+$/i,
  /^yandex\.[a-z.]+$/i,
  /^yahoo\.[a-z.]+$/i,
  /^protonmail\.[a-z.]+$/i,
  /^icloud\.com$/i,
];

export const AUTH_ERROR_MESSAGES = Object.freeze({
  'auth/email-already-in-use': 'This email address is already in use',
  'auth/invalid-credential': 'The username/email or password is incorrect',
  'auth/invalid-email': 'Enter a valid email address',
  'auth/missing-credentials': 'Sign-in credentials are missing',
  'auth/network-request-failed': 'A network error occurred. Please try again',
  'auth/operation-not-allowed': 'This sign-in method is not available',
  'auth/too-many-requests': 'Too many attempts were made. Please try again later',
  'auth/user-disabled': 'This account has been disabled',
  'auth/user-not-found': 'No account was found with these credentials',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters, 1 uppercase letter, 1 number, and 1 symbol',
  'auth/wrong-password': 'The password is incorrect',
  SIGNIN_IDENTIFIER_REQUIRED: 'Username or email is required',
  PROFILE_EMAIL_MISSING: 'No sign-in email was found for this username. Please contact support',
  USERNAME_TAKEN: 'This username is already taken',
  GOOGLE_EMAIL_UNAVAILABLE:
    'Google account email could not be verified. Try again with a Google account that has a verified email address.',
  GOOGLE_LINK_EMAIL_MISMATCH: 'Google account email must match your current email to link',
  GOOGLE_PASSWORD_LOGIN_REQUIRED:
    'This email is already used by another account. Sign in with your password once to link Google',
  GOOGLE_PROVIDER_COLLISION: 'This Google account is already linked to another account',
  GOOGLE_SIGNUP_REQUIRED: 'No account exists for this Google account. Continue with Sign Up.',
  GOOGLE_UNLINK_REQUIRES_PASSWORD: 'Google can only be unlinked while email/password sign-in remains enabled',
  INVALID_LOGIN_CREDENTIALS: 'The username/email or password is incorrect',
});

export const AUTH_ERROR_MESSAGE_PATTERNS = Object.freeze([
  ['auth/email-already-in-use', AUTH_ERROR_MESSAGES['auth/email-already-in-use']],
  ['auth/invalid-credential', AUTH_ERROR_MESSAGES['auth/invalid-credential']],
  ['Invalid login credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['invalid_credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['invalid_login_credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['auth/invalid-email', AUTH_ERROR_MESSAGES['auth/invalid-email']],
  ['auth/user-not-found', AUTH_ERROR_MESSAGES['auth/user-not-found']],
  ['auth/wrong-password', AUTH_ERROR_MESSAGES['auth/wrong-password']],
  ['auth/weak-password', AUTH_ERROR_MESSAGES['auth/weak-password']],
  ['auth/too-many-requests', AUTH_ERROR_MESSAGES['auth/too-many-requests']],
  ['auth/network-request-failed', AUTH_ERROR_MESSAGES['auth/network-request-failed']],
  ['GOOGLE_EMAIL_UNAVAILABLE', AUTH_ERROR_MESSAGES.GOOGLE_EMAIL_UNAVAILABLE],
  ['GOOGLE_PASSWORD_LOGIN_REQUIRED', AUTH_ERROR_MESSAGES.GOOGLE_PASSWORD_LOGIN_REQUIRED],
  ['GOOGLE_SIGNUP_REQUIRED', AUTH_ERROR_MESSAGES.GOOGLE_SIGNUP_REQUIRED],
  ['GOOGLE_PROVIDER_COLLISION', AUTH_ERROR_MESSAGES.GOOGLE_PROVIDER_COLLISION],
  ['GOOGLE_LINK_EMAIL_MISMATCH', AUTH_ERROR_MESSAGES.GOOGLE_LINK_EMAIL_MISMATCH],
  ['GOOGLE_UNLINK_REQUIRES_PASSWORD', AUTH_ERROR_MESSAGES.GOOGLE_UNLINK_REQUIRES_PASSWORD],
]);
