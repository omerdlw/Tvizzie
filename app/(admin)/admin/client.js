'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { PageGradientShell } from '@/features/layout/page-gradient-backdrop';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';
import UsersSection from './users-section';

const AUTO_REFRESH_INTERVAL_MS = 60_000;

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeStatus(status) {
  const normalized = normalizeValue(status).toLowerCase();

  if (normalized === 'healthy' || normalized === 'degraded' || normalized === 'error') {
    return normalized;
  }

  return 'unknown';
}

function dedupeErrors(errors = []) {
  const seen = new Set();

  return errors.filter((error) => {
    const key = `${normalizeValue(error?.source)}::${normalizeValue(error?.code)}::${normalizeValue(error?.message)}`;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function formatTimestamp(value) {
  if (!value) {
    return 'n/a';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'n/a';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function createEmptyPayload() {
  return {
    data: {
      items: [],
      pagination: {
        hasMore: false,
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1,
      },
      searchTerm: '',
    },
    errors: [],
    generatedAt: null,
    ok: false,
    partial: true,
    source: 'users',
    status: 'unknown',
    widgets: [],
  };
}

async function fetchUsersPayload() {
  const response = await fetch('/api/admin/users?page=1&pageSize=20', {
    cache: 'no-store',
    method: 'GET',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || typeof payload !== 'object') {
    return {
      ...createEmptyPayload(),
      errors: [
        {
          code: 'ADMIN_USERS_FETCH_FAILED',
          message: normalizeValue(payload?.message || payload?.error || `Users request failed (${response.status})`),
          source: 'users',
        },
      ],
      generatedAt: new Date().toISOString(),
      status: 'error',
    };
  }

  return {
    ...createEmptyPayload(),
    ...payload,
    data: payload.data && typeof payload.data === 'object' ? payload.data : createEmptyPayload().data,
    errors: dedupeErrors(Array.isArray(payload.errors) ? payload.errors : []),
    status: normalizeStatus(payload.status),
  };
}

function getStatusTone(status) {
  if (status === 'healthy') {
    return {
      badge: 'border-success/20 bg-success/8 text-success',
      dot: 'bg-success',
    };
  }

  if (status === 'degraded') {
    return {
      badge: 'border-warning/20 bg-warning/8 text-warning',
      dot: 'bg-warning',
    };
  }

  if (status === 'error') {
    return {
      badge: 'border-error/20 bg-error/8 text-error',
      dot: 'bg-error',
    };
  }

  return {
    badge: 'border-black/[0.08] bg-black/[0.02] text-black/55',
    dot: 'bg-black/35',
  };
}

function getStatusLabel(status) {
  if (status === 'healthy') {
    return 'Healthy';
  }

  if (status === 'degraded') {
    return 'Degraded';
  }

  if (status === 'error') {
    return 'Error';
  }

  return 'Unknown';
}

export default function Client({ guard }) {
  const [payload, setPayload] = useState(() => createEmptyPayload());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const requestVersionRef = useRef(0);

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextPayload = await fetchUsersPayload();

      if (requestVersion !== requestVersionRef.current) {
        return;
      }

      setPayload(nextPayload);
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUsers().catch(() => {
      setIsLoading(false);
      setIsRefreshing(false);
    });
  }, [loadUsers]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadUsers({ silent: true }).catch(() => null);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefresh, loadUsers]);

  const status = normalizeStatus(payload?.status);
  const statusTone = getStatusTone(status);
  const errors = dedupeErrors(Array.isArray(payload?.errors) ? payload.errors : []);

  return (
    <PageGradientShell>
      <main className="relative min-h-screen px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1480px] space-y-6">
          <header>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-black/40 uppercase">
                  Admin / Supabase Auth
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                  User Operations Dashboard
                </h1>
                <p className="mt-2 text-[13px] text-black/60">
                  Tek merkez: Supabase Auth, account profile, lifecycle ve kullanıcı aksiyonları.
                </p>
                <p className="mt-1.5 text-[12px] text-black/40">
                  {guard?.userId || 'n/a'} · {guard?.mode || 'unknown'} · role: {guard?.requiredRole || 'admin'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoRefresh((current) => !current)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    autoRefresh
                      ? 'border-success/20 bg-success/8 text-success'
                      : 'border-black/[0.1] bg-white text-black/60 hover:text-black/80'
                  )}
                >
                  <Icon icon={autoRefresh ? 'solar:play-bold' : 'solar:pause-bold'} size={11} />
                  {autoRefresh ? 'Auto 60s' : 'Auto Off'}
                </button>

                <button
                  type="button"
                  onClick={() => loadUsers({ silent: true })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-xs font-medium text-black/55 transition-colors hover:text-black"
                >
                  <Icon icon="solar:refresh-bold" size={11} />
                  {isRefreshing ? 'Refreshing' : 'Refresh'}
                </button>

                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold',
                    statusTone.badge
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', statusTone.dot)} />
                  {getStatusLabel(status)}
                </span>

                <span className="rounded-full border border-black/[0.08] bg-black/[0.02] px-3 py-1.5 text-[11px] font-medium text-black/60">
                  {formatTimestamp(payload?.generatedAt)}
                </span>
              </div>
            </div>
          </header>

          {isLoading ? (
            <section className="rounded-2xl border border-black/[0.07] bg-white p-6 text-sm text-black/55">
              User dashboard loading...
            </section>
          ) : (
            <UsersSection
              payload={payload}
              onRefreshSection={() => {
                loadUsers({ silent: true }).catch(() => null);
              }}
            />
          )}

          {errors.length > 0 ? (
            <section className="border-warning/20 bg-warning/[0.08] text-warning rounded-2xl border p-5 text-sm">
              <p className="text-[11px] font-semibold tracking-wider uppercase">Detected Issues</p>
              <div className="mt-2 space-y-1.5">
                {errors.map((error, index) => (
                  <p key={`${error.source || 'users'}-${index}`}>
                    {normalizeValue(error?.source || 'users')}: {normalizeValue(error?.message || 'Unknown error')}
                  </p>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </PageGradientShell>
  );
}
