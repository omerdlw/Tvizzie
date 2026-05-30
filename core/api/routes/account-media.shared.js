import 'server-only';

import {
  ALLOWED_MIME_TYPES,
  AVIF_BRANDS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES_BY_TARGET,
  MIME_EXTENSION_MAP,
} from './account-media.constants';
import { normalizeValue } from '@/core/utils/string';

export { normalizeValue };

export function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function normalizeTarget(value) {
  const normalized = normalizeValue(value).toLowerCase();

  if (normalized === 'avatar') {
    return 'avatar';
  }

  if (normalized === 'logo' || normalized === 'banner') {
    return 'banner';
  }

  throw createHttpError('Media target must be avatar or logo');
}

export function resolveMimeType(file) {
  const mimeType = normalizeValue(file?.type).toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw createHttpError('Supported formats: JPG, PNG, WEBP, AVIF, GIF');
  }

  return mimeType;
}

export function resolveFileExtension(mimeType) {
  return MIME_EXTENSION_MAP[mimeType] || 'bin';
}

function detectMimeTypeFromBuffer(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  if (buffer.length >= 12) {
    const marker = buffer.toString('ascii', 4, 8).toLowerCase();
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();

    if (marker === 'ftyp' && AVIF_BRANDS.has(brand)) {
      return 'image/avif';
    }
  }

  return null;
}

export function assertMimeSignature(fileBuffer, declaredMimeType) {
  const detectedMimeType = detectMimeTypeFromBuffer(fileBuffer);

  if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
    throw createHttpError('File content does not match the selected format');
  }
}

export function resolveMaxBytes(target) {
  return MAX_UPLOAD_BYTES_BY_TARGET[target] || MAX_UPLOAD_BYTES;
}

export function formatBytesToMb(value) {
  const mbValue = Number(value) / (1024 * 1024);
  return `${mbValue.toFixed(1)}MB`;
}

export function resolveUploadErrorStatus(error) {
  const message = normalizeValue(error?.message || 'Image upload failed');
  let status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

  if (message === 'Invalid CSRF token') {
    status = 403;
  } else if (message === 'Authentication session is required' || message === 'Invalid or expired authentication token') {
    status = 401;
  } else if (status < 400 || status > 599) {
    status = 500;
  }

  return {
    message,
    status,
  };
}
