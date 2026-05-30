import { normalizeValue } from '@/core/utils/string';

import { TOKEN_VERSION } from './email-verification.constants';
import { resolveSecretWithFallback } from './secret-fallback.server';
import { createSignedToken, verifySignedToken } from './signed-token.server';

function getSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'EMAIL_VERIFICATION_SECRET',
    fallbackEnvNames: [],
    missingMessage: 'EMAIL_VERIFICATION_SECRET is missing on the server. Configure email verification settings',
  });
}

export function buildChallengeToken({ exp, jti, key }) {
  return createSignedToken(
    {
      exp,
      jti,
      key,
      v: TOKEN_VERSION,
    },
    {
      secret: getSecret(),
    }
  );
}

export function verifyChallengeToken(token, invalidMessage) {
  const payload = verifySignedToken(token, {
    invalidMessage,
    secret: getSecret(),
  });

  return {
    exp: Number(payload?.exp),
    jti: normalizeValue(payload?.jti),
    key: normalizeValue(payload?.key),
    v: Number(payload?.v),
  };
}
