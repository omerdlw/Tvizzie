const HTTP_URL_PATTERN = /^https?:\/\/.+/;

export function isValidUrl(url) {
  return typeof url === 'string' && HTTP_URL_PATTERN.test(url);
}
