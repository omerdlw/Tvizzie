import 'server-only';

import { randomUUID } from 'crypto';

import { createAdminClient } from '@/infrastructure/supabase/server';
import {
  ALLOWED_MIME_TYPES,
  AVIF_BRANDS,
  DEFAULT_MEDIA_BUCKET,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES_BY_TARGET,
  MIME_EXTENSION_MAP,
} from '@/domains/account/utils/constants';

function normalizeValue(value) {
  return String(value || '').trim();
}

function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeTarget(value) {
  const normalized = normalizeValue(value).toLowerCase();
  if (normalized === 'avatar') return 'avatar';
  if (normalized === 'banner' || normalized === 'logo') return 'banner';
  throw createHttpError('Media target must be avatar or logo');
}

function resolveExtension(mimeType) {
  const extension = MIME_EXTENSION_MAP[mimeType];
  if (!extension) throw createHttpError('Only JPG, PNG, WEBP, GIF and AVIF images are allowed');
  return extension;
}

function assertMimeSignature(fileBuffer, mimeType) {
  if (!fileBuffer || !(fileBuffer instanceof Uint8Array) || fileBuffer.length < 12) {
    throw createHttpError('Selected image file is empty or corrupted');
  }

  const header = Array.from(fileBuffer.subarray(0, 12));

  if (mimeType === 'image/jpeg') {
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return;
    throw createHttpError('Invalid JPEG file');
  }

  if (mimeType === 'image/png') {
    if (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a
    )
      return;
    throw createHttpError('Invalid PNG file');
  }

  if (mimeType === 'image/webp') {
    const isRiff =
      header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
    const isWebp =
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
    if (isRiff && isWebp) return;
    throw createHttpError('Invalid WEBP file');
  }

  if (mimeType === 'image/gif') {
    const isGif87 =
      header[0] === 0x47 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x38 &&
      header[4] === 0x37 &&
      header[5] === 0x61;
    const isGif89 =
      header[0] === 0x47 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x38 &&
      header[4] === 0x39 &&
      header[5] === 0x61;
    if (isGif87 || isGif89) return;
    throw createHttpError('Invalid GIF file');
  }

  if (mimeType === 'image/avif') {
    const isFtyp =
      header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70;
    const brand = String.fromCharCode(...header.slice(8, 12)).toLowerCase();
    if (isFtyp && AVIF_BRANDS.has(brand)) return;
    throw createHttpError('Invalid AVIF file');
  }

  throw createHttpError('Unsupported image format');
}

async function uploadDirectMediaFile({ fileBuffer, fileExtension, mimeType, target, userId }) {
  const adminClient = createAdminClient();
  const bucket = DEFAULT_MEDIA_BUCKET;
  const path = `accounts/${userId}/${target}-${Date.now()}-${randomUUID()}.${fileExtension}`;

  const uploadResult = await adminClient.storage.from(bucket).upload(path, fileBuffer, {
    upsert: true,
    contentType: mimeType,
    cacheControl: '31536000',
  });

  if (uploadResult.error)
    throw createHttpError(uploadResult.error.message || 'Image upload failed', 500);

  const { data: { publicUrl = '' } = {} } = adminClient.storage.from(bucket).getPublicUrl(path);
  const url = normalizeValue(publicUrl);
  if (!url) throw createHttpError('Image upload succeeded but URL could not be generated', 500);

  return { bucket, path, url };
}

function resolveManagedMediaPath(url, userId) {
  const normalizedUrl = normalizeValue(url);
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUrl || !normalizedUserId) return null;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const marker = `/storage/v1/object/public/${DEFAULT_MEDIA_BUCKET}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const encodedPath = parsedUrl.pathname.slice(markerIndex + marker.length);
    const path = decodeURIComponent(encodedPath);
    return path.startsWith(`accounts/${normalizedUserId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function removeReplacedAccountMedia({ nextProfile, previousProfile, userId }) {
  if (!nextProfile) return;

  const paths = [
    resolveManagedMediaPath(previousProfile?.avatarUrl, userId),
    resolveManagedMediaPath(previousProfile?.bannerUrl, userId),
  ].filter(Boolean);
  const nextPaths = new Set(
    [
      resolveManagedMediaPath(nextProfile?.avatarUrl, userId),
      resolveManagedMediaPath(nextProfile?.bannerUrl, userId),
    ].filter(Boolean),
  );
  const pathsToRemove = [...new Set(paths)].filter((path) => !nextPaths.has(path));
  if (pathsToRemove.length === 0) return;

  const result = await createAdminClient().storage.from(DEFAULT_MEDIA_BUCKET).remove(pathsToRemove);
  if (result.error) {
    console.warn('Replaced account media could not be removed:', result.error);
  }
}

export async function uploadAccountMedia({ file, target: rawTarget, userId }) {
  const target = normalizeTarget(rawTarget);
  if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
    throw createHttpError('Select an image file');
  }

  const mimeType = normalizeValue(file.type).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw createHttpError('Only JPG, PNG, WEBP, GIF and AVIF images are allowed');
  }

  const fileSize = Number(file.size || 0);
  const targetMaxBytes = MAX_UPLOAD_BYTES_BY_TARGET[target] || MAX_UPLOAD_BYTES;
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > targetMaxBytes) {
    throw createHttpError(
      `Image file size must be less than ${Math.round(targetMaxBytes / (1024 * 1024))}MB`,
    );
  }

  const fileExtension = resolveExtension(mimeType);
  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  assertMimeSignature(fileBuffer, mimeType);

  return uploadDirectMediaFile({
    fileBuffer,
    fileExtension,
    mimeType,
    target,
    userId,
  });
}
