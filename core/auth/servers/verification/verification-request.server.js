import { PURPOSES } from './email-verification.constants';
import { normalizeEmailValue } from '@/core/utils/string';

const VERIFICATION_ACTIONS = Object.freeze({
  RESEND: 'resend',
  VERIFY: 'verify',
});

const ACTION_ALIASES = Object.freeze({
  'send-code': VERIFICATION_ACTIONS.RESEND,
  'verify-code': VERIFICATION_ACTIONS.VERIFY,
});

const EMAIL_DOMAIN_PATTERNS = [
  /^gmail\.com$/i,
  /^outlook\.[a-z.]+$/i,
  /^hotmail\.[a-z.]+$/i,
  /^yandex\.[a-z.]+$/i,
  /^yahoo\.[a-z.]+$/i,
  /^protonmail\.[a-z.]+$/i,
  /^icloud\.com$/i,
];

function normalizeValue(value) {
  return String(value || '').trim();
}

export function normalizeVerificationAction(value) {
  const normalizedAction = normalizeValue(value).toLowerCase();
  return ACTION_ALIASES[normalizedAction] || normalizedAction;
}

export function normalizeEmail(value) {
  return normalizeEmailValue(value);
}

export function validateAllowedEmailDomain(value) {
  const email = normalizeEmail(value);
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    throw new Error('Enter a valid email address');
  }

  const isAllowed = EMAIL_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain));

  if (!isAllowed) {
    throw new Error(
      'Only supported email domains are allowed: gmail, outlook, hotmail, yandex, yahoo, protonmail, icloud'
    );
  }

  return email;
}

export function isSecureVerificationPurpose(purpose) {
  return (
    purpose === PURPOSES.ACCOUNT_DELETE ||
    purpose === PURPOSES.EMAIL_CHANGE ||
    purpose === PURPOSES.PASSWORD_CHANGE ||
    purpose === PURPOSES.PASSWORD_SET ||
    purpose === PURPOSES.PROVIDER_LINK
  );
}

export function mapVerificationResendErrorStatus(message) {
  const normalizedMessage = String(message || '');
  const rateLimitError = normalizedMessage.includes('Too many') || normalizedMessage.includes('Please wait');
  const providerConfigError =
    normalizedMessage.includes('SMTP configuration is incomplete') ||
    normalizedMessage.includes('Brevo SMTP configuration is incomplete');
  const providerAuthError = normalizedMessage.includes('Email provider authentication failed');

  if (rateLimitError) {
    return 429;
  }

  if (providerConfigError || providerAuthError) {
    return 502;
  }

  if (normalizedMessage.includes('Invalid CSRF token')) {
    return 403;
  }

  if (normalizedMessage.includes('Pending sign-in session')) {
    return 400;
  }

  if (
    normalizedMessage.includes('Authentication session is required') ||
    normalizedMessage.includes('Invalid or expired authentication token') ||
    normalizedMessage.includes('Authentication token has been revoked') ||
    normalizedMessage.includes('Recent authentication is required')
  ) {
    return 401;
  }

  if (normalizedMessage.includes('already in use') || normalizedMessage.includes('already linked to this account')) {
    return 409;
  }

  if (
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('Username or email is required') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('must be') ||
    normalizedMessage.includes('Unsupported verification purpose') ||
    normalizedMessage.includes('email/password sign-in enabled') ||
    normalizedMessage.includes('supported email domains') ||
    normalizedMessage.includes('Enter a valid email address')
  ) {
    return 400;
  }

  return 500;
}

export function mapVerificationVerifyErrorStatus(message) {
  const normalizedMessage = String(message || '');

  if (normalizedMessage.includes('Invalid CSRF token')) {
    return 403;
  }

  if (normalizedMessage.includes('Pending sign-in session')) {
    return 400;
  }

  if (
    normalizedMessage.includes('Authentication session is required') ||
    normalizedMessage.includes('Invalid or expired authentication token') ||
    normalizedMessage.includes('Authentication token has been revoked') ||
    normalizedMessage.includes('Recent authentication is required')
  ) {
    return 401;
  }

  if (
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('expired') ||
    normalizedMessage.includes('Unsupported verification purpose') ||
    normalizedMessage.includes('Verification could not be completed')
  ) {
    return 400;
  }

  return 500;
}

export { VERIFICATION_ACTIONS };
