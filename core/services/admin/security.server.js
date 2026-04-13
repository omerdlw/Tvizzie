import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { fetchManagementAdvisors } from './management-api.server';
import { createAdminPayload } from './response.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function resolveWindowLabel(windowHours) {
  if (windowHours === 24) {
    return '24h';
  }

  if (windowHours === 168) {
    return '7d';
  }

  if (windowHours === 720) {
    return '30d';
  }

  return `${windowHours}h`;
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

function isFailureRow(row = {}) {
  const eventType = normalizeLowerValue(row?.event_type);
  const status = normalizeLowerValue(row?.status || row?.outcome);

  return (
    status.includes('failure') ||
    status.includes('failed') ||
    status.includes('error') ||
    eventType.includes('failed') ||
    eventType.includes('error')
  );
}

function buildEventSummary(rows = []) {
  const summary = {
    failureCount: 0,
    failureRate: 0,
    loginCount: 0,
    passwordResetCount: 0,
    signupCount: 0,
    totalEvents: rows.length,
  };

  rows.forEach((row) => {
    const eventType = normalizeLowerValue(row?.event_type);

    if (eventType.includes('login')) {
      summary.loginCount += 1;
    }

    if (eventType.includes('signup') || eventType.includes('sign-up') || eventType.includes('user_signedup')) {
      summary.signupCount += 1;
    }

    if (eventType.includes('password') && (eventType.includes('reset') || eventType.includes('change'))) {
      summary.passwordResetCount += 1;
    }

    if (isFailureRow(row)) {
      summary.failureCount += 1;
    }
  });

  summary.failureRate =
    summary.totalEvents > 0 ? Number((summary.failureCount / summary.totalEvents).toFixed(4)) : 0;

  return summary;
}

function buildLifecycleSummary(rows = []) {
  const counters = {
    ACTIVE: 0,
    DELETED: 0,
    PENDING_CHANGE: 0,
    PENDING_DELETE: 0,
    UNKNOWN: 0,
  };

  rows.forEach((row) => {
    const state = normalizeValue(row?.state).toUpperCase();

    if (Object.hasOwn(counters, state)) {
      counters[state] += 1;
      return;
    }

    counters.UNKNOWN += 1;
  });

  return counters;
}

