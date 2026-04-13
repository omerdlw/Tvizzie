'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createCsrfHeaders } from '@/core/auth/clients/csrf.client';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

const USERS_PAGE_SIZE = 20;

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeProvider(value) {
  const provider = normalizeLowerValue(value);

  if (!provider) {
    return null;
  }

  if (provider === 'google' || provider === 'google.com') {
    return 'google';
  }

  if (provider === 'email' || provider === 'password') {
    return 'password';
  }

  return provider;
}

function toJsonObjectOrNull(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  const normalized = normalizeValue(value);

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function parseApiError(payload, fallbackMessage) {
  return normalizeValue(payload?.message || payload?.error || payload?.code) || fallbackMessage;
}

function resolveListPayload(payload) {
  return {
    items: Array.isArray(payload?.data?.items) ? payload.data.items : [],
    pagination: payload?.data?.pagination || {
      hasMore: false,
      page: 1,
      pageSize: USERS_PAGE_SIZE,
      total: 0,
      totalPages: 1,
    },
  };
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
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) {
    return 'n/a';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'n/a';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function shortenId(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return 'n/a';
  }

  if (normalized.length <= 12) {
    return normalized;
  }

  return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}

function safeContentSnippet(value, maxLength = 72) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return '-';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function buildDisplayName(user = {}) {
  return (
    normalizeValue(user?.profile?.displayName) ||
    normalizeValue(user?.profile?.username) ||
    normalizeValue(user?.auth?.email) ||
    shortenId(user?.id)
  );
}

function buildInitials(user = {}) {
  const label = buildDisplayName(user);
  const tokens = label
    .split(/\s+/)
    .map((token) => normalizeValue(token))
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return 'U';
  }

  return tokens.map((token) => token[0].toUpperCase()).join('');
}

function resolveUserStatus(user = {}) {
  if (user?.auth?.disabled) {
    return {
      label: 'Blocked',
      tone: 'danger',
      value: 'blocked',
    };
  }

  const lifecycleState = normalizeLowerValue(user?.lifecycle?.state);

  if (lifecycleState && lifecycleState !== 'active') {
    return {
      label: 'Warned',
      tone: 'warning',
      value: 'warned',
    };
  }

  if (user?.auth?.emailConfirmed !== true) {
    return {
      label: 'Warned',
      tone: 'warning',
      value: 'warned',
    };
  }

  return {
    label: 'Active',
    tone: 'success',
    value: 'active',
  };
}

function resolveStatusChipClass(tone) {
  if (tone === 'success') {
    return 'border-success/20 bg-success/10 text-success';
  }

  if (tone === 'warning') {
    return 'border-warning/20 bg-warning/10 text-warning';
  }

  return 'border-error/20 bg-error/10 text-error';
}

function resolveDateRangeDays(range) {
  if (range === '7d') {
    return 7;
  }

  if (range === '30d') {
    return 30;
  }

  return null;
}

function buildPaginationTokens(currentPage, totalPages) {
  const current = Math.max(1, Number(currentPage || 1));
  const total = Math.max(1, Number(totalPages || 1));

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => ({
      type: 'page',
      value: index + 1,
    }));
  }

  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= total).sort((left, right) => left - right);

  const tokens = [];

  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];

    if (index > 0 && value - previous > 1) {
      tokens.push({
        type: 'ellipsis',
        value: `ellipsis-${previous}-${value}`,
      });
    }

    tokens.push({
      type: 'page',
      value,
    });
  });

  return tokens;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseApiError(payload, `Request failed (${response.status})`));
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Response payload is invalid');
  }

  return payload;
}

function Panel({ children, className }) {
  return <section className={cn('rounded-2xl border border-black/[0.08] bg-white', className)}>{children}</section>;
}

function PanelHeader({ title, badge, children }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.07] px-5 py-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[32px] font-semibold tracking-tight text-black">{title}</h2>
        {badge ? (
          <span className="rounded-md border border-black/[0.08] bg-black/[0.03] px-2 py-1 text-[11px] font-medium text-black/60">
            {badge}
          </span>
        ) : null}
      </div>
      {children || null}
    </header>
  );
}

