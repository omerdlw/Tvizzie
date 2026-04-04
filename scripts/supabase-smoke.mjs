#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

const PRESET_ENV_KEYS = new Set(Object.keys(process.env));
const WARNING_MESSAGES = [];

function parseBoolean(value, fallback = false) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeTrim(value) {
  return String(value ?? '').trim();
}

function parseEnvFileLine(line) {
  const trimmed = normalizeTrim(line);

  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const equalsIndex = trimmed.indexOf('=');

  if (equalsIndex <= 0) {
    return null;
  }

  const key = normalizeTrim(trimmed.slice(0, equalsIndex));
  let value = normalizeTrim(trimmed.slice(equalsIndex + 1));

  if (!key) {
    return null;
  }

  const startsWithQuote = value.startsWith('"') || value.startsWith("'");
  const endsWithQuote = value.endsWith('"') || value.endsWith("'");

  if (startsWithQuote && endsWithQuote && value.length >= 2) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(cwd, relativePath) {
  const absolutePath = path.join(cwd, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvFileLine(line);

    if (!parsed) {
      continue;
    }

    if (PRESET_ENV_KEYS.has(parsed.key)) {
      continue;
    }

    process.env[parsed.key] = parsed.value;
  }
}

function loadEnvironment() {
  const cwd = process.cwd();

  loadEnvFile(cwd, '.env');
  loadEnvFile(cwd, '.env.local');
  loadEnvFile(cwd, '.env.functions');
  loadEnvFile(cwd, 'supabase/functions/.env.functions');
}

function projectRefFromUrl(supabaseUrl) {
  const parsed = new URL(supabaseUrl);
  const host = normalizeTrim(parsed.hostname);

  if (!host.endsWith('.supabase.co')) {
    return 'unknown';
  }

  return host.replace('.supabase.co', '');
}

function randomHex(bytes = 4) {
  return crypto.randomBytes(bytes).toString('hex');
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toErrorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return JSON.stringify(error);
}

function warn(message) {
  WARNING_MESSAGES.push(message);
  console.warn(`[WARN] ${message}`);
}

function formatStepDetail(detail) {
  if (detail === undefined || detail === null || detail === '') {
    return '';
  }

  if (typeof detail === 'string' || typeof detail === 'number' || typeof detail === 'boolean') {
    return String(detail);
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function createLogger() {
  const state = {
    failed: 0,
    passed: 0,
    startedAt: Date.now(),
  };

  async function runStep(name, fn) {
    const startedAt = Date.now();

    try {
      const detail = await fn();
      state.passed += 1;
      const durationMs = Date.now() - startedAt;
      const formattedDetail = formatStepDetail(detail);
      const suffix = formattedDetail ? ` -> ${formattedDetail}` : '';
      console.log(`[PASS] ${name} (${durationMs}ms)${suffix}`);
      return detail;
    } catch (error) {
      state.failed += 1;
      const durationMs = Date.now() - startedAt;
      console.error(`[FAIL] ${name} (${durationMs}ms) -> ${toErrorMessage(error)}`);
      throw error;
    }
  }

  function printSummary() {
    const totalMs = Date.now() - state.startedAt;

    console.log('');
    console.log('--- Smoke Summary ---');
    console.log(`Passed: ${state.passed}`);
    console.log(`Failed: ${state.failed}`);
    console.log(`Warnings: ${WARNING_MESSAGES.length}`);
    console.log(`Duration: ${totalMs}ms`);

    if (WARNING_MESSAGES.length > 0) {
      console.log('Warning Details:');

      for (const warningMessage of WARNING_MESSAGES) {
        console.log(`- ${warningMessage}`);
      }
    }

    return {
      failed: state.failed,
      passed: state.passed,
      warnings: WARNING_MESSAGES.length,
    };
  }

  return {
    printSummary,
    runStep,
  };
}

function buildSmokeUsername(prefix, runId) {
  const raw = `${prefix}_${runId}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');

  const trimmed = raw.slice(0, 24);

  if (trimmed.length >= 3) {
    return trimmed;
  }

  return `${trimmed}${'x'.repeat(3 - trimmed.length)}`;
}

function buildSafePayload(responsePayload) {
  if (responsePayload && typeof responsePayload === 'object') {
    return responsePayload;
  }

  return {
    value: responsePayload,
  };
}

async function parseResponsePayload(response) {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { raw: rawText };
  }
}

function buildEdgeInvoker({ internalToken, serviceRoleKey, supabaseUrl, timeoutMs }) {
  return async function invokeEdgeFunction(
    functionName,
    payload,
    { allowStatuses = [200], includeInternalHeader = true, includeServiceRoleHeaders = true } = {}
  ) {
    const normalizedFunctionName = normalizeTrim(functionName);

    assertCondition(normalizedFunctionName, 'Function name is required');

    const endpoint = `${supabaseUrl}/functions/v1/${normalizedFunctionName}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeServiceRoleHeaders) {
      headers.apikey = serviceRoleKey;
      headers.Authorization = `Bearer ${serviceRoleKey}`;
    }

    if (includeInternalHeader) {
      headers['x-infra-internal-token'] = internalToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload ?? {}),
        signal: controller.signal,
      });

      const responsePayload = await parseResponsePayload(response);

      if (!allowStatuses.includes(response.status)) {
        const safePayload = buildSafePayload(responsePayload);
        const apiMessage =
          normalizeTrim(safePayload?.error?.message) ||
          normalizeTrim(safePayload?.error) ||
          normalizeTrim(safePayload?.message);
        const defaultMessage = `HTTP ${response.status} from ${normalizedFunctionName}`;
        const errorMessage = apiMessage || defaultMessage;

        const error = new Error(errorMessage);
        error.status = response.status;
        error.payload = safePayload;
        throw error;
      }

      return {
        payload: responsePayload,
        status: response.status,
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(`Timeout while calling ${normalizedFunctionName}`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

async function createSmokeUser(adminClient, { email, label, runId }) {
  const password = `Sm0ke!${randomHex(8)}Aa`;
  const displayName = `Smoke ${label.toUpperCase()} ${runId.slice(-4)}`;
  const nowIso = new Date().toISOString();

  const created = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      display_name: displayName,
      smoke_run_id: runId,
    },
  });

  if (created.error) {
    throw new Error(`createUser failed for ${label}: ${created.error.message}`);
  }

  const userId = normalizeTrim(created.data?.user?.id);

  assertCondition(userId, `Missing user id for ${label}`);

  const profileResult = await adminClient.from('profiles').upsert(
    {
      id: userId,
      display_name: displayName,
      display_name_lower: displayName.toLowerCase(),
      email,
      updated_at: nowIso,
    },
    { onConflict: 'id' }
  );

  if (profileResult.error) {
    throw new Error(`Profile bootstrap failed for ${label}: ${profileResult.error.message}`);
  }

  return {
    email,
    id: userId,
    label,
  };
}

