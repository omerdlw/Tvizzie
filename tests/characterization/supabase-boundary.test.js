import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT_DIRECTORIES = ['app', 'domains', 'infrastructure', 'modules', 'ui'];
const ADMIN_CONFIG_IMPORT = 'admin-config.server';

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listJavaScriptFiles(entryPath);
      return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
    }),
  );

  return files.flat();
}

test('browser-safe Supabase config contains no service-role reference', async () => {
  const source = await readFile('infrastructure/supabase/public-config.js', 'utf8');

  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
});

test('privileged Supabase entry points are explicitly server-only', async () => {
  const adminConfig = await readFile('infrastructure/supabase/admin-config.server.js', 'utf8');
  const adminClient = await readFile('infrastructure/supabase/admin-client.server.js', 'utf8');

  assert.match(adminConfig, /^import 'server-only';/);
  assert.match(adminClient, /^import 'server-only';/);
});

test('client modules cannot import privileged Supabase configuration', async () => {
  const files = (
    await Promise.all(ROOT_DIRECTORIES.map((directory) => listJavaScriptFiles(directory)))
  ).flat();
  const violations = [];

  await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file, 'utf8');
      const firstStatement = source.trimStart().split(/\r?\n/, 1)[0];

      if (firstStatement === "'use client';" && source.includes(ADMIN_CONFIG_IMPORT)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }),
  );

  assert.deepEqual(violations.sort(), []);
});

test('browser collection RPC contracts cannot supply an actor id', async () => {
  const { createMediaCollectionToggleRpcParams, executeMediaCollectionRpc } =
    await import('../../domains/account/client/collections.js');
  const params = createMediaCollectionToggleRpcParams({
    row: {
      media_key: 'movie:1',
      payload: {},
      title: 'Movie',
    },
  });

  assert.equal(Object.hasOwn(params, 'p_user_id'), false);
  await assert.rejects(
    () =>
      executeMediaCollectionRpc({
        client: {
          rpc() {
            throw new Error('RPC must not be reached');
          },
        },
        fnName: 'collection_toggle_like',
        params: {
          ...params,
          p_user_id: '00000000-0000-0000-0000-000000000000',
        },
      }),
    /actors must be derived from the authenticated session/,
  );

  const mediaMutationSources = await Promise.all(
    ['likes.js', 'watched.js', 'watchlist.js'].map((file) =>
      readFile(path.join('domains/media/client', file), 'utf8'),
    ),
  );

  for (const source of mediaMutationSources) {
    assert.doesNotMatch(source, /p_user_id/);
  }
});

test('browser list lifecycle RPC contracts cannot supply an actor id', async () => {
  const source = await readFile('domains/account/client/lists.js', 'utf8');
  const createCall = source.match(
    /client\.rpc\('list_create_with_items_atomic', \{([\s\S]*?)\n  \}\);/,
  );
  const deleteCall = source.match(/client\.rpc\('list_delete_cascade', \{([\s\S]*?)\n  \}\);/);

  assert.ok(createCall, 'List create RPC call must remain discoverable');
  assert.ok(deleteCall, 'List delete RPC call must remain discoverable');
  assert.doesNotMatch(createCall[1], /p_user_id/);
  assert.doesNotMatch(deleteCall[1], /p_user_id/);
});

test('watched removal is one database mutation instead of a sequential unlike', async () => {
  const source = await readFile('domains/media/client/watched.js', 'utf8');
  const removeFlow = source.slice(source.indexOf('export async function removeUserWatchedItem'));

  assert.match(removeFlow, /fnName: 'collection_remove_watched'/);
  assert.doesNotMatch(removeFlow, /removeUserLike/);
  assert.match(removeFlow, /was_unliked/);
});
