import 'server-only';

import { fetchManagementEdgeFunctionLogs, fetchManagementFunctions } from './management-api.server';
import { createAdminPayload } from './response.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeUpperOrFallback(value, fallback = 'UNKNOWN') {
  const normalized = normalizeValue(value).toUpperCase();
  return normalized || fallback;
}

function normalizeFunctionItem(item = {}) {
  return {
    id: normalizeValue(item.id) || null,
    name: normalizeValue(item.name || item.slug) || 'Unknown',
    slug: normalizeValue(item.slug) || null,
    status: normalizeUpperOrFallback(item.status, 'UNKNOWN'),
    updatedAt: normalizeValue(item.updated_at || item.updatedAt) || null,
    verifyJwt: item.verify_jwt === true || item.verifyJwt === true,
    version: Number.isFinite(Number(item.version)) ? Number(item.version) : null,
  };
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

function resolveLogLimit(windowHours) {
  const proposed = Math.round(windowHours * 2);
  return Math.max(120, Math.min(500, proposed));
}

function parseLogStatusCode(logItem = {}) {
  const statusCode = Number(logItem?.status_code || logItem?.statusCode || logItem?.response_status || 0);
  return Number.isFinite(statusCode) && statusCode > 0 ? statusCode : null;
}

function parseLogMessage(logItem = {}) {
  return normalizeValue(logItem?.event_message || logItem?.message || logItem?.msg || logItem?.error || logItem?.text);
}

function parseLogTimestamp(logItem = {}) {
  return normalizeValue(
    logItem?.timestamp || logItem?.created_at || logItem?.createdAt || logItem?.time || logItem?.date
  );
}

function parseLogFunctionName(logItem = {}) {
  return normalizeValue(
    logItem?.function_name ||
      logItem?.functionName ||
      logItem?.function_slug ||
      logItem?.function ||
      logItem?.metadata?.function_name ||
      logItem?.metadata?.function ||
      logItem?.request?.function
  );
}

function isRuntimeIssue(logItem = {}) {
  const statusCode = parseLogStatusCode(logItem) || 0;
  const message = normalizeLowerValue(parseLogMessage(logItem));

  if (statusCode >= 500) {
    return true;
  }

  if (message.includes('error') || message.includes('exception')) {
    return true;
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return true;
  }

  return false;
}

function summarizeRuntimeSignals(logItems = []) {
  if (!Array.isArray(logItems) || logItems.length === 0) {
    return {
      errorCount: 0,
      timeoutCount: 0,
    };
  }

  return logItems.reduce(
    (accumulator, logItem) => {
      const statusCode = parseLogStatusCode(logItem) || 0;
      const message = normalizeLowerValue(parseLogMessage(logItem));

      if (statusCode >= 500 || message.includes('error') || message.includes('exception')) {
        accumulator.errorCount += 1;
      }

      if (message.includes('timeout') || message.includes('timed out')) {
        accumulator.timeoutCount += 1;
      }

      return accumulator;
    },
    {
      errorCount: 0,
      timeoutCount: 0,
    }
  );
}

function buildRecentRuntimeIssues(logItems = [], limit = 20) {
  return (Array.isArray(logItems) ? logItems : [])
    .filter((item) => isRuntimeIssue(item))
    .map((item, index) => {
      const timestamp = parseLogTimestamp(item);
      const message = parseLogMessage(item);
      const statusCode = parseLogStatusCode(item);

      return {
        id: normalizeValue(item?.id) || `runtime-issue-${index + 1}`,
        functionName: parseLogFunctionName(item) || 'unknown',
        isTimeout: normalizeLowerValue(message).includes('timeout') || normalizeLowerValue(message).includes('timed out'),
        message: message || 'No message provided',
        statusCode,
        timestamp: timestamp || null,
      };
    })
    .sort((a, b) => {
      const left = Date.parse(a.timestamp || '');
      const right = Date.parse(b.timestamp || '');

      if (Number.isNaN(left) || Number.isNaN(right)) {
        return 0;
      }

      return right - left;
    })
    .slice(0, limit);
}

export async function loadAdminFunctionsPayload({ windowHours = 24 } = {}) {
  const windowLabel = resolveWindowLabel(windowHours);
  const logLimit = resolveLogLimit(windowHours);

  const functionsResult = await fetchManagementFunctions();
  const logResult = await fetchManagementEdgeFunctionLogs(logLimit);
  const normalizedFunctions = functionsResult.items.map((item) => normalizeFunctionItem(item));
  const activeFunctions = normalizedFunctions.filter((item) => item.status === 'ACTIVE');
  const jwtProtectedCount = normalizedFunctions.filter((item) => item.verifyJwt).length;
  const runtimeSignals = summarizeRuntimeSignals(logResult.items);
  const recentRuntimeIssues = buildRecentRuntimeIssues(logResult.items, 20);
  const hasLiveInventory = functionsResult.available;
  const hasLiveLogs = logResult.available;
  const errors = [functionsResult.error, logResult.error].filter(Boolean);

  const jwtCoverage =
    normalizedFunctions.length > 0 ? Number(((jwtProtectedCount / normalizedFunctions.length) * 100).toFixed(1)) : 0;

  return createAdminPayload({
    data: {
      functions: normalizedFunctions,
      inventorySource: functionsResult.path || null,
      logSource: logResult.path || null,
      recentRuntimeIssues,
      runtimeSignals,
      summary: {
        activeCount: activeFunctions.length,
        jwtCoverage,
        totalCount: normalizedFunctions.length,
      },
      windowHours,
    },
    errors,
    partial: !hasLiveInventory || !hasLiveLogs,
    widgets: [
      {
        description: hasLiveInventory
          ? 'Active edge functions discovered from management API'
          : 'Function inventory is unavailable in limited mode',
        id: 'edge-function-count',
        source: 'functions',
        status: hasLiveInventory ? 'healthy' : 'unknown',
        title: 'Active Edge Functions',
        value: hasLiveInventory ? activeFunctions.length : 'Limited',
      },
      {
        description: hasLiveInventory
          ? 'Share of functions with verify_jwt enabled'
          : 'JWT coverage unavailable in limited mode',
        id: 'edge-function-jwt-coverage',
        source: 'functions',
        status: hasLiveInventory ? (jwtCoverage >= 70 ? 'healthy' : 'degraded') : 'unknown',
        title: 'JWT Protection Coverage',
        value: hasLiveInventory ? `${jwtCoverage}%` : 'Limited',
      },
      {
        description: hasLiveLogs
          ? `Recent edge runtime errors/timeouts in ${windowLabel}`
          : 'Runtime log stream unavailable in limited mode',
        id: 'edge-function-runtime-signal',
        source: 'edge-logs',
        status: hasLiveLogs
          ? runtimeSignals.errorCount > 0 || runtimeSignals.timeoutCount > 0
            ? 'degraded'
            : 'healthy'
          : 'unknown',
        title: 'Runtime Error/Timeout Signal',
        value: hasLiveLogs
          ? `Errors ${runtimeSignals.errorCount} · Timeouts ${runtimeSignals.timeoutCount}`
          : 'Limited',
      },
    ],
  });
}
