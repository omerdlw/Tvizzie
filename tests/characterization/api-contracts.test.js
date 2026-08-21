import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildApiErrorResult,
  buildApiSuccessResult,
  normalizeApiResultEnvelope,
  unwrapApiResultEnvelope,
} from '@/infrastructure/http/api-result';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/api-response.server';

test('success results preserve data and normalize metadata', () => {
  const data = { accountId: 'account-1' };
  const result = buildApiSuccessResult(data, {
    code: ' ACCOUNT_READY ',
    message: ' Ready ',
    requestId: ' request-1 ',
  });

  assert.deepEqual(result, {
    code: 'ACCOUNT_READY',
    data,
    message: 'Ready',
    ok: true,
    requestId: 'request-1',
    retryable: false,
  });
});

test('legacy payloads normalize as successful envelopes', () => {
  const payload = { items: [{ id: 1 }] };

  assert.deepEqual(normalizeApiResultEnvelope(payload), {
    code: 'OK',
    data: payload,
    message: 'OK',
    ok: true,
    requestId: null,
    retryable: false,
  });
});

test('error envelopes throw errors with contract metadata', () => {
  const result = buildApiErrorResult({
    code: 'RATE_LIMITED',
    data: { retryAfterSeconds: 30 },
    message: 'Try again later',
    requestId: 'request-2',
    retryable: true,
  });

  assert.throws(
    () => unwrapApiResultEnvelope(result),
    (error) => {
      assert.equal(error.message, 'Try again later');
      assert.equal(error.code, 'RATE_LIMITED');
      assert.equal(error.requestId, 'request-2');
      assert.equal(error.retryable, true);
      assert.deepEqual(error.data, { retryAfterSeconds: 30 });
      return true;
    },
  );
});

test('HTTP success responses retain legacy fields and the standard envelope', async () => {
  const response = createApiSuccessResponse(
    { items: [1, 2] },
    {
      code: 'ITEMS_READY',
      legacyPayload: { total: 2 },
      message: 'Items loaded',
      requestMeta: { requestId: 'request-3' },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    code: 'ITEMS_READY',
    data: { items: [1, 2] },
    message: 'Items loaded',
    ok: true,
    requestId: 'request-3',
    retryable: false,
    total: 2,
  });
});

test('HTTP error responses retain the legacy error field', async () => {
  const response = createApiErrorResponse(
    {
      code: 'INVALID_INPUT',
      data: { field: 'username' },
      message: 'Username is invalid',
    },
    {
      requestMeta: { requestId: 'request-4' },
      status: 400,
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    code: 'INVALID_INPUT',
    data: { field: 'username' },
    error: 'Username is invalid',
    message: 'Username is invalid',
    ok: false,
    requestId: 'request-4',
    retryable: false,
  });
});
