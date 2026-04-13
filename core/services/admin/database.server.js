import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { fetchManagementAdvisors } from './management-api.server';
import { createAdminPayload } from './response.server';

const TABLE_COUNT_TARGETS = [
  'profiles',
  'profile_counters',
  'account_lifecycle',
  'lists',
  'list_items',
  'media_reviews',
  'list_reviews',
  'review_likes',
  'list_likes',
  'watchlist',
  'watched',
  'activity',
  'notifications',
  'auth_audit_logs',
  'feedback_submissions',
];

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
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

function resolveWindowRange(windowHours = 24) {
  const nowMs = Date.now();
  const windowMs = Math.max(1, Number(windowHours)) * 60 * 60 * 1000;
  const sinceMs = nowMs - windowMs;
  const previousSinceMs = nowMs - windowMs * 2;

  return {
    nowIso: new Date(nowMs).toISOString(),
    previousSinceIso: new Date(previousSinceMs).toISOString(),
    sinceIso: new Date(sinceMs).toISOString(),
  };
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

  return toInteger(result.count, 0);
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

  return toInteger(result.count, 0);
}

function extractLintCounts(lints = []) {
  return lints.reduce(
    (accumulator, lint) => {
      const lintName = normalizeLowerValue(lint?.name);

      if (lintName === 'unused_index') {
        accumulator.unusedIndexCount += 1;
      }

      if (lintName === 'multiple_permissive_policies') {
        accumulator.multiplePermissivePolicyCount += 1;
      }

      return accumulator;
    },
    {
      multiplePermissivePolicyCount: 0,
      unusedIndexCount: 0,
    }
  );
}

function normalizeFindingLevel(level) {
  const normalized = normalizeLowerValue(level);

  if (normalized.includes('error') || normalized.includes('critical') || normalized.includes('high')) {
    return 'high';
  }

  if (normalized.includes('warn') || normalized.includes('medium')) {
    return 'warn';
  }

  return 'info';
}

function findingPriority(level) {
  if (level === 'high') {
    return 3;
  }

  if (level === 'warn') {
    return 2;
  }

  return 1;
}

function mapDatabaseFinding(item = {}, sourceType = 'performance', index = 0) {
  const level = normalizeFindingLevel(item.level || item.severity);

  return {
    id: normalizeValue(item?.name) || `${sourceType}-finding-${index + 1}`,
    level,
    priority: findingPriority(level),
    sourceType,
    summary: normalizeValue(item?.detail || item?.description || item?.message) || 'No detail provided',
    title: normalizeValue(item?.title || item?.name) || `${sourceType} finding`,
  };
}

function buildTopFindings(performanceItems = [], securityItems = []) {
  const findings = [
    ...performanceItems.map((item, index) => mapDatabaseFinding(item, 'performance', index)),
    ...securityItems.map((item, index) => mapDatabaseFinding(item, 'security', index)),
  ];

  return findings
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, 12);
}

function buildTopTableRows(tableCounts = {}) {
  return Object.entries(tableCounts)
    .map(([table, rows]) => ({
      rows: toInteger(rows, 0),
      table,
    }))
    .sort((a, b) => b.rows - a.rows)
    .slice(0, 12);
}

function formatTrendValue(trend) {
  const sign = trend.delta > 0 ? '+' : '';
  return `${trend.current} (${sign}${trend.delta})`;
}