function isMissingRelationError(error) {
  return /relation\s+.+\s+does not exist/i.test(toErrorMessage(error));
}

async function safeDeleteWhereEq(adminClient, table, column, value, { optional = false } = {}) {
  const result = await adminClient.from(table).delete().eq(column, value);

  if (!result.error) {
    return;
  }

  if (optional && isMissingRelationError(result.error)) {
    return;
  }

  throw new Error(`${table} cleanup failed: ${result.error.message}`);
}

async function safeDeleteFollows(adminClient, userId) {
  const result = await adminClient.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);

  if (result.error) {
    throw new Error(`follows cleanup failed: ${result.error.message}`);
  }
}

async function fallbackCleanupUser(adminClient, userId) {
  await safeDeleteWhereEq(adminClient, 'review_likes', 'user_id', userId);
  await safeDeleteWhereEq(adminClient, 'list_likes', 'user_id', userId);
  await safeDeleteWhereEq(adminClient, 'likes', 'user_id', userId, { optional: true });
  await safeDeleteWhereEq(adminClient, 'watchlist', 'user_id', userId, { optional: true });
  await safeDeleteWhereEq(adminClient, 'watched', 'user_id', userId, { optional: true });
  await safeDeleteWhereEq(adminClient, 'media_reviews', 'user_id', userId, { optional: true });
  await safeDeleteWhereEq(adminClient, 'list_reviews', 'user_id', userId, { optional: true });
  await safeDeleteWhereEq(adminClient, 'lists', 'user_id', userId, { optional: true });
  await safeDeleteFollows(adminClient, userId);
  await safeDeleteWhereEq(adminClient, 'activity', 'user_id', userId, { optional: true });
  await safeDeleteWhereEq(adminClient, 'notifications', 'user_id', userId);
  await safeDeleteWhereEq(adminClient, 'usernames', 'user_id', userId);
  await safeDeleteWhereEq(adminClient, 'profile_counters', 'user_id', userId, { optional: true });
  await safeDeleteWhereEq(adminClient, 'profiles', 'id', userId);

  const deletion = await adminClient.auth.admin.deleteUser(userId);

  if (deletion.error && !/user not found/i.test(normalizeTrim(deletion.error.message))) {
    throw new Error(`auth user cleanup failed: ${deletion.error.message}`);
  }
}