function sortCounterMap(counterMap) {
  return [...counterMap.entries()]
    .map(([label, count]) => ({
      count,
      label,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function buildFailureBreakdowns(rows = []) {
  const failures = rows.filter((row) => isFailureRow(row));
  const byEventType = new Map();
  const byProvider = new Map();
  const byActor = new Map();

  failures.forEach((row) => {
    const eventType = normalizeValue(row?.event_type) || 'unknown';
    const provider = normalizeValue(row?.provider) || 'unknown';
    const actorKey =
      normalizeValue(row?.user_id_hash) || normalizeValue(row?.email_masked) || normalizeValue(row?.user_id) || 'unknown';

    byEventType.set(eventType, (byEventType.get(eventType) || 0) + 1);
    byProvider.set(provider, (byProvider.get(provider) || 0) + 1);
    byActor.set(actorKey, (byActor.get(actorKey) || 0) + 1);
  });

  const repeatedFailureActors = sortCounterMap(byActor)
    .filter((item) => item.label !== 'unknown' && item.count >= 2)
    .slice(0, 10)
    .map((item) => ({
      actor: item.label,
      count: item.count,
    }));

  return {
    failureByEventType: sortCounterMap(byEventType),
    failureByProvider: sortCounterMap(byProvider),
    repeatedFailureActors,
  };
}

function buildRecentFailureEvents(rows = []) {
  return rows
    .filter((row) => isFailureRow(row))
    .map((row, index) => ({
      createdAt: normalizeValue(row?.created_at) || null,
      emailMasked: normalizeValue(row?.email_masked) || null,
      eventType: normalizeValue(row?.event_type) || 'unknown',
      id: normalizeValue(row?.id) || `${normalizeValue(row?.created_at)}::${index + 1}`,
      outcome: normalizeValue(row?.outcome || row?.status) || 'unknown',
      provider: normalizeValue(row?.provider) || 'unknown',
      userHash: normalizeValue(row?.user_id_hash) || null,
    }))
    .slice(0, 30);
}

function resolveAnomalySignal(summary, windowLabel) {
  if (!summary || summary.totalEvents === 0) {
    return {
      description: `No recent auth audit events in the selected window (${windowLabel})`,
      status: 'unknown',
      value: 'n/a',
    };
  }

  const hasAnomaly = summary.totalEvents >= 20 && summary.failureRate >= 0.25;

  return {
    description: `Failure rate is ${Math.round(summary.failureRate * 100)}% in ${windowLabel}`,
    status: hasAnomaly ? 'degraded' : 'healthy',
    value: `${Math.round(summary.failureRate * 100)}%`,
  };
}

function resolveLeakedPasswordSignal(advisorsResult) {
  if (!advisorsResult?.available) {
    return {
      description: 'Security advisors unavailable (set SUPABASE_MANAGEMENT_TOKEN for live checks)',
      status: 'unknown',
      value: 'Unknown',
    };
  }

  const lints = Array.isArray(advisorsResult.items) ? advisorsResult.items : [];
  const leakedPasswordLint = lints.find(
    (lint) => normalizeLowerValue(lint?.name) === 'auth_leaked_password_protection'
  );

  if (!leakedPasswordLint) {
    return {
      description: 'No leaked password advisory found',
      status: 'healthy',
      value: 'No warning',
    };
  }

  return {
    description: normalizeValue(leakedPasswordLint?.detail || leakedPasswordLint?.description),
    status: normalizeLowerValue(leakedPasswordLint?.level) === 'warn' ? 'degraded' : 'healthy',
    value: normalizeValue(leakedPasswordLint?.title) || 'Warning',
  };
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

function mapSecurityFinding(item = {}, index = 0) {
  const level = normalizeFindingLevel(item.level || item.severity);

  return {
    id: normalizeValue(item?.name) || `security-finding-${index + 1}`,
    level,
    priority: findingPriority(level),
    title: normalizeValue(item?.title || item?.name) || `Security Finding ${index + 1}`,
    summary: normalizeValue(item?.detail || item?.description || item?.message) || 'No detail provided',
  };
}

function buildSecurityFindings(items = []) {
  return items
    .map((item, index) => mapSecurityFinding(item, index))
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, 8);
}

export async function loadAdminSecurityPayload({ windowHours = 24 } = {}) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const windowLabel = resolveWindowLabel(windowHours);
  const rowLimit = windowHours > 168 ? 20000 : windowHours > 24 ? 10000 : 5000;

  const [auditResult, lifecycleResult, advisorsResult] = await Promise.all([
    safeLoad('auth_audit_logs', async () => {
      const result = await admin
        .from('auth_audit_logs')
        .select('id,event_type,status,outcome,created_at,user_id_hash,email_masked,provider,actor,request_id')
        .gte('created_at', since)
        .order('created_at', {
          ascending: false,
        })
        .limit(rowLimit);

      if (result.error) {
        throw new Error(result.error.message || 'Auth audit logs could not be loaded');
      }

      return Array.isArray(result.data) ? result.data : [];
    }),
    safeLoad('account_lifecycle', async () => {
      const result = await admin.from('account_lifecycle').select('state');

      if (result.error) {
        throw new Error(result.error.message || 'Account lifecycle summary could not be loaded');
      }

      return Array.isArray(result.data) ? result.data : [];
    }),
    safeLoad('security_advisors', async () => fetchManagementAdvisors('security')),
  ]);

  const auditRows = auditResult.data || [];
  const eventSummary = buildEventSummary(auditRows);
  const lifecycleSummary = buildLifecycleSummary(lifecycleResult.data || []);
  const anomalySignal = resolveAnomalySignal(eventSummary, windowLabel);
  const leakedPasswordSignal = resolveLeakedPasswordSignal(advisorsResult.data);
  const securityAdvisorItems = Array.isArray(advisorsResult.data?.items) ? advisorsResult.data.items : [];
  const securityFindings = buildSecurityFindings(securityAdvisorItems);
  const failureBreakdown = buildFailureBreakdowns(auditRows);
  const recentFailureEvents = buildRecentFailureEvents(auditRows);

  const errors = [auditResult.error, lifecycleResult.error, advisorsResult.error].filter(Boolean);
  const advisorsUnavailable = !advisorsResult.data?.available;

  return createAdminPayload({
    data: {
      authSummary24h: eventSummary,
      failureBreakdown,
      leakedPasswordProtection: leakedPasswordSignal,
      lifecycleStateCounts: lifecycleSummary,
      recentFailureEvents,
      securityAdvisors: securityAdvisorItems,
      securityFindings,
      windowHours,
      windowStart: since,
    },
    errors,
    partial: errors.length > 0 || advisorsUnavailable,
    widgets: [
      {
        description: `Auth event counts in the selected window (${windowLabel})`,
        id: 'auth-event-summary',
        source: 'auth_audit_logs',
        status: auditResult.error ? 'error' : 'healthy',
        title: `Auth Summary (${windowLabel})`,
        value: `Login ${eventSummary.loginCount} · Signup ${eventSummary.signupCount} · Reset ${eventSummary.passwordResetCount}`,
      },
      {
        description: anomalySignal.description,
        id: 'auth-anomaly-signal',
        source: 'auth_audit_logs',
        status: anomalySignal.status,
        title: 'Auth Anomaly Signal',
        value: anomalySignal.value,
      },
      {
        description: `Actors with repeated failures in ${windowLabel}`,
        id: 'repeated-failure-actors',
        source: 'auth_audit_logs',
        status: failureBreakdown.repeatedFailureActors.length > 0 ? 'degraded' : 'healthy',
        title: 'Repeated Failure Actors',
        value: failureBreakdown.repeatedFailureActors.length,
      },
      {
        description: leakedPasswordSignal.description,
        id: 'leaked-password-protection',
        source: 'security_advisors',
        status: leakedPasswordSignal.status,
        title: 'Leaked Password Protection',
        value: leakedPasswordSignal.value,
      },
      {
        description: 'State distribution for account lifecycle records',
        id: 'lifecycle-state-summary',
        source: 'account_lifecycle',
        status: lifecycleResult.error ? 'error' : 'healthy',
        title: 'Lifecycle State Distribution',
        value: `Active ${lifecycleSummary.ACTIVE} · Pending ${lifecycleSummary.PENDING_CHANGE + lifecycleSummary.PENDING_DELETE}`,
      },
    ],
  });
}
