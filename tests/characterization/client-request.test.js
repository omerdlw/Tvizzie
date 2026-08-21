import assert from 'node:assert/strict';
import test from 'node:test';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { AuthRequestError, requestAuthJson } from '@/modules/auth/http.client';
import { requestJson } from '@/shared/client-request';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function withBrowserRequestMocks(cookie, fetchImplementation, run) {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  globalThis.document = { cookie };
  globalThis.fetch = fetchImplementation;

  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.document = originalDocument;
      globalThis.fetch = originalFetch;
    });
}

test('API requests build query strings and unwrap standard envelopes', async () => {
  let requestedUrl = '';

  await withBrowserRequestMocks(
    '',
    async (url) => {
      requestedUrl = url;
      return jsonResponse({
        code: 'OK',
        data: { items: [1] },
        message: 'OK',
        ok: true,
        retryable: false,
      });
    },
    async () => {
      const result = await requestApiJson('/api/items', {
        query: { empty: '', page: 2 },
        retryCount: 0,
      });

      assert.deepEqual(result, { items: [1] });
      assert.equal(requestedUrl, '/api/items?page=2');
    },
  );
});

test('mutating requests attach the browser CSRF token and serialize JSON', async () => {
  let requestInit = null;

  await withBrowserRequestMocks(
    'tvz_auth_csrf=token%20123',
    async (_url, init) => {
      requestInit = init;
      return jsonResponse({ success: true });
    },
    async () => {
      await requestJson('/api/write', {
        body: { title: 'Tvizzie' },
        method: 'POST',
      });

      assert.equal(requestInit.headers['X-CSRF-Token'], 'token 123');
      assert.equal(requestInit.headers['Content-Type'], 'application/json');
      assert.equal(requestInit.body, JSON.stringify({ title: 'Tvizzie' }));
    },
  );
});

test('mutating requests initialize a missing CSRF token once', async () => {
  const requestedUrls = [];

  await withBrowserRequestMocks(
    '',
    async (url) => {
      requestedUrls.push(url);
      if (url === '/api/auth/csrf') return jsonResponse({ csrfToken: 'new-token' });
      return jsonResponse({ success: true });
    },
    async () => {
      await requestJson('/api/write', { body: {}, method: 'POST' });
      assert.deepEqual(requestedUrls, ['/api/auth/csrf', '/api/write']);
    },
  );
});

test('auth requests retain their domain-specific error contract', async () => {
  await withBrowserRequestMocks(
    'tvz_auth_csrf=token',
    async () => {
      return jsonResponse(
        { code: 'INVALID_CREDENTIALS', error: 'Invalid credentials', data: { field: 'email' } },
        401,
      );
    },
    async () => {
      await assert.rejects(
        requestAuthJson('/api/auth/sign-in', { body: { email: 'user@example.com' } }),
        (error) => {
          assert.equal(error instanceof AuthRequestError, true);
          assert.equal(error.code, 'INVALID_CREDENTIALS');
          assert.equal(error.status, 401);
          assert.deepEqual(error.data, { field: 'email' });
          return true;
        },
      );
    },
  );
});