async function cleanupUsers({ adminClient, createdUsers, invokeEdgeFunction, keepUsers }) {
  if (createdUsers.length === 0) {
    return;
  }

  if (keepUsers) {
    console.log('[INFO] Cleanup skipped because SUPABASE_SMOKE_KEEP_USERS=true');

    for (const user of createdUsers) {
      console.log(`[INFO] Kept smoke user: ${user.id} (${user.email})`);
    }

    return;
  }

  for (const user of [...createdUsers].reverse()) {
    try {
      await invokeEdgeFunction(
        'account-delete-orchestrator',
        {
          deleteAuthUser: true,
          userId: user.id,
        },
        {
          allowStatuses: [200],
          includeInternalHeader: true,
          includeServiceRoleHeaders: true,
        }
      );
      console.log(`[INFO] Cleanup via account-delete-orchestrator succeeded for ${user.id}`);
    } catch (error) {
      warn(`account-delete-orchestrator cleanup failed for ${user.id}; fallback cleanup is running`);

      try {
        await fallbackCleanupUser(adminClient, user.id);
        console.log(`[INFO] Fallback cleanup succeeded for ${user.id}`);
      } catch (fallbackError) {
        warn(`Fallback cleanup failed for ${user.id}: ${toErrorMessage(fallbackError)}`);
      }
    }
  }
}

