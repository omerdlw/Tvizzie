import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

test('CSP is enforced with the application runtime origins', async () => {
  const source = await readFile('next.config.mjs', 'utf8');

  assert.match(source, /key: 'Content-Security-Policy'/);
  assert.doesNotMatch(source, /Content-Security-Policy-Report-Only/);
  assert.doesNotMatch(source, /CSP_ENFORCE/);
  assert.match(source, /https:\/\/www\.youtube\.com/);
  assert.match(source, /SUPABASE_ORIGIN/);
});

test('Next 16 request interception uses the proxy convention', async () => {
  const source = await readFile('proxy.js', 'utf8');

  assert.match(source, /export async function proxy/);
  await assert.rejects(access('middleware.js'));
});
