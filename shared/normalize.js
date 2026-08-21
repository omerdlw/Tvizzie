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
