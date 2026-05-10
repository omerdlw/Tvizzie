function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function freezeMotion(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeMotion(entry)));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.freeze(
    Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, freezeMotion(entry)]))
  );
}

export function clampNumber(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(Math.max(number, min), max);
}

export function mergeMotionConfig(...configs) {
  const merged = {};

  configs.filter(Boolean).forEach((config) => {
    Object.entries(config).forEach(([key, value]) => {
      const previousValue = merged[key];

      if (isPlainObject(previousValue) && isPlainObject(value)) {
        merged[key] = mergeMotionConfig(previousValue, value);
        return;
      }

      merged[key] = value;
    });
  });

  return freezeMotion(merged);
}

export function getNamedMotionEntry(collection, key, fallbackKey = 'standard') {
  if (isPlainObject(key)) {
    return key;
  }

  if (!key) {
    return collection?.[fallbackKey] || {};
  }

  return collection?.[key] || collection?.[fallbackKey] || {};
}

export function getStaggerDelay(index = 0, stagger = {}) {
  const step = Number(stagger.step) || 0;
  const max = Number(stagger.max) || 0;

  return clampNumber(index * step, 0, max);
}

export function withDelay(transition = {}, delay = 0) {
  return mergeMotionConfig(transition, {
    delay: Math.max(0, Number(delay) || 0),
  });
}

export function withStaggerDelay(transition = {}, index = 0, stagger = {}) {
  return withDelay(transition, getStaggerDelay(index, stagger));
}

export function mapMotionEntries(entries = {}, mapper) {
  return freezeMotion(
    Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, mapper(value, key)]))
  );
}
