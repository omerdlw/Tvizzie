export function normalizeValue(value) {
  return String(value || '').trim();
}

export function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

export function normalizeEmailValue(value) {
  return normalizeLowerValue(value);
}

export function cleanString(value) {
  if (value === undefined || value === null) return '';
  return normalizeValue(value);
}

export function chunkArray(values = [], size = 100) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeTimestamp(value) {
  if (!value) return null;

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

export function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatYear(value) {
  if (!value) return 'N/A';
  const year = String(value).slice(0, 4);
  return year || 'N/A';
}

export function formatRuntime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins} minutes`;
  if (!mins) return `${hours} hours`;
  return `${hours} hours ${mins} minutes`;
}

export function formatCurrency(value) {
  if (!Number.isFinite(value) || value <= 0) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

const HTTP_URL_PATTERN = /^https?:\/\/.+/;

export function isValidUrl(url) {
  return typeof url === 'string' && HTTP_URL_PATTERN.test(url);
}

export function normalizeFeedbackText(value) {
  if (typeof value !== 'string') {
    return value;
  }

  let normalizedValue = value.replace(/\u2026/g, '...').trim();

  while (normalizedValue.endsWith('...') || normalizedValue.endsWith('.')) {
    normalizedValue = normalizedValue.endsWith('...')
      ? normalizedValue.slice(0, -3).trimEnd()
      : normalizedValue.slice(0, -1).trimEnd();
  }

  return normalizedValue;
}

export function normalizeFeedbackContent(value) {
  return typeof value === 'string' ? normalizeFeedbackText(value) : value;
}
