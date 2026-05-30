import { normalizeEmailValue, normalizeValue } from '@/core/utils/string';
import { randomBytes } from 'crypto';

import { createSignedToken, verifySignedToken } from './signed-token.server';

export function createChallengeProofToken({
  challengeJti,
  challengeKey,
  email,
  expiresAt = Date.now() + 10 * 60 * 1000,
  missingPayloadMessage,
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
      exp: Math.floor(Number(expiresAt) / 1000),
      jti: randomBytes(12).toString('hex'),
    },
    { secret }
  );
}

export function verifyChallengeProofToken(token, { email, expiredMessage, invalidMessage, secret } = {}) {
  const payload = verifySignedToken(token, {
    secret,
    invalidMessage,
  });
  const expiresAtMs = Number(payload?.exp) * 1000;

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error(expiredMessage);
  }

  const expectedEmail = normalizeEmailValue(email);
  const payloadEmail = normalizeEmailValue(payload?.email);

  if (expectedEmail && payloadEmail !== expectedEmail) {
    throw new Error(invalidMessage);
  }

  const challengeJti = normalizeValue(payload?.challengeJti);
  const challengeKey = normalizeValue(payload?.challengeKey);

  if (!challengeJti || !challengeKey || !payloadEmail) {
    throw new Error(invalidMessage);
  }

  return {
    challengeJti,
    challengeKey,
    email: payloadEmail,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}