export async function loadAdminDatabasePayload({ windowHours = 24 } = {}) {
  const admin = createAdminClient();
  const range = resolveWindowRange(windowHours);
  const tableCountTasks = TABLE_COUNT_TARGETS.map((tableName) =>
    safeLoad(`table_count_${tableName}`, () => countRows(admin, tableName))
  );

  const [
    tableCountResults,
    unreadNotificationsResult,
    activityCurrentResult,
    activityPreviousResult,
    listItemsCurrentResult,
    listItemsPreviousResult,
    reviewsCurrentResult,
    reviewsPreviousResult,
    performanceAdvisorsResult,
    securityAdvisorsResult,
  ] = await Promise.all([
    Promise.all(tableCountTasks),
    safeLoad('notifications_unread', async () => {
      const result = await admin.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false);

      if (result.error) {
        throw new Error(result.error.message || 'Unread notifications could not be loaded');
      }

      return toInteger(result.count, 0);
    }),
    safeLoad('activity_window_current', () => countRowsBetween(admin, 'activity', 'created_at', range.sinceIso, range.nowIso)),
    safeLoad('activity_window_previous', () =>
      countRowsBetween(admin, 'activity', 'created_at', range.previousSinceIso, range.sinceIso)
    ),
    safeLoad('list_items_window_current', () =>
      countRowsBetween(admin, 'list_items', 'added_at', range.sinceIso, range.nowIso)
    ),
    safeLoad('list_items_window_previous', () =>
      countRowsBetween(admin, 'list_items', 'added_at', range.previousSinceIso, range.sinceIso)
    ),
    safeLoad('reviews_window_current', async () => {
      const [mediaReviews, listReviews] = await Promise.all([
        countRowsBetween(admin, 'media_reviews', 'created_at', range.sinceIso, range.nowIso),
        countRowsBetween(admin, 'list_reviews', 'created_at', range.sinceIso, range.nowIso),
      ]);

      return toInteger(mediaReviews, 0) + toInteger(listReviews, 0);
    }),
    safeLoad('reviews_window_previous', async () => {
      const [mediaReviews, listReviews] = await Promise.all([
        countRowsBetween(admin, 'media_reviews', 'created_at', range.previousSinceIso, range.sinceIso),
        countRowsBetween(admin, 'list_reviews', 'created_at', range.previousSinceIso, range.sinceIso),
      ]);

      return toInteger(mediaReviews, 0) + toInteger(listReviews, 0);
    }),
    safeLoad('performance_advisors', () => fetchManagementAdvisors('performance')),
    safeLoad('security_advisors', () => fetchManagementAdvisors('security')),
  ]);

  const tableCounts = Object.fromEntries(
    tableCountResults.map((result, index) => [TABLE_COUNT_TARGETS[index], toInteger(result.data, 0)])
  );

  const performanceLints = Array.isArray(performanceAdvisorsResult.data?.items) ? performanceAdvisorsResult.data.items : [];
  const securityLints = Array.isArray(securityAdvisorsResult.data?.items) ? securityAdvisorsResult.data.items : [];
  const lintCounts = extractLintCounts(performanceLints);
  const topFindings = buildTopFindings(performanceLints, securityLints);
  const topTableRows = buildTopTableRows(tableCounts);
  const advisorsAvailable = Boolean(performanceAdvisorsResult.data?.available && securityAdvisorsResult.data?.available);

  const activityTrend = calculateTrend(activityCurrentResult.data, activityPreviousResult.data);
  const listItemsTrend = calculateTrend(listItemsCurrentResult.data, listItemsPreviousResult.data);
  const reviewsTrend = calculateTrend(reviewsCurrentResult.data, reviewsPreviousResult.data);

  const profileLifecycleGap = toInteger(tableCounts.profiles, 0) - toInteger(tableCounts.account_lifecycle, 0);
  const profileCounterGap = toInteger(tableCounts.profiles, 0) - toInteger(tableCounts.profile_counters, 0);

  const errors = [
    ...tableCountResults.map((result) => result.error).filter(Boolean),
    unreadNotificationsResult.error,
    activityCurrentResult.error,
    activityPreviousResult.error,
    listItemsCurrentResult.error,
    listItemsPreviousResult.error,
    reviewsCurrentResult.error,
    reviewsPreviousResult.error,
    performanceAdvisorsResult.error,
    securityAdvisorsResult.error,
  ].filter(Boolean);

  return createAdminPayload({
    data: {
      advisors: {
        performance: performanceLints,
        security: securityLints,
      },
      advisorsAvailable,
      integrity: {
        profileCounterGap,
        profileLifecycleGap,
        unreadNotifications: toInteger(unreadNotificationsResult.data, 0),
      },
      lintCounts,
      tableCounts,
      topFindings,
      topTableRows,
      trends: {
        activity: activityTrend,
        listItems: listItemsTrend,
        reviews: reviewsTrend,
      },
      windowHours,
      windowStart: range.sinceIso,
    },
    errors,
    partial: errors.length > 0 || !advisorsAvailable,
    widgets: [
      {
        description: advisorsAvailable
          ? 'Unused index advisories from performance advisor'
          : 'Unused index signal unavailable in limited mode',
        id: 'unused-indexes',
        source: 'performance_advisors',
        status: advisorsAvailable ? (lintCounts.unusedIndexCount > 0 ? 'degraded' : 'healthy') : 'unknown',
        title: 'Unused Indexes',
        value: advisorsAvailable ? lintCounts.unusedIndexCount : 'Unknown',
      },
      {
        description: advisorsAvailable
          ? 'RLS performance risk: multiple permissive policies'
          : 'Policy risk signal unavailable in limited mode',
        id: 'policy-risk',
        source: 'performance_advisors',
        status: advisorsAvailable ? (lintCounts.multiplePermissivePolicyCount > 0 ? 'degraded' : 'healthy') : 'unknown',
        title: 'Policy Risk Signals',
        value: advisorsAvailable ? lintCounts.multiplePermissivePolicyCount : 'Unknown',
      },
      {
        description: 'Largest operational tables by row count',
        id: 'table-footprint',
        source: 'database',
        status: tableCountResults.some((result) => result.error) ? 'degraded' : 'healthy',
        title: 'Core Table Footprint',
        value: topTableRows.slice(0, 2).map((item) => `${item.table} ${item.rows}`).join(' · '),
      },
      {
        description: 'Profiles vs lifecycle/profile_counters consistency',
        id: 'profile-integrity-gap',
        source: 'database',
        status: Math.abs(profileLifecycleGap) > 0 || Math.abs(profileCounterGap) > 0 ? 'degraded' : 'healthy',
        title: 'Profile Integrity Gap',
        value: `lifecycle ${profileLifecycleGap} · counters ${profileCounterGap}`,
      },
      {
        description: 'Unread notifications backlog',
        id: 'unread-notifications-backlog',
        source: 'notifications',
        status: toInteger(unreadNotificationsResult.data, 0) > 0 ? 'degraded' : 'healthy',
        title: 'Unread Notifications',
        value: toInteger(unreadNotificationsResult.data, 0),
      },
      {
        description: 'Activity events in selected window vs previous',
        id: 'activity-trend',
        source: 'activity',
        status: activityTrend.delta < 0 ? 'degraded' : 'healthy',
        title: 'Activity Trend',
        value: formatTrendValue(activityTrend),
      },
      {
        description: advisorsAvailable
          ? 'Security/performance advisors are live'
          : 'Set SUPABASE_MANAGEMENT_TOKEN to enable live advisor checks',
        id: 'advisor-coverage',
        source: 'advisors',
        status: advisorsAvailable ? 'healthy' : 'unknown',
        title: 'Advisor Coverage',
        value: advisorsAvailable ? 'Live' : 'Limited',
      },
    ],
  });
}
