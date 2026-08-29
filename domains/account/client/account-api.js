'use client';

import { requestApiJson } from '@/infrastructure/http/client';

const accountReadInFlight = new Map();
const accountReadStats = new Map();
const MAX_ACCOUNT_READ_STATS = 100;

function serializeReadValue(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(serializeReadValue).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeReadValue(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
}

export function buildAccountReadKey(path, query = null) {
  return `${String(path || '').trim()}?${serializeReadValue(query || {})}`;
}

function updateAccountReadStats({ coalesced = false, durationMs, key, ok = true }) {
  const path = String(key || '').split('?')[0] || 'unknown';
  const previous = accountReadStats.get(path) || {
    coalesced: 0,
    failures: 0,
    lastDurationMs: 0,
    requests: 0,
    successes: 0,
  };
  const next = coalesced
    ? {
        ...previous,
        coalesced: previous.coalesced + 1,
      }
    : {
        ...previous,
        failures: previous.failures + (ok ? 0 : 1),
        lastDurationMs: Math.round(Math.max(0, Number(durationMs) || 0)),
        requests: previous.requests + 1,
        successes: previous.successes + (ok ? 1 : 0),
      };

  accountReadStats.set(path, next);
  if (accountReadStats.size > MAX_ACCOUNT_READ_STATS) {
    accountReadStats.delete(accountReadStats.keys().next().value);
  }
}

export function requestAccountRead(path, query = null) {
  const key = buildAccountReadKey(path, query);
  const existingRequest = accountReadInFlight.get(key);
  if (existingRequest) {
    updateAccountReadStats({ coalesced: true, durationMs: 0, key, ok: true });
    return existingRequest;
  }

  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const request = Promise.resolve()
    .then(() => requestApiJson(path, { query }))
    .then(
      (payload) => {
        updateAccountReadStats({
          durationMs:
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt,
          key,
          ok: true,
        });
        return payload;
      },
      (error) => {
        updateAccountReadStats({
          durationMs:
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt,
          key,
          ok: false,
        });
        throw error;
      },
    )
    .finally(() => {
      accountReadInFlight.delete(key);
    });

  accountReadInFlight.set(key, request);
  return request;
}

export function getAccountReadStats() {
  return Object.fromEntries(
    Array.from(accountReadStats.entries()).map(([path, stats]) => [path, { ...stats }]),
  );
}

export function resetAccountReadStats() {
  accountReadStats.clear();
}

export function fetchAccountActivityFeed(query) {
  return requestAccountRead('/api/account/activity', query);
}

export function fetchAccountReviewFeed(query) {
  return requestAccountRead('/api/account/reviews', query);
}
