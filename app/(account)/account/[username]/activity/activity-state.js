import {
  buildManagedQueryString,
  normalizePage,
  parseActivityFilters,
  parsePageFromSearch,
  toActivityQueryValues,
} from '@/features/account/filtering';

export const ACTIVITY_FETCH_PAGE_SIZE = 36;

export function normalizeActivityScope(value) {
  return value === 'following' ? 'following' : 'user';
}

export function parseInitialActivityControls(searchParams) {
  const filters = parseActivityFilters(searchParams);

  return {
    filters: {
      sort: filters.sort,
      subject: filters.subject,
    },
    page: parsePageFromSearch(searchParams),
    scope: normalizeActivityScope(searchParams?.get?.('scope')),
  };
}

export function hasMatchingSeededActivityFeed({
  filters,
  initialFeed = null,
  page,
  resolvedUserId = null,
  scope = 'user',
}) {
  if (!initialFeed?.userId || !resolvedUserId || initialFeed.userId !== resolvedUserId) {
    return false;
  }

  return (
    normalizeActivityScope(initialFeed?.scope) === normalizeActivityScope(scope) &&
    normalizePage(initialFeed?.page) === normalizePage(page) &&
    String(initialFeed?.subject || 'all') === String(filters?.subject || 'all') &&
    String(initialFeed?.sort || 'newest') === String(filters?.sort || 'newest')
  );
}

export function replaceActivityHistory({ filters, page, pathname, scope }) {
  if (typeof window === 'undefined') {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  if (normalizeActivityScope(scope) === 'user') {
    params.delete('scope');
  } else {
    params.set('scope', 'following');
  }

  const queryString = buildManagedQueryString(params, {
    managedKeys: ['asub', 'asort'],
    resetPage: false,
    values: toActivityQueryValues(filters),
  });
  const nextParams = new URLSearchParams(queryString);
  const normalizedPage = normalizePage(page);

  if (normalizedPage <= 1) {
    nextParams.delete('page');
  } else {
    nextParams.set('page', String(normalizedPage));
  }

  const nextQuery = nextParams.toString();
  window.history.replaceState({}, '', nextQuery ? `${pathname}?${nextQuery}` : pathname);
}
