import { randomBytes } from 'crypto';
import { normalizeEmailValue, normalizeValue } from '@/shared';
import { createSignedToken, verifySignedToken } from './tokens';

export { createSignedToken, verifySignedToken };

export function resolveSecretWithFallback({
  primaryEnvName,
  fallbackEnvNames = [],
  missingMessage,
  warningGlobalKey = null,
  warningMessage = null,
}) {
  const primarySecret = normalizeValue(process.env[primaryEnvName]);
  if (primarySecret) return primarySecret;

  for (const envName of fallbackEnvNames) {
    const fallbackSecret = normalizeValue(process.env[envName]);
    if (fallbackSecret) {
      if (warningGlobalKey && warningMessage && !globalThis[warningGlobalKey]) {
        globalThis[warningGlobalKey] = true;
        console.warn(warningMessage);
      }
      return fallbackSecret;
    }
  }

  throw new Error(missingMessage);
}

export function createChallengeProofToken({
  challengeJti,
  challengeKey,
  email,
  userId = null,
  expiresAt = Date.now() + 10 * 60 * 1000,
  missingPayloadMessage = 'Challenge proof requires challenge, key, and email',
  secret,
}) {
  const normalizedChallengeJti = normalizeValue(challengeJti);
  const normalizedChallengeKey = normalizeValue(challengeKey);
  const normalizedEmail = normalizeEmailValue(email);

  if (!normalizedChallengeJti || !normalizedChallengeKey || !normalizedEmail) {
    throw new Error(missingPayloadMessage);
  }

  return createSignedToken(
    {
      challengeJti: normalizedChallengeJti,
      challengeKey: normalizedChallengeKey,
      email: normalizedEmail,
      userId: normalizeValue(userId) || null,
      exp: Math.floor(Number(expiresAt) / 1000),
      jti: randomBytes(12).toString('hex'),
    },
    { secret },
  );
}

export function verifyChallengeProofToken(
  token,
  {
    email,
    expiredMessage = 'Verification expired',
    invalidMessage = 'Verification invalid',
    secret,
  } = {},
) {
  const payload = verifySignedToken(token, { secret, invalidMessage });
  const expiresAtMs = Number(payload?.exp) * 1000;

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error(expiredMessage);
  }

  const expectedEmail = normalizeEmailValue(email);
  const payloadEmail = normalizeEmailValue(payload?.email);

  if (expectedEmail && payloadEmail !== expectedEmail) throw new Error(invalidMessage);

  const challengeJti = normalizeValue(payload?.challengeJti);
  const challengeKey = normalizeValue(payload?.challengeKey);

  if (!challengeJti || !challengeKey || !payloadEmail) throw new Error(invalidMessage);

  return {
    challengeJti,
    challengeKey,
    email: payloadEmail,
    userId: normalizeValue(payload?.userId) || null,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

function getSignUpSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'SIGN_UP_PROOF_SECRET',
    fallbackEnvNames: ['EMAIL_VERIFICATION_SECRET'],
    missingMessage:
      'SIGN_UP_PROOF_SECRET is missing on the server and EMAIL_VERIFICATION_SECRET fallback is unavailable',
    warningGlobalKey: '__tvizzie_signup_proof_secret_fallback_warned__',
    warningMessage:
      '[Auth] SIGN_UP_PROOF_SECRET is missing. Falling back to EMAIL_VERIFICATION_SECRET. Configure SIGN_UP_PROOF_SECRET explicitly.',
  });
}

export function createSignUpProofToken({
  challengeJti,
  challengeKey,
  email,
  userId,
  expiresAt = Date.now() + 10 * 60 * 1000,
}) {
  return createChallengeProofToken({
    challengeJti,
    challengeKey,
    email,
    userId,
    expiresAt,
    missingPayloadMessage: 'Sign-up proof requires challenge, key, and email',
    secret: getSignUpSecret(),
  });
}

export function verifySignUpProofToken(token, { email } = {}) {
  return verifyChallengeProofToken(token, {
    email: normalizeValue(email),
    expiredMessage: 'Sign-up verification has expired',
    invalidMessage: 'Sign-up verification is invalid',
    secret: getSignUpSecret(),
  });
}
