import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { createAdminClient } from '@/infrastructure/supabase/admin';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/infrastructure/supabase/supabase-constants';
import {
  assertCsrfRequest,
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/domains/auth/server/security.server.js';
import { getRequestContext, requireSessionRequest } from '@/domains/auth/server/session.server.js';
import { buildInternalRequestMeta, executeWriteRollout, invokeInternalEdgeFunction } from '@/infrastructure/http/http-server';
import {
  ALLOWED_MIME_TYPES,
  AVIF_BRANDS,
  DEFAULT_MEDIA_BUCKET,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES_BY_TARGET,
  MIME_EXTENSION_MAP,
} from '@/domains/account/utils';

// ============================================================
// Media Shared Helpers
// ============================================================

export function normalizeValue(value) {
  return String(value || '').trim();
}

export function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function normalizeTarget(value) {
  const normalized = normalizeValue(value).toLowerCase();
  if (normalized === 'avatar') return 'avatar';
  if (normalized === 'banner' || normalized === 'logo') return 'banner';
  throw createHttpError('Media target must be avatar or logo');
}

export function resolveExtension(mimeType) {
  const extension = MIME_EXTENSION_MAP[mimeType];
  if (!extension) throw createHttpError('Only JPG, PNG, WEBP, GIF and AVIF images are allowed');
  return extension;
}

export function assertMimeSignature(fileBuffer, mimeType) {
  if (!fileBuffer || !(fileBuffer instanceof Uint8Array) || fileBuffer.length < 12) {
    throw createHttpError('Selected image file is empty or corrupted');
  }

  const bytes = Array.from(fileBuffer.slice(0, 12));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45;
  const isFtyp = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  const ftypBrand = isFtyp ? String.fromCharCode(...bytes.slice(8, 12)).toLowerCase() : '';
  const isAvif = isFtyp && AVIF_BRANDS.has(ftypBrand);

  if (mimeType === 'image/jpeg' && isJpeg) return;
  if (mimeType === 'image/png' && isPng) return;
  if (mimeType === 'image/gif' && isGif) return;
  if (mimeType === 'image/webp' && isWebp) return;
  if (mimeType === 'image/avif' && isAvif) return;

  throw createHttpError('File contents do not match the declared image format');
}

// ============================================================
// Storage Drivers (Edge & Admin Legacy)
// ============================================================

let signedUploadClient = null;

function createSignedUploadClient() {
  if (signedUploadClient) return signedUploadClient;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw createHttpError('Supabase upload client is not configured', 500);
  }
  signedUploadClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return signedUploadClient;
}

export async function uploadWithLegacyAdminFlow({ fileBuffer, fileExtension, mimeType, target, userId }) {
  const adminClient = createAdminClient();
  const bucket = DEFAULT_MEDIA_BUCKET;
  const path = `accounts/${userId}/${target}-${Date.now()}-${randomUUID()}.${fileExtension}`;

  const uploadResult = await adminClient.storage.from(bucket).upload(path, fileBuffer, {
    upsert: true,
    contentType: mimeType,
    cacheControl: '31536000',
  });

  if (uploadResult.error) throw createHttpError(uploadResult.error.message || 'Image upload failed', 500);

  const { data: { publicUrl = '' } = {} } = adminClient.storage.from(bucket).getPublicUrl(path);
  const url = normalizeValue(publicUrl);
  if (!url) throw createHttpError('Image upload succeeded but URL could not be generated', 500);

  return { bucket, path, url };
}

export async function uploadWithEdgeFlow({ authContext, fileBuffer, fileExtension, fileSize, mimeType, request, requestMeta, target }) {
  const prepareResult = await invokeInternalEdgeFunction('account-media-upload', {
    body: { action: 'prepare-upload', contentLength: fileSize, extension: fileExtension, mimeType, target, userId: authContext.userId },
    idempotencyKey: requestMeta?.idempotencyKey,
    request,
    requestMeta,
    source: 'account-media-upload',
  });

  const preparedBucket = normalizeValue(prepareResult?.bucket);
  const preparedPath = normalizeValue(prepareResult?.path);
  const token = normalizeValue(prepareResult?.token);
  const preparedUrl = normalizeValue(prepareResult?.url);

  if (!preparedBucket || !preparedPath || !token) throw createHttpError('Image upload ticket is invalid', 500);

  const uploadClient = createSignedUploadClient();
  const uploadResult = await uploadClient.storage.from(preparedBucket).uploadToSignedUrl(preparedPath, token, fileBuffer, {
    cacheControl: '31536000',
    contentType: mimeType,
  });

  if (uploadResult.error) throw createHttpError(uploadResult.error.message || 'Image upload failed', 500);

  const { data: { publicUrl = '' } = {} } = uploadClient.storage.from(preparedBucket).getPublicUrl(preparedPath);
  return { bucket: preparedBucket, path: preparedPath, url: preparedUrl || normalizeValue(publicUrl) };
}

