import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCsrfRequest,
  assertCsrfRequestForCookieSession,
  validateCsrfRequest,
} from '@/domains/auth/server/security';
import { CSRF_COOKIE_NAME } from '@/domains/auth/utils/constants';

function createRequest({ authorization = '', cookieToken = '', headerToken = '' } = {}) {
  const headers = new Headers();

  if (authorization) headers.set('authorization', authorization);
  if (cookieToken) headers.set('cookie', `${CSRF_COOKIE_NAME}=${encodeURIComponent(cookieToken)}`);
  if (headerToken) headers.set('x-csrf-token', headerToken);

  return new Request('https://tvizzie.local/api/account/profile', {
    headers,
    method: 'POST',
  });
}

test('cookie-authenticated requests accept matching CSRF tokens', () => {
  const request = createRequest({
    cookieToken: 'csrf-token-1',
    headerToken: 'csrf-token-1',
  });

  assert.equal(validateCsrfRequest(request), true);
  assert.doesNotThrow(() => assertCsrfRequest(request));
});

test('cookie-authenticated requests reject missing or mismatched CSRF tokens', () => {
  const mismatchedRequest = createRequest({
    cookieToken: 'csrf-token-1',
    headerToken: 'csrf-token-2',
  });

  assert.equal(validateCsrfRequest(mismatchedRequest), false);
  assert.throws(() => assertCsrfRequest(mismatchedRequest), /Invalid CSRF token/);
  assert.throws(() => assertCsrfRequest(createRequest()), /Invalid CSRF token/);
});

test('bearer-authenticated requests bypass cookie CSRF validation', () => {
  const request = createRequest({ authorization: 'Bearer access-token' });

  assert.doesNotThrow(() => assertCsrfRequestForCookieSession(request));
});
