import { normalizeValue } from '@/core/utils/string';

import { createChallengeProofToken, verifyChallengeProofToken } from './challenge-proof.server';
import { resolveSecretWithFallback } from './secret-fallback.server';

function getSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'PASSWORD_RESET_PROOF_SECRET',
    fallbackEnvNames: ['EMAIL_VERIFICATION_SECRET'],
    missingMessage:
      'PASSWORD_RESET_PROOF_SECRET is missing on the server and EMAIL_VERIFICATION_SECRET fallback is unavailable',
    warningGlobalKey: '__tvizzie_password_reset_proof_secret_fallback_warned__',
    warningMessage:
      '[Auth] PASSWORD_RESET_PROOF_SECRET is missing. Falling back to EMAIL_VERIFICATION_SECRET. Configure PASSWORD_RESET_PROOF_SECRET explicitly.',
  });
}

export function createPasswordResetProofToken({
  challengeJti,
  challengeKey,
  email,
  expiresAt = Date.now() + 10 * 60 * 1000,
}) {
  return createChallengeProofToken({
    challengeJti,
    challengeKey,
    email,
    expiresAt,
    missingPayloadMessage: 'Password reset proof requires challenge, key, and email',
    secret: getSecret(),
  });
}

export function verifyPasswordResetProofToken(token, { email } = {}) {
  return verifyChallengeProofToken(token, {
    email: normalizeValue(email),
    expiredMessage: 'Password reset verification has expired',
    invalidMessage: 'Password reset verification is invalid',
    secret: getSecret(),
  });
}
