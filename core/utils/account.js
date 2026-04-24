export const ACCOUNT_SECTION_KEYS = Object.freeze(['activity', 'likes', 'watched', 'watchlist', 'reviews', 'lists']);
export const RESERVED_ACCOUNT_SEGMENTS = new Set([...ACCOUNT_SECTION_KEYS, 'edit']);

export function isReservedAccountSegment(value) {
  return RESERVED_ACCOUNT_SEGMENTS.has(
    String(value || '')
      .trim()
      .toLowerCase()
  );
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

const TURKISH_USERNAME_MAP = Object.freeze({
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

export function sanitizeUsername(value) {
  const normalized = normalizeValue(value)
    .toLowerCase()
    .replace(/[çğışüö]/g, (char) => TURKISH_USERNAME_MAP[char] || char);

  return normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function validateUsername(value) {
  const username = sanitizeUsername(value);

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    throw new Error(`Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`);
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Username can only contain lowercase letters, numbers, and hyphens');
  }

  if (isReservedAccountSegment(username)) {
    throw new Error('This username is reserved');
  }

  return username;
}

export function normalizeAccountDisplayNameSearchValue(value) {
  return normalizeValue(value).toLocaleLowerCase();
}
