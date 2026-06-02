import { normalizeValue } from '@/core/utils/string';

import { createChallengeProofToken, verifyChallengeProofToken } from './challenge-proof.server';
import { resolveSecretWithFallback } from './secret-fallback.server';

function getSecret() {
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

export function createSignUpProofToken({ challengeJti, challengeKey, email, expiresAt = Date.now() + 10 * 60 * 1000 }) {
  return createChallengeProofToken({
    challengeJti,
    challengeKey,
    email,
    expiresAt,
    missingPayloadMessage: 'Sign-up proof requires challenge, key, and email',
    secret: getSecret(),
  });
}

export function verifySignUpProofToken(token, { email } = {}) {
  return verifyChallengeProofToken(token, {
    email: normalizeValue(email),
    expiredMessage: 'Sign-up verification has expired',
    invalidMessage: 'Sign-up verification is invalid',
    secret: getSecret(),
  });
}
