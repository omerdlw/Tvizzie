'use client';

function normalizeValue(value) {
  return String(value || '').trim();
}

const CSRF_COOKIE_NAME = 'tvz_auth_csrf';

export function getCsrfToken() {
  if (typeof document === 'undefined') {
    return '';
  }

  const cookieValue = document.cookie || '';

  for (const item of cookieValue.split(';')) {
    const normalizedItem = normalizeValue(item);

    if (normalizedItem.startsWith(`${CSRF_COOKIE_NAME}=`)) {
      return decodeURIComponent(normalizedItem.slice(`${CSRF_COOKIE_NAME}=`.length));
    }
  }

  return '';
}

export function createCsrfHeaders(headers = {}) {
  const csrfToken = getCsrfToken();

  if (!csrfToken) {
    return headers;
  }

  return {
    ...headers,
    'X-CSRF-Token': csrfToken,
  };
}
