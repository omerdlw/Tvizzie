import 'server-only';

export const DEFAULT_MEDIA_BUCKET = 'profile-media';
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOAD_BYTES_BY_TARGET = Object.freeze({
  avatar: 3 * 1024 * 1024,
  banner: MAX_UPLOAD_BYTES,
});
export const MIME_EXTENSION_MAP = Object.freeze({
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});
export const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION_MAP));
export const AVIF_BRANDS = new Set(['avif', 'avis']);