export async function validateEdgeUploadTicket({ authContext, fileExtension, fileSize, mimeType, request, requestMeta, target }) {
  await invokeInternalEdgeFunction('account-media-upload', {
    body: { action: 'prepare-upload', contentLength: fileSize, dryRun: true, extension: fileExtension, mimeType, target, userId: authContext.userId },
    request,
    requestMeta,
    source: 'account-media-upload-shadow',
    timeoutMs: 8000,
  });
}

// ============================================================
// Media Upload HTTP Endpoint Handler
// ============================================================

export async function handleAccountMediaPost(request) {
  const requestMeta = buildInternalRequestMeta(request, 'account-media-upload');

  try {
    const authContext = await requireSessionRequest(request, { allowBearerFallback: true });
    assertCsrfRequest(request, getRequestContext(request));

    await enforceSlidingWindowRateLimit({
      key: `rate:account-media:${authContext.userId}`,
      limitCount: 15,
      windowMs: 60 * 1000,
    });

    const formData = await request.formData();
    const target = normalizeTarget(formData.get('target'));
    const file = formData.get('file');

    if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
      throw createHttpError('Select an image file');
    }

    const mimeType = normalizeValue(file.type).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) throw createHttpError('Only JPG, PNG, WEBP, GIF and AVIF images are allowed');

    const fileSize = Number(file.size || 0);
    const targetMaxBytes = MAX_UPLOAD_BYTES_BY_TARGET[target] || MAX_UPLOAD_BYTES;
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > targetMaxBytes) {
      throw createHttpError(`Image file size must be less than ${Math.round(targetMaxBytes / (1024 * 1024))}MB`);
    }

    const fileExtension = resolveExtension(mimeType);
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    assertMimeSignature(fileBuffer, mimeType);

    const payload = await executeWriteRollout({
      featureKey: 'media_upload_edge',
      legacyWrite: () => uploadWithLegacyAdminFlow({ fileBuffer, fileExtension, mimeType, target, userId: authContext.userId }),
      primaryWrite: () => uploadWithEdgeFlow({ authContext, fileBuffer, fileExtension, fileSize, mimeType, request, requestMeta, target }),
      shadowValidate: () => validateEdgeUploadTicket({ authContext, fileExtension, fileSize, mimeType, request, requestMeta, target }),
    });

    return NextResponse.json({ ...payload, success: true });
  } catch (error) {
    if (isSlidingWindowRateLimitError(error)) {
      return NextResponse.json({ error: error.message || 'Rate limit exceeded' }, { status: 429 });
    }
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Image upload failed' }, { status });
  }
}

// ============================================================
// Media Collection Client Request Helpers
// ============================================================

export async function fetchCollectionResource({
  entityId = null,
  entityType = null,
  limitCount = null,
  listId = null,
  media = null,
  resource,
  slug = null,
  userId = null,
} = {}) {
  const { requestApiJson } = await import('@/infrastructure/http/api-request-service');
  const resolvedMedia = media || (entityType && entityId ? { entityId, entityType } : null);
  const payload = await requestApiJson('/api/collections', {
    query: {
      entityId: resolvedMedia?.entityId || null,
      entityType: resolvedMedia?.entityType || null,
      limitCount,
      listId,
      resource,
      slug,
      userId,
    },
  });
  return payload?.items || payload?.data || payload || [];
}

export async function fetchMediaCollectionStatus({ media = null, resource, userId = null } = {}) {
  const { requestApiJson } = await import('@/infrastructure/http/api-request-service');
  const payload = await requestApiJson('/api/collections', {
    query: {
      entityId: media?.entityId || null,
      entityType: media?.entityType || null,
      resource,
      userId,
    },
  });
  return payload?.data || payload || null;
}

export function createMediaCollectionToggleRpcParams({ extraPayload = {}, row = {}, userId }) {
  return {
    p_added_at: row.addedAt || row.added_at || new Date().toISOString(),
    p_backdrop_path: row.backdrop_path || row.backdropPath || null,
    p_entity_id: String(row.entityId || row.entity_id || row.id || '').trim(),
    p_entity_type: String(row.entityType || row.entity_type || row.media_type || '').trim().toLowerCase(),
    p_extra_payload: extraPayload,
    p_media_key: row.mediaKey || row.media_key || null,
    p_poster_path: row.poster_path || row.posterPath || null,
    p_title: row.title || row.name || 'Untitled',
    p_user_id: userId,
  };
}

export async function executeMediaCollectionRpc({ client, fnName, params, fallbackMessage }) {
  const result = await client.rpc(fnName, params);
  if (result.error) throw new Error(result.error.message || fallbackMessage);
  return result.data;
}

export function buildUserMediaCollectionSubscriptionKey(resource, userId) {
  return `account:collection:${resource}:${userId}`;
}

export function buildMediaCollectionStatusSubscriptionKey(resource, userId, mediaKey) {
  return `account:status:${resource}:${userId}:${mediaKey}`;
}
