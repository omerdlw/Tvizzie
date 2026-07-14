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
