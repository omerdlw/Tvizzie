export function isBrowser() {
  return typeof window !== 'undefined';
}

export function isString(value) {
  return typeof value === 'string';
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
