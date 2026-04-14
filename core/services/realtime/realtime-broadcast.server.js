import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import {
  assertSupabaseServerAdminEnv,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/core/clients/supabase/constants';
import { isRealtimeTransportEnabled } from '@/core/services/realtime/realtime-transport.config';

const REALTIME_ADMIN_CLIENT_KEY = '__tvizzie_realtime_admin_client__';

function normalizeValue(value) {
  return String(value || '').trim();
}

function buildChannelName(userId) {
  return `live-updates:${userId}`;
}

function getRealtimeAdminClient() {
  assertSupabaseServerAdminEnv();

  if (!globalThis[REALTIME_ADMIN_CLIENT_KEY]) {
    globalThis[REALTIME_ADMIN_CLIENT_KEY] = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return globalThis[REALTIME_ADMIN_CLIENT_KEY];
}

export async function publishUserRealtimeBroadcast({ userId, eventType, payload = {} }) {
  if (!isRealtimeTransportEnabled()) {
    return {
      delivered: false,
      reason: 'transport-disabled',
    };
  }

  const normalizedUserId = normalizeValue(userId);
  const normalizedEventType = normalizeValue(eventType);

  if (!normalizedUserId || !normalizedEventType) {
    return {
      delivered: false,
      reason: 'invalid-event',
    };
  }

  let client = null;

  try {
    client = getRealtimeAdminClient();
  } catch {
    return {
      delivered: false,
      reason: 'realtime-config-missing',
    };
  }

  const channel = client.channel(buildChannelName(normalizedUserId), {
    config: {
      broadcast: {
        ack: false,
        self: false,
      },
    },
  });

  try {
    const response = await channel.httpSend('live', {
      eventType: normalizedEventType,
      payload,
    });

    if (response?.success !== true) {
      return {
        delivered: false,
        reason: 'broadcast-send-failed',
        status: response?.status || null,
      };
    }

    return {
      delivered: true,
    };
  } finally {
    if (typeof client?.removeChannel === 'function') {
      client.removeChannel(channel).catch(() => {});
    }
  }
}
