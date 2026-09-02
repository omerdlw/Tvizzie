import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCsrfRequest,
  assertCsrfRequestForCookieSession,
  validateCsrfRequest,
} from '@/domains/auth/server/security';
import {
  createPendingSignInToken,
  verifyPendingSignInToken,
} from '@/domains/auth/server/verification';
import { CSRF_COOKIE_NAME } from '@/domains/auth/utils/constants';
import { validateAllowedEmailDomain } from '@/domains/auth/utils/routes';

function createRequest({ authorization = '', cookieToken = '', headerToken = '' } = {}) {
  const headers = new Headers();
  if (authorization) headers.set('authorization', authorization);
  if (cookieToken) headers.set('cookie', `${CSRF_COOKIE_NAME}=${encodeURIComponent(cookieToken)}`);
  if (headerToken) headers.set('x-csrf-token', headerToken);

  return new Request('https://tvizzie.local/api/account/me/profile', { headers, method: 'POST' });
}

test('cookie sessions require matching CSRF tokens while bearer sessions bypass the check', () => {
  const validRequest = createRequest({ cookieToken: 'csrf-token-1', headerToken: 'csrf-token-1' });
  const invalidRequest = createRequest({ cookieToken: 'csrf-token-1', headerToken: 'csrf-token-2' });

  assert.equal(validateCsrfRequest(validRequest), true);
  assert.doesNotThrow(() => assertCsrfRequest(validRequest));
  assert.equal(validateCsrfRequest(invalidRequest), false);
  assert.throws(() => assertCsrfRequest(invalidRequest), /Invalid CSRF token/);
  assert.doesNotThrow(() => assertCsrfRequestForCookieSession(createRequest({ authorization: 'Bearer token' })));
});

test('pending sign-in proofs contain challenge metadata only', () => {
  const previousSecret = process.env.LOGIN_VERIFICATION_SECRET;
  process.env.LOGIN_VERIFICATION_SECRET = 'test-login-verification-secret';

  try {
    const token = createPendingSignInToken({
      challengeKey: 'challenge-key',
      deviceHash: 'device-hash',
      email: 'User@example.com',
      userId: '11111111-1111-4111-8111-111111111111',
    });
    const payload = verifyPendingSignInToken(token);

    assert.equal(payload.email, 'user@example.com');
    assert.equal('accessToken' in payload, false);
    assert.equal('refreshToken' in payload, false);
    assert.equal('password' in payload, false);
  } finally {
    if (previousSecret === undefined) delete process.env.LOGIN_VERIFICATION_SECRET;
    else process.env.LOGIN_VERIFICATION_SECRET = previousSecret;
  }
});

test('sign-up domain allowlisting rejects lookalike providers', () => {
  assert.equal(validateAllowedEmailDomain('person@gmail.com'), 'person@gmail.com');
  assert.throws(() => validateAllowedEmailDomain('person@outlook.eofqw.com'), /Only supported email domains/);
});
