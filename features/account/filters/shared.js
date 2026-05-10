const RATING_MODE_SET = new Set(['any', 'none', 'range']);
const STAR_STEP_VALUES = Object.freeze([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);

export function normalizeString(value) {
  return String(value || '').trim();
}

export function normalizeToken(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function normalizeFiniteNumber(value, fallback = null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRatingMode(value, fallback = 'any') {
  const normalized = normalizeString(value).toLowerCase();
  return RATING_MODE_SET.has(normalized) ? normalized : fallback;
}

export function normalizeStarValue(value, fallback = 0.5) {
  const parsed = normalizeFiniteNumber(value, fallback);
  const clamped = clamp(parsed, 0.5, 5);
  return Math.round(clamped * 2) / 2;
}

export function parseFlagSet(value) {
  if (!value) {
    return new Set();
  }

  return new Set(
    String(value)
      .split(',')
      .map((item) => normalizeToken(item))
      .filter(Boolean)
  );
}

export function serializeFlagSet(flagSet) {
  if (!(flagSet instanceof Set) || flagSet.size === 0) {
    return '';
  }

  return [...flagSet].sort().join(',');
}

export function matchesRange(value, min, max) {
  if (value === null || value === undefined) {
    return false;
  }

  return value >= min && value <= max;
}

export function isSameFilterState(left, right, keys = []) {
  return keys.every((key) => left[key] === right[key]);
}

export function buildHash(value) {
  const normalized = normalizeString(value);
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getStarStepValues() {
  return STAR_STEP_VALUES;
}
