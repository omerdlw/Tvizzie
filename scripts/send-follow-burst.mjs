#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

function normalizeValue(value) {
  return String(value || '').trim();
}

function loadLocalEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = normalizeValue(line);

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      return;
    }

    const key = normalizeValue(trimmed.slice(0, separatorIndex));

    if (!key || process.env[key] !== undefined) {
      return;
    }

    let value = normalizeValue(trimmed.slice(separatorIndex + 1));

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
}

function parseCliArgs(argv = []) {
  const args = {
    seedFile: '',
    targetUserId: '',
    targetUsername: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = normalizeValue(argv[index]);
    const next = normalizeValue(argv[index + 1]);

    if ((token === '--target' || token === '-t') && next) {
      args.targetUsername = next;
      index += 1;
      continue;
    }

    if ((token === '--seed-file' || token === '-s') && next) {
      args.seedFile = next;
      index += 1;
      continue;
    }

    if ((token === '--target-id' || token === '--target-user-id') && next) {
      args.targetUserId = next;
      index += 1;
    }
  }

  return args;
}

function resolveSeedFilePath(explicitSeedFile) {
  const fromEnv = normalizeValue(process.env.SEED_FILE);
  const candidate = normalizeValue(explicitSeedFile || fromEnv);

  if (candidate) {
    const fullPath = path.resolve(process.cwd(), candidate);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Seed file not found: ${fullPath}`);
    }

    return fullPath;
  }

  const outputDir = path.resolve(process.cwd(), 'scripts', 'output');

  if (!fs.existsSync(outputDir)) {
    throw new Error(`Seed output directory not found: ${outputDir}`);
  }

  const files = fs
    .readdirSync(outputDir)
    .filter((name) => name.startsWith('seed-social-') && name.endsWith('.json'))
    .map((name) => {
      const fullPath = path.join(outputDir, name);
      const stat = fs.statSync(fullPath);

      return {
        fullPath,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (!files.length) {
    throw new Error('No seed-social output file found in scripts/output');
  }

  return files[0].fullPath;
}

function createSupabaseAdminClient({ serviceRoleKey, supabaseUrl }) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createSupabasePublicClient({ publishableKey, supabaseUrl }) {
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function signInSeedUsers({ publishableKey, seedUsers, sharedPassword, supabaseUrl }) {
  const signInResults = await Promise.all(
    seedUsers.map(async (user) => {
      const email = normalizeValue(user?.email);

      if (!email) {
        throw new Error('Seed user email is missing');
      }

      const client = createSupabasePublicClient({
        publishableKey,
        supabaseUrl,
      });
      const result = await client.auth.signInWithPassword({
        email,
        password: sharedPassword,
      });

      if (result.error || !result.data?.session?.access_token) {
        throw new Error(`signIn failed for ${email}: ${result.error?.message || 'missing-access-token'}`);
      }

      return {
        email,
        token: result.data.session.access_token,
        userId: normalizeValue(user?.id),
      };
    })
  );

  return signInResults;
}

async function sendFollowBurst({ authSessions, baseUrl, targetUserId }) {
  const settled = await Promise.allSettled(
    authSessions.map(async (session) => {
      const response = await fetch(`${baseUrl}/api/follows`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'follow',
          followingId: targetUserId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      return {
        email: session.email,
        ok: response.ok,
        payload,
        status: response.status,
        userId: session.userId,
      };
    })
  );

  return settled.map((item) =>
    item.status === 'fulfilled'
      ? item.value
      : {
          email: null,
          ok: false,
          payload: {
            error: normalizeValue(item.reason?.message || item.reason || 'request-failed'),
          },
          status: 0,
          userId: null,
        }
  );
}

async function main() {
  loadLocalEnvFile();

  const args = parseCliArgs(process.argv.slice(2));
  const seedFilePath = resolveSeedFilePath(args.seedFile);
  const seedPayload = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
  const targetUsername = normalizeValue(args.targetUsername || process.env.FOLLOW_TARGET_USERNAME || 'omerdlw').toLowerCase();
  const explicitTargetUserId = normalizeValue(args.targetUserId || process.env.FOLLOW_TARGET_USER_ID);

  const supabaseUrl = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceRoleKey = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const publishableKey = normalizeValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY
  );
  const baseUrl = normalizeValue(process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  const sharedPassword = normalizeValue(seedPayload?.password);
  const seedUsers = Array.isArray(seedPayload?.users) ? seedPayload.users : [];

  if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
    throw new Error('Missing Supabase env values');
  }

  if (!sharedPassword || !seedUsers.length) {
    throw new Error('Seed payload is invalid (missing password/users)');
  }

  const admin = createSupabaseAdminClient({
    serviceRoleKey,
    supabaseUrl,
  });
  let targetUserId = explicitTargetUserId;

  if (!targetUserId) {
    const targetResult = await admin.from('usernames').select('user_id').eq('username_lower', targetUsername).maybeSingle();

    if (targetResult.error || !targetResult.data?.user_id) {
      throw new Error(`Target username not found: ${targetUsername}`);
    }

    targetUserId = targetResult.data.user_id;
  }

  console.log(`[INFO] Seed file: ${seedFilePath}`);
  console.log(`[INFO] Target username: ${targetUsername}`);
  console.log(`[INFO] Target user id: ${targetUserId}`);
  console.log(`[INFO] Seed users to sign in: ${seedUsers.length}`);

  const authSessions = await signInSeedUsers({
    publishableKey,
    seedUsers,
    sharedPassword,
    supabaseUrl,
  });
  const followResults = await sendFollowBurst({
    authSessions,
    baseUrl,
    targetUserId,
  });

  const success = followResults.filter((item) => item.ok).length;
  const failed = followResults.filter((item) => !item.ok);

  console.log(`[INFO] Follow requests sent concurrently: ${followResults.length}`);
  console.log(`[INFO] Success: ${success}, Failed: ${failed.length}`);

  if (failed.length) {
    console.log('[WARN] Failed follow requests:');
    failed.forEach((item) => {
      console.log(` - ${item.email || 'unknown-user'} | status=${item.status} | error=${item.payload?.error || item.payload?.message || 'unknown'}`);
    });
  }

  const followerIds = authSessions.map((session) => session.userId).filter(Boolean);
  const verificationResult = await admin
    .from('follows')
    .select('follower_id,status')
    .eq('following_id', targetUserId)
    .in('follower_id', followerIds);

  if (verificationResult.error) {
    throw new Error(`Follow verification failed: ${verificationResult.error.message}`);
  }

  const pendingCount = (verificationResult.data || []).filter((row) => normalizeValue(row.status) === 'pending').length;
  const acceptedCount = (verificationResult.data || []).filter((row) => normalizeValue(row.status) === 'accepted').length;

  console.log(`[INFO] DB verification -> pending: ${pendingCount}, accepted: ${acceptedCount}`);
  console.log('[PASS] Follow burst completed');
}

main().catch((error) => {
  console.error(`[FAIL] Follow burst failed: ${error?.message || error}`);
  process.exit(1);
});