function UserTable({
  items,
  selectedIds,
  selectedUserId,
  onSelectRow,
  onViewRow,
  onToggleRow,
  onToggleAll,
  onRunRowAction,
  isActionRunning,
  allSelected,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead>
          <tr className="border-b border-black/[0.07] bg-black/[0.01]">
            <th className="w-14 px-5 py-3 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 rounded border-black/[0.2]"
              />
            </th>
            <th className="px-5 py-3 text-[13px] font-medium text-black/60">User</th>
            <th className="px-5 py-3 text-[13px] font-medium text-black/60">Email address</th>
            <th className="px-5 py-3 text-[13px] font-medium text-black/60">Username</th>
            <th className="px-5 py-3 text-[13px] font-medium text-black/60">Created date</th>
            <th className="px-5 py-3 text-[13px] font-medium text-black/60">User status</th>
            <th className="w-[220px] px-5 py-3 text-[13px] font-medium text-black/60">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const userId = normalizeValue(item?.id) || `row-${index}`;
            const displayName = buildDisplayName(item);
            const username = normalizeValue(item?.profile?.username);
            const email = normalizeValue(item?.auth?.email) || 'n/a';
            const status = resolveUserStatus(item);
            const rowSelected = normalizeValue(selectedUserId) === userId;
            const checked = selectedIds.includes(userId);

            return (
              <tr
                key={userId}
                className={cn(
                  'border-b border-black/[0.06] transition-colors hover:bg-black/[0.015]',
                  rowSelected && 'bg-black/[0.02]'
                )}
              >
                <td className="px-5 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleRow(userId)}
                    className="h-4 w-4 rounded border-black/[0.2]"
                  />
                </td>

                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => onSelectRow(userId)}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.08] bg-black/[0.03] text-[12px] font-semibold text-black/65">
                      {buildInitials(item)}
                    </span>
                    <span className="text-base font-medium text-black/90">{displayName}</span>
                  </button>
                </td>

                <td className="px-5 py-4 text-[15px] text-black/55">{email}</td>
                <td className="px-5 py-4 text-[15px] text-black/55">{username ? `@${username}` : 'no-username'}</td>
                <td className="px-5 py-4 text-[15px] text-black/55">{formatDateOnly(item?.auth?.createdAt)}</td>

                <td className="px-5 py-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[13px] font-medium',
                      resolveStatusChipClass(status.tone)
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {status.label}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewRow(userId)}
                      className="inline-flex h-8 items-center rounded-md border border-black/[0.08] px-2.5 text-[11px] font-semibold text-black/60 transition-colors hover:text-black"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      disabled={isActionRunning}
                      onClick={() => onRunRowAction(userId, 'revoke_sessions', { reason: 'admin-row-revoke' })}
                      className="inline-flex h-8 items-center rounded-md border border-black/[0.08] px-2.5 text-[11px] font-semibold text-black/60 transition-colors hover:text-black disabled:opacity-50"
                    >
                      Revoke
                    </button>
                    <button
                      type="button"
                      disabled={isActionRunning}
                      onClick={() =>
                        onRunRowAction(
                          userId,
                          item?.auth?.disabled ? 'unban_user' : 'ban_user',
                          item?.auth?.disabled ? {} : { banDurationHours: '24' }
                        )
                      }
                      className={cn(
                        'inline-flex h-8 items-center rounded-md border px-2.5 text-[11px] font-semibold transition-colors disabled:opacity-50',
                        item?.auth?.disabled
                          ? 'border-success/20 bg-success/8 text-success'
                          : 'border-warning/20 bg-warning/8 text-warning'
                      )}
                    >
                      {item?.auth?.disabled ? 'Unban' : 'Ban'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MiniTable({ title, rows = [], emptyMessage, columns = [] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.08]">
      <div className="border-b border-black/[0.06] bg-black/[0.01] px-4 py-3">
        <p className="text-[11px] font-semibold tracking-wider text-black/45 uppercase">{title}</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-black/45">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/[0.06] bg-black/[0.01]">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-2.5 text-[11px] font-semibold tracking-wider text-black/40 uppercase"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`${rowIndex}-${normalizeValue(row?.id || row?.created_at || row?.updated_at)}`}
                  className="border-b border-black/[0.05]"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-2.5 text-[12px] text-black/65">
                      {column.render ? column.render(row) : normalizeValue(row?.[column.key]) || 'n/a'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UsersSection({ payload, onRefreshSection }) {
  const initialList = useMemo(() => resolveListPayload(payload), [payload]);

  const [items, setItems] = useState(initialList.items);
  const [pagination, setPagination] = useState(initialList.pagination);
  const [page, setPage] = useState(Number(initialList.pagination?.page || 1));

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(initialList.items?.[0]?.id || null);
  const [detailTab, setDetailTab] = useState('overview');
  const [detailPayload, setDetailPayload] = useState(null);
  const [pendingDetailScroll, setPendingDetailScroll] = useState(false);
  const selectedUserSectionRef = useRef(null);

  const [isListLoading, setIsListLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);

  const [uiError, setUiError] = useState('');
  const [uiMessage, setUiMessage] = useState('');

  const [authForm, setAuthForm] = useState({
    appMetadataText: '{}',
    email: '',
    emailConfirmed: false,
    password: '',
    role: '',
    signInMode: 'hybrid',
    userMetadataText: '{}',
  });

  const [profileForm, setProfileForm] = useState({
    avatarUrl: '',
    bannerUrl: '',
    description: '',
    displayName: '',
    email: '',
    isPrivate: false,
    username: '',
  });

  const [banDurationHours, setBanDurationHours] = useState('24');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const fetchList = useCallback(async () => {
    setIsListLoading(true);

    try {
      const searchParams = new URLSearchParams({
        page: String(page),
        pageSize: String(USERS_PAGE_SIZE),
      });

      if (searchTerm) {
        searchParams.set('searchTerm', searchTerm);
      }

      if (providerFilter !== 'all') {
        searchParams.set('providerFilter', providerFilter);
      }

      const dateRangeDays = resolveDateRangeDays(dateRange);

      if (dateRangeDays) {
        searchParams.set('dateRangeDays', String(dateRangeDays));
      }

      const response = await fetchJson(`/api/admin/users?${searchParams.toString()}`, {
        cache: 'no-store',
        method: 'GET',
      });

      const next = resolveListPayload(response);

      setItems(next.items);
      setPagination(next.pagination);
    } catch (error) {
      setUiError(normalizeValue(error?.message) || 'Users list could not be loaded');
    } finally {
      setIsListLoading(false);
    }
  }, [dateRange, page, providerFilter, searchTerm]);

  const fetchDetail = useCallback(async (userId) => {
    const normalizedUserId = normalizeValue(userId);

    if (!normalizedUserId) {
      setDetailPayload(null);
      return;
    }

    setIsDetailLoading(true);

    try {
      const response = await fetchJson(`/api/admin/users/${normalizedUserId}`, {
        cache: 'no-store',
        method: 'GET',
      });

      setDetailPayload(response);
    } catch (error) {
      setUiError(normalizeValue(error?.message) || 'User detail could not be loaded');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const executeUserAction = useCallback(async (targetUserId, action, input = {}) => {
    const normalizedUserId = normalizeValue(targetUserId);

    if (!normalizedUserId) {
      throw new Error('userId is required');
    }

    return fetchJson(`/api/admin/users/${normalizedUserId}/actions`, {
      body: JSON.stringify({
        action,
        input,
      }),
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...createCsrfHeaders(),
      },
      method: 'POST',
    });
  }, []);

  const runActionForUserId = useCallback(
    async (targetUserId, action, input = {}, { refreshList = true, refreshDetail = true } = {}) => {
      const normalizedUserId = normalizeValue(targetUserId);

      if (!normalizedUserId) {
        return null;
      }

      setIsActionRunning(true);
      setUiError('');
      setUiMessage('');

      try {
        const response = await executeUserAction(normalizedUserId, action, input);
        setUiMessage(normalizeValue(response?.result?.message) || 'Action completed');

        if (refreshDetail && normalizeValue(selectedUserId) === normalizedUserId) {
          await fetchDetail(normalizedUserId);
        }

        if (refreshList) {
          await fetchList();
        }

        if (onRefreshSection) {
          onRefreshSection();
        }

        return response;
      } catch (error) {
        setUiError(normalizeValue(error?.message) || 'Action failed');
        return null;
      } finally {
        setIsActionRunning(false);
      }
    },
    [executeUserAction, fetchDetail, fetchList, onRefreshSection, selectedUserId]
  );

  const runAction = useCallback(
    async (action, input = {}, options = {}) => runActionForUserId(selectedUserId, action, input, options),
    [runActionForUserId, selectedUserId]
  );

  const runBulkAction = useCallback(
    async (action, input = {}, { refreshList = true, refreshDetail = true } = {}) => {
      const targetIds = [...new Set(selectedIds.map((value) => normalizeValue(value)).filter(Boolean))];

      if (targetIds.length === 0) {
        return;
      }

      setIsActionRunning(true);
      setUiError('');
      setUiMessage('');

      try {
        const failures = [];
        let successCount = 0;

        for (const userId of targetIds) {
          try {
            await executeUserAction(userId, action, input);
            successCount += 1;
          } catch (error) {
            failures.push(`${shortenId(userId)}: ${normalizeValue(error?.message) || 'failed'}`);
          }
        }

        if (successCount > 0) {
          setUiMessage(`${successCount} user action completed`);
        }

        if (failures.length > 0) {
          setUiError(`Bulk action errors (${failures.length}): ${failures.slice(0, 3).join(' | ')}`);
        }

        if (refreshList) {
          await fetchList();
        }

        if (refreshDetail && targetIds.includes(normalizeValue(selectedUserId))) {
          await fetchDetail(selectedUserId);
        }

        if (onRefreshSection) {
          onRefreshSection();
        }
      } finally {
        setIsActionRunning(false);
      }
    },
    [executeUserAction, fetchDetail, fetchList, onRefreshSection, selectedIds, selectedUserId]
  );

  useEffect(() => {
    fetchList().catch(() => null);
  }, [fetchList]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(normalizeValue(searchInput));
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [dateRange, providerFilter, searchTerm]);

  useEffect(() => {
    if (normalizeValue(selectedUserId)) {
      return;
    }

    setSelectedUserId(items?.[0]?.id || null);
  }, [items, selectedUserId]);

  useEffect(() => {
    fetchDetail(selectedUserId).catch(() => null);
  }, [fetchDetail, selectedUserId]);

  useEffect(() => {
    const data = detailPayload?.data || {};
    const auth = data?.auth || {};
    const profile = data?.profile || {};

    const providers = Array.isArray(auth?.providers) ? auth.providers : [];
    const providerSet = new Set(providers.map((provider) => normalizeProvider(provider)));

    const signInMode =
      providerSet.has('password') && providerSet.has('google')
        ? 'hybrid'
        : providerSet.has('password')
          ? 'password'
          : 'google';

    const authId = normalizeValue(auth?.id);

    if (!authId) {
      return;
    }

    setAuthForm({
      appMetadataText: JSON.stringify(auth?.appMetadata || {}, null, 2),
      email: auth?.email || '',
      emailConfirmed: auth?.emailConfirmed === true,
      password: '',
      role: Array.isArray(auth?.roles) ? auth.roles[0] || '' : '',
      signInMode,
      userMetadataText: JSON.stringify(auth?.userMetadata || {}, null, 2),
    });

    setProfileForm({
      avatarUrl: profile?.avatar_url || '',
      bannerUrl: profile?.banner_url || '',
      description: profile?.description || '',
      displayName: profile?.display_name || '',
      email: profile?.email || auth?.email || '',
      isPrivate: profile?.is_private === true,
      username: profile?.username || '',
    });

    setDeleteConfirmText('');
  }, [detailPayload]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const status = resolveUserStatus(item);

      if (statusFilter !== 'all' && status.value !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [items, statusFilter]);

  useEffect(() => {
    const visibleIds = items.map((item) => normalizeValue(item?.id)).filter(Boolean);

    setSelectedIds((current) => current.filter((id) => visibleIds.includes(id)));
  }, [items]);

  const isClientFilterActive = statusFilter !== 'all';
  const showPagination =
    filteredItems.length > 0 &&
    (!isClientFilterActive
      ? Number(pagination?.totalPages || 1) > 1
      : filteredItems.length > Number(pagination?.pageSize || USERS_PAGE_SIZE));

  const allVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(normalizeValue(item?.id)));

  const paginationTokens = useMemo(
    () => buildPaginationTokens(Number(pagination?.page || page), Number(pagination?.totalPages || 1)),
    [page, pagination?.page, pagination?.totalPages]
  );

  const data = detailPayload?.data || {};
  const auth = data?.auth || {};
  const profile = data?.profile || {};
  const lifecycle = data?.lifecycle || {};
  const counters = data?.relationshipCounts || {};
  const usernames = Array.isArray(data?.usernames) ? data.usernames : [];

  const recent = data?.recent || {};
  const activityRows = Array.isArray(recent?.activity) ? recent.activity : [];
  const authRows = Array.isArray(recent?.authAuditLogs) ? recent.authAuditLogs : [];

  const deleteConfirmExpected = selectedUserId ? `DELETE ${selectedUserId}` : '';
  const canDeleteUser = deleteConfirmExpected && deleteConfirmExpected === deleteConfirmText;

  const scrollToSelectedUserPanel = useCallback(() => {
    const target = selectedUserSectionRef.current;

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const handleViewRow = useCallback(
    (userId) => {
      const normalizedTargetUserId = normalizeValue(userId);

      if (!normalizedTargetUserId) {
        return;
      }

      setDetailTab('overview');

      if (normalizeValue(selectedUserId) === normalizedTargetUserId) {
        scrollToSelectedUserPanel();
        return;
      }

      setSelectedUserId(normalizedTargetUserId);
      setPendingDetailScroll(true);
    },
    [scrollToSelectedUserPanel, selectedUserId]
  );

  useEffect(() => {
    if (!pendingDetailScroll || !normalizeValue(selectedUserId)) {
      return;
    }

    scrollToSelectedUserPanel();
    setPendingDetailScroll(false);
  }, [pendingDetailScroll, scrollToSelectedUserPanel, selectedUserId]);

  return (
    <div className="space-y-5">
      {uiError ? (
        <div className="border-error/20 bg-error/[0.08] text-error rounded-xl border px-4 py-3 text-sm">{uiError}</div>
      ) : null}
      {uiMessage ? (
        <div className="border-success/20 bg-success/[0.08] text-success rounded-xl border px-4 py-3 text-sm">
          {uiMessage}
        </div>
      ) : null}

      <Panel>
        <PanelHeader title="User list" badge={`${pagination?.total || 0} users`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] sm:min-w-[360px]">
              <Icon
                icon="solar:magnifer-bold"
                size={17}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-black/35"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search for user"
                className="h-12 w-full rounded-lg border border-black/[0.1] bg-white pr-4 pl-11 text-[17px] font-medium text-black/75 placeholder:text-black/35"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-black/[0.1] bg-white px-4 text-[17px] font-medium text-black/75"
            >
              <Icon icon="solar:filter-bold" size={16} />
              Filters
            </button>

            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="h-12 rounded-lg border border-black/[0.1] bg-white px-4 text-[17px] font-medium text-black/75"
            >
              <option value="all">All time</option>
              <option value="30d">Last 30 days</option>
              <option value="7d">Last 7 days</option>
            </select>
          </div>
        </PanelHeader>

        {showFilters ? (
          <div className="grid gap-3 border-b border-black/[0.06] px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium text-black/60">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="warned">Warned</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>

            <label className="text-xs font-medium text-black/60">
              Provider
              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
              >
                <option value="all">All</option>
                <option value="password">Password</option>
                <option value="google">Google</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setProviderFilter('all');
                  setDateRange('all');
                }}
                className="h-10 rounded-lg border border-black/[0.1] bg-white px-4 text-sm font-medium text-black/65"
              >
                Reset filters
              </button>
            </div>
          </div>
        ) : null}

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] bg-black/[0.01] px-5 py-3">
            <p className="text-sm text-black/65">
              <span className="font-semibold text-black">{selectedIds.length}</span> user selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isActionRunning}
                onClick={() => {
                  const firstId = selectedIds[0];

                  if (firstId) {
                    setSelectedUserId(firstId);
                  }
                }}
                className="inline-flex h-9 items-center rounded-md border border-black/[0.1] bg-white px-3 text-xs font-semibold text-black/60 disabled:opacity-50"
              >
                Open first
              </button>
              <button
                type="button"
                disabled={isActionRunning}
                onClick={() =>
                  runBulkAction('revoke_sessions', { reason: 'admin-bulk-revoke' }, { refreshDetail: false })
                }
                className="inline-flex h-9 items-center rounded-md border border-black/[0.1] bg-white px-3 text-xs font-semibold text-black/60 disabled:opacity-50"
              >
                Revoke sessions
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="inline-flex h-9 items-center rounded-md border border-black/[0.1] bg-white px-3 text-xs font-semibold text-black/60"
              >
                Clear selection
              </button>
            </div>
          </div>
        ) : null}

        {isListLoading ? (
          <p className="px-5 py-4 text-sm text-black/45">Loading users...</p>
        ) : filteredItems.length === 0 ? (
          <p className="px-5 py-4 text-sm text-black/45">No users match current search/filter.</p>
        ) : (
          <UserTable
            items={filteredItems}
            selectedIds={selectedIds}
            selectedUserId={selectedUserId}
            onSelectRow={(userId) => {
              setSelectedUserId(userId);
              setDetailTab('overview');
            }}
            onViewRow={handleViewRow}
            onToggleRow={(userId) => {
              setSelectedIds((current) =>
                current.includes(userId) ? current.filter((value) => value !== userId) : [...current, userId]
              );
            }}
            onToggleAll={() => {
              const visibleIds = filteredItems.map((item) => normalizeValue(item?.id)).filter(Boolean);

              setSelectedIds((current) => {
                const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.includes(id));

                if (allSelected) {
                  return current.filter((id) => !visibleIds.includes(id));
                }

                return [...new Set([...current, ...visibleIds])];
              });
            }}
            onRunRowAction={(userId, action, input) =>
              runActionForUserId(userId, action, input, { refreshDetail: false })
            }
            isActionRunning={isActionRunning}
            allSelected={allVisibleSelected}
          />
        )}

        {showPagination ? (
          <div className="flex items-center justify-center gap-2 border-t border-black/[0.06] px-5 py-3.5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={Number(pagination?.page || page) <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-black/55 disabled:text-black/25"
            >
              <Icon icon="solar:alt-arrow-left-linear" size={16} />
            </button>

            {paginationTokens.map((token) => {
              if (token.type === 'ellipsis') {
                return (
                  <span key={token.value} className="px-2 text-sm text-black/45">
                    ...
                  </span>
                );
              }

              const active = Number(pagination?.page || page) === token.value;

              return (
                <button
                  key={token.value}
                  type="button"
                  onClick={() => setPage(token.value)}
                  className={cn(
                    'h-8 min-w-8 rounded-md px-2 text-sm transition-colors',
                    active ? 'bg-black/[0.06] font-semibold text-black' : 'text-black/60 hover:text-black'
                  )}
                >
                  {token.value}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={Number(pagination?.page || page) >= Number(pagination?.totalPages || 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-black/55 disabled:text-black/25"
            >
              <Icon icon="solar:alt-arrow-right-linear" size={16} />
            </button>
          </div>
        ) : null}
      </Panel>

      {selectedUserId ? (
        <div ref={selectedUserSectionRef}>
          <Panel className="overflow-hidden">
            <div className="border-b border-black/[0.07] px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-black/85">Selected user</p>
                  <p className="mt-0.5 text-[12px] text-black/60">
                    {normalizeValue(profile?.display_name) || normalizeValue(auth?.email) || shortenId(selectedUserId)}{' '}
                    · {shortenId(selectedUserId)}
                  </p>
                </div>

                {isDetailLoading ? (
                  <span className="text-[11px] font-semibold tracking-wider text-black/40 uppercase">
                    Refreshing...
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {['overview', 'auth', 'account', 'security', 'activity'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors',
                      detailTab === tab ? 'bg-black text-white' : 'bg-black/[0.04] text-black/55'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              {detailTab === 'overview' ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="space-y-2 rounded-xl border border-black/[0.08] p-4">
                    <p className="text-[11px] font-semibold tracking-wider text-black/45 uppercase">Auth snapshot</p>
                    <p className="text-sm text-black/70">Email: {normalizeValue(auth?.email) || 'n/a'}</p>
                    <p className="text-sm text-black/70">Providers: {(auth?.providers || []).join(', ') || 'n/a'}</p>
                    <p className="text-sm text-black/70">Roles: {(auth?.roles || []).join(', ') || 'n/a'}</p>
                    <p className="text-sm text-black/70">Created: {formatTimestamp(auth?.createdAt)}</p>
                    <p className="text-sm text-black/70">Last sign-in: {formatTimestamp(auth?.lastSignInAt)}</p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-black/[0.08] p-4">
                    <p className="text-[11px] font-semibold tracking-wider text-black/45 uppercase">Account snapshot</p>
                    <p className="text-sm text-black/70">Display: {normalizeValue(profile?.display_name) || 'n/a'}</p>
                    <p className="text-sm text-black/70">Username: {normalizeValue(profile?.username) || 'n/a'}</p>
                    <p className="text-sm text-black/70">Email: {normalizeValue(profile?.email) || 'n/a'}</p>
                    <p className="text-sm text-black/70">Private: {profile?.is_private ? 'yes' : 'no'}</p>
                    <p className="text-sm text-black/70">Updated: {formatTimestamp(profile?.updated_at)}</p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-black/[0.08] p-4">
                    <p className="text-[11px] font-semibold tracking-wider text-black/45 uppercase">
                      Lifecycle snapshot
                    </p>
                    <p className="text-sm text-black/70">State: {normalizeValue(lifecycle?.state) || 'ACTIVE'}</p>
                    <p className="text-sm text-black/70">Reason: {normalizeValue(lifecycle?.state_reason) || 'n/a'}</p>
                    <p className="text-sm text-black/70">
                      Pending key: {normalizeValue(lifecycle?.pending_operation_key) || 'n/a'}
                    </p>
                    <p className="text-sm text-black/70">Deleted at: {formatTimestamp(lifecycle?.deleted_at)}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-4">
                    {Object.entries(counters)
                      .sort(([left], [right]) => left.localeCompare(right))
                      .map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5">
                          <p className="text-[10px] font-semibold tracking-wider text-black/40 uppercase">{key}</p>
                          <p className="mt-1 text-lg font-semibold text-black/85">{value ?? 0}</p>
                        </div>
                      ))}
                  </div>

                  <div className="xl:col-span-3">
                    <MiniTable
                      title="Username Mapping"
                      rows={usernames}
                      emptyMessage="No username mapping rows."
                      columns={[
                        { key: 'username', label: 'Username', render: (row) => normalizeValue(row?.username) || 'n/a' },
                        { key: 'is_primary', label: 'Primary', render: (row) => (row?.is_primary ? 'yes' : 'no') },
                        { key: 'created_at', label: 'Created', render: (row) => formatTimestamp(row?.created_at) },
                      ]}
                    />
                  </div>
                </div>
              ) : null}

              {detailTab === 'auth' ? (
                <div className="space-y-3 rounded-xl border border-black/[0.08] p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-medium text-black/60">
                      Email
                      <input
                        value={authForm.email}
                        onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      />
                    </label>

                    <label className="text-xs font-medium text-black/60">
                      Role
                      <input
                        value={authForm.role}
                        onChange={(event) => setAuthForm((current) => ({ ...current, role: event.target.value }))}
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                        placeholder="admin"
                      />
                    </label>

                    <label className="text-xs font-medium text-black/60">
                      Sign-in mode
                      <select
                        value={authForm.signInMode}
                        onChange={(event) => setAuthForm((current) => ({ ...current, signInMode: event.target.value }))}
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      >
                        <option value="hybrid">hybrid</option>
                        <option value="password">password</option>
                        <option value="google">google</option>
                      </select>
                    </label>

                    <label className="text-xs font-medium text-black/60">
                      New password (optional)
                      <input
                        type="password"
                        value={authForm.password}
                        onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      />
                    </label>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-black/60">
                    <input
                      type="checkbox"
                      checked={authForm.emailConfirmed}
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, emailConfirmed: event.target.checked }))
                      }
                      className="h-4 w-4 rounded"
                    />
                    Email confirmed
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-medium text-black/60">
                      app_metadata (JSON)
                      <textarea
                        rows={5}
                        value={authForm.appMetadataText}
                        onChange={(event) =>
                          setAuthForm((current) => ({ ...current, appMetadataText: event.target.value }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2 font-mono text-xs text-black"
                      />
                    </label>

                    <label className="text-xs font-medium text-black/60">
                      user_metadata (JSON)
                      <textarea
                        rows={5}
                        value={authForm.userMetadataText}
                        onChange={(event) =>
                          setAuthForm((current) => ({ ...current, userMetadataText: event.target.value }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2 font-mono text-xs text-black"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={isActionRunning}
                    onClick={async () => {
                      const appMetadata = toJsonObjectOrNull(authForm.appMetadataText);
                      const userMetadata = toJsonObjectOrNull(authForm.userMetadataText);

                      if (normalizeValue(authForm.appMetadataText) && !appMetadata) {
                        setUiError('app_metadata JSON is invalid');
                        return;
                      }

                      if (normalizeValue(authForm.userMetadataText) && !userMetadata) {
                        setUiError('user_metadata JSON is invalid');
                        return;
                      }

                      await runAction('update_auth', {
                        appMetadata: appMetadata || {},
                        email: authForm.email,
                        emailConfirmed: authForm.emailConfirmed,
                        password: authForm.password || undefined,
                        role: authForm.role || undefined,
                        signInMode: authForm.signInMode,
                        userMetadata: userMetadata || {},
                      });

                      setAuthForm((current) => ({ ...current, password: '' }));
                    }}
                    className="h-10 rounded-lg bg-black px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Save auth
                  </button>
                </div>
              ) : null}

              {detailTab === 'account' ? (
                <div className="space-y-3 rounded-xl border border-black/[0.08] p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-medium text-black/60">
                      Display name
                      <input
                        value={profileForm.displayName}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, displayName: event.target.value }))
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      />
                    </label>

                    <label className="text-xs font-medium text-black/60">
                      Username
                      <input
                        value={profileForm.username}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, username: event.target.value }))
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      />
                    </label>

                    <label className="text-xs font-medium text-black/60">
                      Profile email
                      <input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      />
                    </label>

                    <label className="text-xs font-medium text-black/60">
                      Avatar URL
                      <input
                        value={profileForm.avatarUrl}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      />
                    </label>

                    <label className="text-xs font-medium text-black/60">
                      Banner URL
                      <input
                        value={profileForm.bannerUrl}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, bannerUrl: event.target.value }))
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      />
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-black/60 md:mt-8">
                      <input
                        type="checkbox"
                        checked={profileForm.isPrivate}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, isPrivate: event.target.checked }))
                        }
                        className="h-4 w-4 rounded"
                      />
                      Private profile
                    </label>
                  </div>

                  <label className="text-xs font-medium text-black/60">
                    Description
                    <textarea
                      rows={5}
                      value={profileForm.description}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, description: event.target.value }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-sm text-black"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={isActionRunning}
                    onClick={() =>
                      runAction('update_profile', {
                        avatarUrl: profileForm.avatarUrl,
                        bannerUrl: profileForm.bannerUrl,
                        description: profileForm.description,
                        displayName: profileForm.displayName,
                        email: profileForm.email,
                        isPrivate: profileForm.isPrivate,
                        username: profileForm.username,
                      })
                    }
                    className="h-10 rounded-lg bg-black px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Save account
                  </button>
                </div>
              ) : null}

              {detailTab === 'security' ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-black/[0.08] p-4">
                    <p className="text-[11px] font-semibold tracking-wider text-black/45 uppercase">
                      Session and access control
                    </p>

                    <label className="text-xs font-medium text-black/60">
                      Ban duration (hours)
                      <input
                        value={banDurationHours}
                        onChange={(event) => setBanDurationHours(event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isActionRunning}
                        onClick={() => runAction('ban_user', { banDurationHours: banDurationHours || '24' })}
                        className="border-warning/20 bg-warning/10 text-warning h-10 rounded-lg border px-4 text-xs font-semibold disabled:opacity-50"
                      >
                        Ban user
                      </button>

                      <button
                        type="button"
                        disabled={isActionRunning}
                        onClick={() => runAction('unban_user')}
                        className="border-success/20 bg-success/10 text-success h-10 rounded-lg border px-4 text-xs font-semibold disabled:opacity-50"
                      >
                        Unban
                      </button>

                      <button
                        type="button"
                        disabled={isActionRunning}
                        onClick={() => runAction('revoke_sessions', { reason: 'admin-revoke' }, { refreshList: false })}
                        className="h-10 rounded-lg border border-black/[0.1] bg-white px-4 text-xs font-semibold text-black/65 disabled:opacity-50"
                      >
                        Revoke sessions
                      </button>
                    </div>
                  </div>

                  <div className="border-error/25 bg-error/[0.05] space-y-3 rounded-xl border p-4">
                    <p className="text-error text-[11px] font-semibold tracking-wider uppercase">Danger zone</p>
                    <p className="text-sm text-black/65">
                      Bu kullanıcıyı tamamen silmek için şu metni yaz:
                      <span className="ml-2 rounded border border-black/[0.08] bg-white px-1.5 py-0.5 font-mono text-xs text-black">
                        {deleteConfirmExpected}
                      </span>
                    </p>

                    <input
                      value={deleteConfirmText}
                      onChange={(event) => setDeleteConfirmText(event.target.value)}
                      placeholder={deleteConfirmExpected}
                      className="h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-black"
                    />

                    <button
                      type="button"
                      disabled={!canDeleteUser || isActionRunning}
                      onClick={async () => {
                        const response = await runAction(
                          'delete_user',
                          {
                            confirmText: deleteConfirmText,
                            deleteAuthUser: true,
                            purgeData: true,
                          },
                          {
                            refreshDetail: false,
                            refreshList: true,
                          }
                        );

                        if (response?.ok) {
                          setDetailPayload(null);
                          setSelectedUserId(null);
                          setDeleteConfirmText('');
                        }
                      }}
                      className={cn(
                        'h-10 rounded-lg px-4 text-xs font-semibold transition-colors',
                        canDeleteUser ? 'bg-error text-white' : 'bg-black/[0.08] text-black/35'
                      )}
                    >
                      Delete user + purge data
                    </button>
                  </div>
                </div>
              ) : null}

              {detailTab === 'activity' ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <MiniTable
                    title="Recent Auth Audit Logs"
                    rows={authRows.slice(0, 20)}
                    emptyMessage="No auth audit rows."
                    columns={[
                      {
                        key: 'created_at',
                        label: 'Time',
                        render: (row) => formatTimestamp(row?.created_at || row?.updated_at),
                      },
                      { key: 'event_type', label: 'Event', render: (row) => row?.event_type || row?.action || 'n/a' },
                      { key: 'outcome', label: 'Outcome', render: (row) => row?.outcome || row?.status || 'n/a' },
                      {
                        key: 'payload',
                        label: 'Payload',
                        render: (row) => safeContentSnippet(JSON.stringify(row?.payload || row?.metadata || {}), 56),
                      },
                    ]}
                  />

                  <MiniTable
                    title="Recent Activity Stream"
                    rows={activityRows.slice(0, 20)}
                    emptyMessage="No activity rows."
                    columns={[
                      {
                        key: 'created_at',
                        label: 'Time',
                        render: (row) => formatTimestamp(row?.created_at || row?.updated_at),
                      },
                      { key: 'event_type', label: 'Type', render: (row) => row?.event_type || row?.type || 'n/a' },
                      {
                        key: 'payload',
                        label: 'Payload',
                        render: (row) => safeContentSnippet(JSON.stringify(row?.payload || {}), 56),
                      },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
