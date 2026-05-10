export function normalizePage(value, fallback = 1) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function parsePageFromSearch(searchParams, fallback = 1) {
  return normalizePage(searchParams?.get?.('page') || fallback, fallback);
}

export function buildManagedQueryString(searchParams, { managedKeys = [], values = {}, resetPage = true } = {}) {
  const params = new URLSearchParams(searchParams?.toString?.() || '');

  managedKeys.forEach((key) => {
    params.delete(key);
  });

  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  if (resetPage) {
    params.delete('page');
  }

  return params.toString();
}

export function buildCollectionBasePath(pathname = '', searchParams = null) {
  const normalizedPathname = String(pathname || '').replace(/\/page\/\d+$/i, '') || pathname;
  const params = new URLSearchParams(searchParams?.toString?.() || '');
  params.delete('page');

  const queryString = params.toString();

  if (!queryString) {
    return normalizedPathname;
  }

  return `${normalizedPathname}?${queryString}`;
}