async function main() {
  loadEnvironment();

  const supabaseUrl = normalizeTrim(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeTrim(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const internalToken = normalizeTrim(process.env.INFRA_INTERNAL_TOKEN);

  assertCondition(supabaseUrl, 'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required');
  assertCondition(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is required');
  assertCondition(internalToken, 'INFRA_INTERNAL_TOKEN is required');

  const timeoutMs = Number.parseInt(process.env.SUPABASE_SMOKE_TIMEOUT_MS || '20000', 10);
  const keepUsers = parseBoolean(process.env.SUPABASE_SMOKE_KEEP_USERS, false);
  const skipHookProbes = parseBoolean(process.env.SUPABASE_SMOKE_SKIP_HOOKS, false);

  const projectRef = projectRefFromUrl(supabaseUrl);

  console.log(`[INFO] Starting Supabase smoke test for project: ${projectRef}`);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const invokeEdgeFunction = buildEdgeInvoker({
    internalToken,
    serviceRoleKey,
    supabaseUrl,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000,
  });

  const logger = createLogger();
  const createdUsers = [];
  const runId = `${Date.now()}_${randomHex(3)}`;
  const REACHABILITY_STATUSES = [200, 400, 401, 403, 405, 429, 500, 503];

  try {
    await logger.runStep('Preflight: service role auth works', async () => {
      const listUsersResult = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      if (listUsersResult.error) {
        throw new Error(listUsersResult.error.message);
      }

      return `projectRef=${projectRef}`;
    });

    await logger.runStep('Core edge endpoints are reachable', async () => {
      const coreResponses = await Promise.all([
        invokeEdgeFunction('rate-limit', {}, { allowStatuses: REACHABILITY_STATUSES }),
        invokeEdgeFunction('session-control', {}, { allowStatuses: REACHABILITY_STATUSES }),
        invokeEdgeFunction('account-read', {}, { allowStatuses: REACHABILITY_STATUSES }),
        invokeEdgeFunction('account-profile-write', {}, { allowStatuses: REACHABILITY_STATUSES }),
        invokeEdgeFunction('follow-control', {}, { allowStatuses: REACHABILITY_STATUSES }),
        invokeEdgeFunction('account-delete-orchestrator', {}, { allowStatuses: REACHABILITY_STATUSES }),
        invokeEdgeFunction('account-activity-feed', {}, { allowStatuses: REACHABILITY_STATUSES }),
      ]);

      for (const response of coreResponses) {
        assertCondition(response.status !== 404, 'A required edge function is not deployed (404)');
      }

      const activityResponse = coreResponses[coreResponses.length - 1];
      assertCondition(activityResponse.status !== 404, 'account-activity-feed must be deployed');

      return 'core endpoints responded as expected';
    });

    const userA = await logger.runStep('Create smoke user A', async () => {
      const email = `smoke.a.${runId}@example.com`;
      const user = await createSmokeUser(adminClient, {
        email,
        label: 'a',
        runId,
      });
      createdUsers.push(user);
      return user;
    });

    const userB = await logger.runStep('Create smoke user B', async () => {
      const email = `smoke.b.${runId}@example.com`;
      const user = await createSmokeUser(adminClient, {
        email,
        label: 'b',
        runId,
      });
      createdUsers.push(user);
      return user;
    });

    const usernameA = buildSmokeUsername('smokea', runId);
    const usernameB = buildSmokeUsername('smokeb', runId);

    await logger.runStep('Account profile ensure (A/B)', async () => {
      const ensureA = await invokeEdgeFunction('account-profile-write', {
        action: 'ensure',
        displayName: 'Smoke User A',
        email: userA.email,
        userId: userA.id,
        username: usernameA,
      });

      const ensureB = await invokeEdgeFunction('account-profile-write', {
        action: 'ensure',
        displayName: 'Smoke User B',
        email: userB.email,
        userId: userB.id,
        username: usernameB,
      });

      assertCondition(ensureA.payload?.ok === true, 'account-profile-write ensure failed for user A');
      assertCondition(ensureB.payload?.ok === true, 'account-profile-write ensure failed for user B');
      assertCondition(ensureA.payload?.profile?.id === userA.id, 'user A profile id mismatch');
      assertCondition(ensureB.payload?.profile?.id === userB.id, 'user B profile id mismatch');

      return `${usernameA}, ${usernameB}`;
    });

    await logger.runStep('Account read (resolve/search/profile)', async () => {
      const resolveA = await invokeEdgeFunction('account-read', {
        resource: 'resolve',
        username: usernameA,
      });

      assertCondition(resolveA.payload?.userId === userA.id, 'resolve did not return user A id');

      const searchA = await invokeEdgeFunction('account-read', {
        resource: 'search',
        limitCount: 10,
        searchTerm: usernameA.slice(0, 8),
      });

      const searchItems = Array.isArray(searchA.payload?.items) ? searchA.payload.items : [];
      const hasUserA = searchItems.some((item) => normalizeTrim(item?.id) === userA.id);
      assertCondition(hasUserA, 'search did not include user A');

      const profileA = await invokeEdgeFunction('account-read', {
        resource: 'profile',
        userId: userA.id,
      });

      assertCondition(profileA.payload?.profile?.id === userA.id, 'profile read failed for user A');

      return `searchItems=${searchItems.length}`;
    });

    await logger.runStep('Account privacy + follow flow', async () => {
      const updateB = await invokeEdgeFunction('account-profile-write', {
        action: 'update',
        displayName: 'Smoke User B',
        isPrivate: true,
        userId: userB.id,
        username: usernameB,
      });

      assertCondition(updateB.payload?.ok === true, 'account-profile-write update failed for user B');
      assertCondition(updateB.payload?.profile?.isPrivate === true, 'user B must be private');

      const followPending = await invokeEdgeFunction('follow-control', {
        action: 'follow',
        actorUserId: userA.id,
        targetUserId: userB.id,
      });

      assertCondition(followPending.payload?.status === 'pending', 'follow status must be pending');

      const acceptFollow = await invokeEdgeFunction('follow-control', {
        action: 'accept',
        actorUserId: userB.id,
        requesterId: userA.id,
      });

      assertCondition(acceptFollow.payload?.status === 'accepted', 'follow status must be accepted');

      const profileAsFollower = await invokeEdgeFunction('account-read', {
        resource: 'profile',
        userId: userB.id,
        viewerId: userA.id,
      });

      assertCondition(profileAsFollower.payload?.profile?.id === userB.id, 'follower view profile read failed');

      const removeFollower = await invokeEdgeFunction('follow-control', {
        action: 'remove-follower',
        actorUserId: userB.id,
        requesterId: userA.id,
      });

      assertCondition(removeFollower.payload?.status === 'removed', 'remove-follower must return removed');

      const relationshipResult = await adminClient
        .from('follows')
        .select('status')
        .eq('follower_id', userA.id)
        .eq('following_id', userB.id)
        .maybeSingle();

      if (relationshipResult.error) {
        throw new Error(relationshipResult.error.message);
      }

      assertCondition(!relationshipResult.data, 'follow relation must be removed after remove-follower');

      return 'pending -> accepted -> removed';
    });

    await logger.runStep('Account activity feed', async () => {
      const feed = await invokeEdgeFunction('account-activity-feed', {
        cursor: 0,
        pageSize: 10,
        scope: 'user',
        userId: userA.id,
        viewerId: userA.id,
      });

      assertCondition(Array.isArray(feed.payload?.items), 'activity feed must return items array');
      assertCondition(typeof feed.payload?.hasMore === 'boolean', 'activity feed must return hasMore');
      return `items=${feed.payload?.items?.length || 0}`;
    });

    await logger.runStep('Rate-limit behavior', async () => {
      const namespace = `supabase-smoke-${runId}`;
      const payload = {
        namespace,
        windowMs: 60000,
        message: 'Smoke rate limit',
        dimensions: [
          {
            id: 'user',
            value: userA.id,
            limit: 2,
          },
        ],
      };

      const attempt1 = await invokeEdgeFunction('rate-limit', payload);
      const attempt2 = await invokeEdgeFunction('rate-limit', payload);
      const attempt3 = await invokeEdgeFunction('rate-limit', payload);

      assertCondition(attempt1.payload?.allowed === true, 'rate-limit first attempt must be allowed');
      assertCondition(attempt2.payload?.allowed === true, 'rate-limit second attempt must be allowed');

      if (attempt3.payload?.degraded === true) {
        warn('rate-limit returned degraded=true (likely fail-open mode due redis issue)');
      } else {
        assertCondition(attempt3.payload?.allowed === false, 'rate-limit third attempt must be denied');
      }

      return `allowed=${attempt1.payload?.allowed},${attempt2.payload?.allowed},${attempt3.payload?.allowed}`;
    });

    await logger.runStep('Session-control', async () => {
      const sessionControl = await invokeEdgeFunction('session-control', {
        reason: 'supabase-smoke-test',
        userId: userA.id,
      });

      assertCondition(sessionControl.payload?.ok === true, 'session-control must return ok=true');
      assertCondition(sessionControl.payload?.userId === userA.id, 'session-control userId mismatch');

      return `revokeBefore=${sessionControl.payload?.revokeBefore || 'n/a'}`;
    });

    if (!skipHookProbes) {
      await logger.runStep('Auth hooks probe', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);

        const beforeUserCreated = await invokeEdgeFunction(
          'before-user-created-hook',
          {
            metadata: {
              ip_address: '127.0.0.1',
              name: 'before_user_created',
              time: new Date().toISOString(),
              uuid: crypto.randomUUID(),
            },
            user: {
              app_metadata: {
                provider: 'email',
                providers: ['email'],
              },
              email: `hook.${runId}@example.com`,
              id: crypto.randomUUID(),
              user_metadata: {
                smoke: true,
              },
            },
          },
          {
            allowStatuses: [200, 503],
            includeInternalHeader: false,
            includeServiceRoleHeaders: true,
          }
        );

        const customAccessToken = await invokeEdgeFunction(
          'custom-access-token-hook',
          {
            authentication_method: 'password',
            user_id: userA.id,
            claims: {
              iss: supabaseUrl,
              aud: 'authenticated',
              exp: nowSeconds + 3600,
              iat: nowSeconds,
              sub: userA.id,
              role: 'authenticated',
              aal: 'aal1',
              session_id: crypto.randomUUID(),
              email: userA.email,
              phone: '',
              is_anonymous: false,
              app_metadata: {
                role: 'authenticated',
              },
              user_metadata: {
                smoke_run_id: runId,
              },
            },
          },
          {
            allowStatuses: [200, 503],
            includeInternalHeader: false,
            includeServiceRoleHeaders: true,
          }
        );

        const passwordHook = await invokeEdgeFunction(
          'password-verification-hook',
          {
            user_id: userA.id,
            valid: false,
          },
          {
            allowStatuses: [200, 503],
            includeInternalHeader: false,
            includeServiceRoleHeaders: true,
          }
        );

        const mfaHook = await invokeEdgeFunction(
          'mfa-verification-hook',
          {
            factor_id: `factor-${randomHex(4)}`,
            factor_type: 'totp',
            user_id: userA.id,
            valid: false,
          },
          {
            allowStatuses: [200, 503],
            includeInternalHeader: false,
            includeServiceRoleHeaders: true,
          }
        );

        const statuses = {
          beforeUserCreated: beforeUserCreated.status,
          customAccessToken: customAccessToken.status,
          mfa: mfaHook.status,
          password: passwordHook.status,
        };

        for (const [hookName, status] of Object.entries(statuses)) {
          if (status === 503) {
            warn(`${hookName} returned 503 (likely fail-close mode or unsigned request)`);
          }
        }

        if (customAccessToken.status === 200) {
          assertCondition(
            customAccessToken.payload?.claims && typeof customAccessToken.payload.claims === 'object',
            'custom-access-token-hook must return claims object on 200'
          );
        }

        if (passwordHook.status === 200) {
          assertCondition(
            normalizeTrim(passwordHook.payload?.decision) !== '',
            'password-verification-hook must return decision on 200'
          );
        }

        if (mfaHook.status === 200) {
          assertCondition(
            normalizeTrim(mfaHook.payload?.decision) !== '',
            'mfa-verification-hook must return decision on 200'
          );
        }

        return `statuses=${JSON.stringify(statuses)}`;
      });
    }
  } finally {
    await cleanupUsers({
      adminClient,
      createdUsers,
      invokeEdgeFunction,
      keepUsers,
    });
  }

  const summary = logger.printSummary();

  if (summary.failed > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('[INFO] Supabase smoke test completed successfully');
}

main().catch((error) => {
  console.error(`[FATAL] ${toErrorMessage(error)}`);
  process.exitCode = 1;
});
