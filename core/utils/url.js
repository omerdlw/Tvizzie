const REGEX_PATTERNS = {
  URL: /^https?:\/\/.+/,
};

export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return REGEX_PATTERNS.URL.test(url);
}
