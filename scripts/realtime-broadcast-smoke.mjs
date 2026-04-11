#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';

function loadLocalEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = String(line || '').trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeValue(value) {
  return String(value || '').trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createAdminClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function waitForSubscription(channel, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Realtime subscribe timed out')), timeoutMs);

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        resolve(true);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timer);
        reject(new Error(`Realtime subscribe failed: ${status}${err?.message ? ` (${err.message})` : ''}`));
      }
    });
  });
}

async function main() {
  loadLocalEnvFile();

  const baseUrl = normalizeValue(process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  const supabaseUrl = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceRoleKey = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const publishableKey = normalizeValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY
  );

  assertCondition(supabaseUrl, 'Missing Supabase URL');
  assertCondition(serviceRoleKey, 'Missing SUPABASE_SERVICE_ROLE_KEY');
  assertCondition(publishableKey, 'Missing Supabase publishable key');

  const runId = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const email = `realtime-smoke-${runId}@example.com`;
  const password = `Tvizzie-${crypto.randomBytes(6).toString('hex')}!`;

  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  let userId = null;
  let realtimeClient = null;
  let channel = null;

  try {
    const createResult = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
    });

    if (createResult.error || !createResult.data?.user?.id) {
      throw new Error(`createUser failed: ${createResult.error?.message || 'missing-user-id'}`);
    }

    userId = createResult.data.user.id;
    await delay(300);

    const signInClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const signInResult = await signInClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInResult.error || !signInResult.data?.session?.access_token) {
      throw new Error(`signIn failed: ${signInResult.error?.message || 'missing-access-token'}`);
    }

    const accessToken = signInResult.data.session.access_token;

    realtimeClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const channelName = `live-updates:${userId}`;
    channel = realtimeClient.channel(channelName, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    let resolveEvent = null;
    let rejectEvent = null;

    const eventPromise = new Promise((resolve, reject) => {
      resolveEvent = resolve;
      rejectEvent = reject;
    });

    const eventTimer = setTimeout(() => {
      rejectEvent(new Error('Realtime event was not received in time'));
    }, 10000);

    channel.on('broadcast', { event: 'live' }, (event) => {
      const payload = event?.payload || {};
      const eventType = normalizeValue(payload?.eventType || payload?.type || payload?.event);
      const innerPayload = payload?.payload && typeof payload.payload === 'object' ? payload.payload : payload;

      if (eventType === 'reviews' && normalizeValue(innerPayload?.reason) === 'realtime-smoke') {
        clearTimeout(eventTimer);
        resolveEvent(innerPayload);
      }
    });

    await waitForSubscription(channel, 10000);

    const publishResponse = await fetch(`${baseUrl}/api/live-updates/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: 'reviews',
        payload: {
          reason: 'realtime-smoke',
          runId,
        },
        targetUserIds: [userId],
      }),
    });

    const publishPayload = await publishResponse.json().catch(() => ({}));
    assertCondition(publishResponse.ok, `publish failed: status=${publishResponse.status} body=${JSON.stringify(publishPayload)}`);

    await eventPromise;
    console.log('Realtime smoke: PASS');
  } finally {
    if (channel) {
      try {
        await channel.unsubscribe();
      } catch {
        // best-effort
      }
    }

    if (userId) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        // best-effort
      }

      try {
        await admin.from('profiles').delete().eq('id', userId);
      } catch {
        // best-effort
      }

      try {
        await admin.from('usernames').delete().eq('user_id', userId);
      } catch {
        // best-effort
      }
    }
  }
}

main().catch((error) => {
  console.error(`Realtime smoke: FAIL (${error?.message || error})`);
  process.exit(1);
});
