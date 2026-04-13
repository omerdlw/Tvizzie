import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { ROLLOUT_CONFIG } from '@/config/rollout.config';
import { getRealtimeMode } from '@/config/provider.config';
import { createAdminPayload } from './response.server';

const OVERVIEW_REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INFRA_INTERNAL_TOKEN',
];

function normalizeValue(value) {
  return String(value || '').trim();
}

function resolveWindowRange(windowHours = 24) {
  const nowMs = Date.now();
  const windowMs = Math.max(1, Number(windowHours)) * 60 * 60 * 1000;
  const sinceMs = nowMs - windowMs;
  const previousSinceMs = nowMs - windowMs * 2;

  return {
    nowMs,
    previousSinceMs,
    previousSinceIso: new Date(previousSinceMs).toISOString(),
    sinceMs,
    sinceIso: new Date(sinceMs).toISOString(),
  };
}

function toTimestamp(value) {
  const timestamp = Date.parse(normalizeValue(value));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function calculateTrend(currentValue, previousValue) {
  const current = toInteger(currentValue, 0);
  const previous = toInteger(previousValue, 0);
  const delta = current - previous;
  const deltaRate = previous > 0 ? Number(((delta / previous) * 100).toFixed(1)) : current > 0 ? 100 : 0;

  return {
    current,
    delta,
    deltaRate,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    previous,
  };
}

function countTimestampsInRange(values = [], startMs = 0, endMs = Number.MAX_SAFE_INTEGER) {
  return values.reduce((count, item) => {
    const timestamp = toTimestamp(item);

    if (timestamp === null) {
      return count;
    }

    if (timestamp >= startMs && timestamp < endMs) {
      return count + 1;
    }

    return count;
  }, 0);
}

async function safeLoad(source, loader) {
  try {
    return {
      data: await loader(),
      error: null,
      source,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        code: 'ADMIN_SOURCE_ERROR',
        message: normalizeValue(error?.message) || `${source} could not be loaded`,
        source,
      },
      source,
    };
  }
}

async function countRows(admin, tableName) {
  const result = await admin.from(tableName).select('*', {
    count: 'exact',
    head: true,
  });

  if (result.error) {
    throw new Error(result.error.message || `${tableName} count could not be loaded`);
  }

  return toCount(result.count);
}

async function countRowsBetween(admin, tableName, timestampColumn, sinceIso, untilIso) {
  const result = await admin
    .from(tableName)
    .select('*', {
      count: 'exact',
      head: true,
    })
    .gte(timestampColumn, sinceIso)
    .lt(timestampColumn, untilIso);

  if (result.error) {
    throw new Error(result.error.message || `${tableName} range count could not be loaded`);
  }

  return toCount(result.count);
}

async function loadAuthUsersSnapshot(admin) {
  let currentPage = 1;
  const perPage = 200;
  const rows = [];

  while (currentPage <= 50) {
    const result = await admin.auth.admin.listUsers({
      page: currentPage,
      perPage,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Auth users could not be loaded');
    }

    const users = Array.isArray(result.data?.users) ? result.data.users : [];

    users.forEach((user) => {
      rows.push({
        createdAt: normalizeValue(user?.created_at) || null,
        lastSignInAt: normalizeValue(user?.last_sign_in_at) || null,
      });
    });

    if (users.length < perPage) {
      break;
    }

    currentPage += 1;
  }

  return rows;
}

function evaluateEnvironment() {
  const missing = OVERVIEW_REQUIRED_ENV_KEYS.filter((key) => !normalizeValue(process.env[key]));

  return {
    missing,
    ok: missing.length === 0,
  };
}

function resolveGapStatus(gap) {
  if (!Number.isFinite(Number(gap))) {
    return 'unknown';
  }

  const absoluteGap = Math.abs(Number(gap));

  if (absoluteGap === 0) {
    return 'healthy';
  }

  if (absoluteGap <= 2) {
    return 'degraded';
  }

  return 'error';
}

function buildTopActivityEvents(rows = []) {
  const counters = new Map();

  rows.forEach((row) => {
    const eventType = normalizeValue(row?.event_type) || 'unknown';
    counters.set(eventType, (counters.get(eventType) || 0) + 1);
  });

  return [...counters.entries()]
    .map(([eventType, count]) => ({
      count,
      eventType,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export async function loadAdminOverviewPayload({ windowHours = 24 } = {}) {
  const admin = createAdminClient();
  const envState = evaluateEnvironment();
  const range = resolveWindowRange(windowHours);

  const [
    profilesResult,
    lifecycleResult,
    profileCountersResult,
    authUsersSnapshotResult,
    notificationsResult,
    unreadNotificationsResult,
    staleUnreadNotificationsResult,
    auditLogsResult,
    activityCurrentResult,
    activityPreviousResult,
    reviewsCurrentResult,
    reviewsPreviousResult,
    listsCurrentResult,
    listsPreviousResult,
    activityFeedResult,
    activityWindowRowsResult,
  ] = await Promise.all([
    safeLoad('profiles_count', () => countRows(admin, 'profiles')),
    safeLoad('account_lifecycle_count', () => countRows(admin, 'account_lifecycle')),
    safeLoad('profile_counters_count', () => countRows(admin, 'profile_counters')),
    safeLoad('auth_users_snapshot', () => loadAuthUsersSnapshot(admin)),
    safeLoad('notifications_count', () => countRows(admin, 'notifications')),
    safeLoad('notifications_unread', async () => {
      const result = await admin.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false);

      if (result.error) {
        throw new Error(result.error.message || 'Unread notifications count could not be loaded');
      }

      return toCount(result.count);
    }),
    safeLoad('notifications_stale_unread', async () => {
      const staleSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = await admin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .lt('created_at', staleSince);

      if (result.error) {
        throw new Error(result.error.message || 'Stale unread notifications count could not be loaded');
      }

      return toCount(result.count);
    }),
    safeLoad('auth_audit_logs_count', () => countRows(admin, 'auth_audit_logs')),
    safeLoad('activity_window_current', () =>
      countRowsBetween(admin, 'activity', 'created_at', range.sinceIso, new Date(range.nowMs).toISOString())
    ),
    safeLoad('activity_window_previous', () =>
      countRowsBetween(admin, 'activity', 'created_at', range.previousSinceIso, range.sinceIso)
    ),
    safeLoad('reviews_window_current', async () => {
      const [mediaReviews, listReviews] = await Promise.all([
        countRowsBetween(admin, 'media_reviews', 'created_at', range.sinceIso, new Date(range.nowMs).toISOString()),
        countRowsBetween(admin, 'list_reviews', 'created_at', range.sinceIso, new Date(range.nowMs).toISOString()),
      ]);

      return toInteger(mediaReviews) + toInteger(listReviews);
    }),
    safeLoad('reviews_window_previous', async () => {
      const [mediaReviews, listReviews] = await Promise.all([
        countRowsBetween(admin, 'media_reviews', 'created_at', range.previousSinceIso, range.sinceIso),
        countRowsBetween(admin, 'list_reviews', 'created_at', range.previousSinceIso, range.sinceIso),
      ]);

      return toInteger(mediaReviews) + toInteger(listReviews);
    }),
    safeLoad('lists_window_current', () =>
      countRowsBetween(admin, 'lists', 'created_at', range.sinceIso, new Date(range.nowMs).toISOString())
    ),
    safeLoad('lists_window_previous', () => countRowsBetween(admin, 'lists', 'created_at', range.previousSinceIso, range.sinceIso)),
    safeLoad('activity_feed', async () => {
      const result = await admin
        .from('activity')
        .select('event_type,user_id,created_at,payload')
        .order('created_at', {
          ascending: false,
        })
        .limit(20);

      if (result.error) {
        throw new Error(result.error.message || 'Activity feed could not be loaded');
      }

      return Array.isArray(result.data) ? result.data : [];
    }),
    safeLoad('activity_window_rows', async () => {
      const result = await admin
        .from('activity')
        .select('event_type,created_at')
        .gte('created_at', range.sinceIso)
        .order('created_at', {
          ascending: false,
        })
        .limit(5000);

      if (result.error) {
        throw new Error(result.error.message || 'Activity window rows could not be loaded');
      }

      return Array.isArray(result.data) ? result.data : [];
    }),
  ]);

  const errors = [
    profilesResult.error,
    lifecycleResult.error,
    profileCountersResult.error,
    authUsersSnapshotResult.error,
    notificationsResult.error,
    unreadNotificationsResult.error,
    staleUnreadNotificationsResult.error,
    auditLogsResult.error,
    activityCurrentResult.error,
    activityPreviousResult.error,
    reviewsCurrentResult.error,
    reviewsPreviousResult.error,
    listsCurrentResult.error,
    listsPreviousResult.error,
    activityFeedResult.error,
    activityWindowRowsResult.error,
  ].filter(Boolean);

  const profilesCount = toCount(profilesResult.data);
  const lifecycleCount = toCount(lifecycleResult.data);
  const profileCountersCount = toCount(profileCountersResult.data);
  const authUsers = Array.isArray(authUsersSnapshotResult.data) ? authUsersSnapshotResult.data : [];
  const authUsersCount = authUsers.length;
  const notificationsCount = toCount(notificationsResult.data);
  const unreadNotificationsCount = toCount(unreadNotificationsResult.data);
  const staleUnreadNotificationsCount = toCount(staleUnreadNotificationsResult.data);
  const authAuditLogsCount = toCount(auditLogsResult.data);
  const authProfileGap =
    authUsersCount !== null && profilesCount !== null ? Number(authUsersCount - profilesCount) : null;
  const lifecycleCoverageGap =
    profilesCount !== null && lifecycleCount !== null ? Number(profilesCount - lifecycleCount) : null;
  const profileCounterCoverageGap =
    profilesCount !== null && profileCountersCount !== null ? Number(profilesCount - profileCountersCount) : null;

  const usersCurrent = countTimestampsInRange(
    authUsers.map((row) => row.createdAt),
    range.sinceMs,
    range.nowMs
  );
  const usersPrevious = countTimestampsInRange(
    authUsers.map((row) => row.createdAt),
    range.previousSinceMs,
    range.sinceMs
  );
  const activeUsersCurrent = countTimestampsInRange(
    authUsers.map((row) => row.lastSignInAt),
    range.sinceMs,
    range.nowMs
  );

  const userGrowthTrend = calculateTrend(usersCurrent, usersPrevious);
  const activityTrend = calculateTrend(activityCurrentResult.data, activityPreviousResult.data);
  const reviewTrend = calculateTrend(reviewsCurrentResult.data, reviewsPreviousResult.data);
  const listTrend = calculateTrend(listsCurrentResult.data, listsPreviousResult.data);

  const activityFeed = (Array.isArray(activityFeedResult.data) ? activityFeedResult.data : []).map((item, index) => ({
    createdAt: normalizeValue(item?.created_at) || null,
    eventType: normalizeValue(item?.event_type) || 'unknown',
    id: `${normalizeValue(item?.created_at)}::${normalizeValue(item?.event_type)}::${index + 1}`,
    userId: normalizeValue(item?.user_id) || null,
  }));

  const topActivityEvents = buildTopActivityEvents(activityWindowRowsResult.data || []);

  return createAdminPayload({
    data: {
      activity: {
        feed: activityFeed,
        topEvents: topActivityEvents,
      },
      counts: {
        accountLifecycle: lifecycleCount,
        activeUsersInWindow: activeUsersCurrent,
        authAuditLogs: authAuditLogsCount,
        authUsers: authUsersCount,
        notifications: notificationsCount,
        notificationsStaleUnread: staleUnreadNotificationsCount,
        notificationsUnread: unreadNotificationsCount,
        profileCounters: profileCountersCount,
        profiles: profilesCount,
      },
      drift: {
        authProfileGap,
        lifecycleCoverageGap,
        profileCounterCoverageGap,
      },
      env: envState,
      rollout: {
        canaryPercent: ROLLOUT_CONFIG.canaryPercent,
        defaultMode: ROLLOUT_CONFIG.defaultMode,
        domains: Object.keys(ROLLOUT_CONFIG.domains || {}),
      },
      runtime: {
        realtimeMode: getRealtimeMode(),
      },
      trends: {
        activity: activityTrend,
        lists: listTrend,
        reviews: reviewTrend,
        users: userGrowthTrend,
      },
      windowHours,
      windowStart: range.sinceIso,
    },
    errors,
    partial: errors.length > 0,
    widgets: [
      {
        description: envState.ok ? 'Required runtime env keys are present' : `Missing keys: ${envState.missing.join(', ')}`,
        href: '/api/health',
        id: 'runtime-health',
        source: 'runtime',
        status: envState.ok ? 'healthy' : 'error',
        title: 'Runtime Health',
        value: envState.ok ? 'Healthy' : 'Missing env',
      },
      {
        description: 'Difference between auth.users and public.profiles counts',
        id: 'auth-profile-drift',
        source: 'auth',
        status: resolveGapStatus(authProfileGap),
        title: 'Auth/Profile Drift',
        value: authProfileGap === null ? 'n/a' : authProfileGap,
      },
      {
        description: 'Difference between public.profiles and public.account_lifecycle counts',
        id: 'lifecycle-coverage',
        source: 'account_lifecycle',
        status: resolveGapStatus(lifecycleCoverageGap),
        title: 'Lifecycle Coverage Gap',
        value: lifecycleCoverageGap === null ? 'n/a' : lifecycleCoverageGap,
      },
      {
        description: 'Current write rollout defaults',
        href: '/api/system/rollout?domain=account&endpoint=account-profile-write&userId=admin-dashboard',
        id: 'rollout-default',
        source: 'rollout',
        status: 'healthy',
        title: 'Rollout Mode',
        value: `${ROLLOUT_CONFIG.defaultMode} (${ROLLOUT_CONFIG.canaryPercent}%)`,
      },
      {
        description: 'Realtime mode used by the app runtime',
        id: 'runtime-realtime',
        source: 'runtime',
        status: 'healthy',
        title: 'Realtime Mode',
        value: getRealtimeMode(),
      },
    ],
  });
}
