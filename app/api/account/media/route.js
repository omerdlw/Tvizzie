import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/clients/supabase/constants';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { executeWriteRollout } from '@/core/services/shared/write-rollout.server';

const DEFAULT_MEDIA_BUCKET = 'profile-media';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_UPLOAD_BYTES_BY_TARGET = Object.freeze({
  avatar: 3 * 1024 * 1024,
  banner: MAX_UPLOAD_BYTES,
});
const MIME_EXTENSION_MAP = Object.freeze({
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});
const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION_MAP));
const AVIF_BRANDS = new Set(['avif', 'avis']);

let signedUploadClient = null;

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

  if (normalized === 'avatar') {
    return 'avatar';
  }

  if (normalized === 'logo' || normalized === 'banner') {
    return 'banner';
  }

  throw createHttpError('Media target must be avatar or logo');
}

function resolveMimeType(file) {
  const mimeType = normalizeValue(file?.type).toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw createHttpError('Supported formats: JPG, PNG, WEBP, AVIF, GIF');
  }

  return mimeType;
}

function resolveFileExtension(mimeType) {
  return MIME_EXTENSION_MAP[mimeType] || 'bin';
}

function resolveMediaBucket() {
  return normalizeValue(process.env.SUPABASE_PROFILE_MEDIA_BUCKET) || DEFAULT_MEDIA_BUCKET;
}

async function ensureBucket(client, bucket) {
  const bucketName = normalizeValue(bucket);

  if (!bucketName) {
    throw createHttpError('Storage bucket is not configured', 500);
  }

  const existingBucket = await client.storage.getBucket(bucketName);

  if (!existingBucket.error) {
    if (existingBucket.data?.public !== true) {
      const updateResult = await client.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: MAX_UPLOAD_BYTES,
        allowedMimeTypes: [...ALLOWED_MIME_TYPES],
      });

      if (updateResult.error) {
        throw createHttpError(updateResult.error.message || 'Storage bucket could not be updated', 500);
      }
    }

    return bucketName;
  }

  const errorMessage = normalizeValue(existingBucket.error?.message || '').toLowerCase();

  if (errorMessage && !errorMessage.includes('not found')) {
    throw createHttpError(existingBucket.error.message || 'Storage bucket could not be checked', 500);
  }

  const createResult = await client.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  });

  if (createResult.error) {
    const createMessage = normalizeValue(createResult.error?.message || '').toLowerCase();

    if (!createMessage.includes('already')) {
      throw createHttpError(createResult.error.message || 'Storage bucket could not be created', 500);
    }
  }

  return bucketName;
}

function buildStoragePath({ userId, target, extension }) {
  return `accounts/${userId}/${target}-${Date.now()}-${randomUUID()}.${extension}`;
}

function createSignedUploadClient() {
  if (signedUploadClient) {
    return signedUploadClient;
  }

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw createHttpError('Supabase upload client is not configured', 500);
  }

  signedUploadClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return signedUploadClient;
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

function assertMimeSignature(fileBuffer, declaredMimeType) {
  const detectedMimeType = detectMimeTypeFromBuffer(fileBuffer);

  if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
    throw createHttpError('File content does not match the selected format');
  }
}

function resolveMaxBytes(target) {
  return MAX_UPLOAD_BYTES_BY_TARGET[target] || MAX_UPLOAD_BYTES;
}

function formatBytesToMb(value) {
  const mbValue = Number(value) / (1024 * 1024);
  return `${mbValue.toFixed(1)}MB`;
}

async function enforceAccountMediaUploadRateLimit({ requestContext, userId }) {
  try {
    await enforceSlidingWindowRateLimit({
      namespace: 'account:media-upload',
      windowMs: 10 * 60 * 1000,
      dimensions: [
        { id: 'user', value: userId, limit: 24 },
        { id: 'ip', value: requestContext.ipAddress, limit: 80 },
        { id: 'device', value: requestContext.deviceId, limit: 40 },
      ],
      message: 'Too many media upload attempts',
    });
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error;
    }

    if (error.dimension === 'user') {
      throw createHttpError('Too many upload attempts for this account', 429);
    }

    if (error.dimension === 'device') {
      throw createHttpError('Too many upload attempts from this device', 429);
    }

    throw createHttpError('Too many upload attempts from this network', 429);
  }
}

async function uploadWithLegacyAdminFlow({ fileBuffer, fileExtension, mimeType, target, userId }) {
  const adminClient = createAdminClient();
  const bucket = await ensureBucket(adminClient, resolveMediaBucket());
  const path = buildStoragePath({
    userId,
    target,
    extension: fileExtension,
  });
  const uploadResult = await adminClient.storage.from(bucket).upload(path, fileBuffer, {
    upsert: true,
    contentType: mimeType,
    cacheControl: '31536000',
  });

  if (uploadResult.error) {
    throw createHttpError(uploadResult.error.message || 'Image upload failed', 500);
  }

  const { data: { publicUrl = '' } = {} } = adminClient.storage.from(bucket).getPublicUrl(path);
  const url = normalizeValue(publicUrl);

  if (!url) {
    throw createHttpError('Image upload succeeded but URL could not be generated', 500);
  }

  return {
    bucket,
    path,
    url,
  };
}

async function uploadWithEdgeFlow({ authContext, fileBuffer, fileExtension, fileSize, mimeType, request, requestMeta, target }) {
  const prepareResult = await invokeInternalEdgeFunction('account-media-upload', {
    body: {
      action: 'prepare-upload',
      contentLength: fileSize,
      extension: fileExtension,
      mimeType,
      target,
      userId: authContext.userId,
    },
    idempotencyKey: requestMeta?.idempotencyKey,
    request,
    requestMeta,
    source: 'account-media-upload',
  });
  const preparedBucket = normalizeValue(prepareResult?.bucket);
  const preparedPath = normalizeValue(prepareResult?.path);
  const token = normalizeValue(prepareResult?.token);
  const preparedUrl = normalizeValue(prepareResult?.url);

  if (!preparedBucket || !preparedPath || !token) {
    throw createHttpError('Image upload ticket is invalid', 500);
  }

  const uploadClient = createSignedUploadClient();
  const uploadResult = await uploadClient.storage.from(preparedBucket).uploadToSignedUrl(preparedPath, token, fileBuffer, {
    cacheControl: '31536000',
    contentType: mimeType,
  });

  if (uploadResult.error) {
    throw createHttpError(uploadResult.error.message || 'Image upload failed', 500);
  }

  const { data: { publicUrl = '' } = {} } = uploadClient.storage.from(preparedBucket).getPublicUrl(preparedPath);

  return {
    bucket: preparedBucket,
    path: preparedPath,
    url: preparedUrl || normalizeValue(publicUrl),
  };
}

async function validateEdgeUploadTicket({ authContext, fileExtension, fileSize, mimeType, request, requestMeta, target }) {
  await invokeInternalEdgeFunction('account-media-upload', {
    body: {
      action: 'prepare-upload',
      contentLength: fileSize,
      dryRun: true,
      extension: fileExtension,
      mimeType,
      target,
      userId: authContext.userId,
    },
    request,
    requestMeta,
    source: 'account-media-upload-shadow',
    timeoutMs: 8000,
  });
}

export async function POST(request) {
  try {
    assertCsrfRequest(request);

    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    });
    const requestMeta = buildInternalRequestMeta({
      authContext,
      request,
      source: 'api/account/media',
    });
    const requestContext = getRequestContext(request);

    await enforceAccountMediaUploadRateLimit({
      requestContext,
      userId: authContext.userId,
    });

    const formData = await request.formData();
    const target = normalizeTarget(formData.get('target'));
    const file = formData.get('file');

    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      throw createHttpError('Select an image file');
    }

    const fileSize = Number(file.size || 0);
    const maxFileSize = resolveMaxBytes(target);

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      throw createHttpError('Image file is empty');
    }

    if (fileSize > maxFileSize) {
      throw createHttpError(`Maximum upload size is ${formatBytesToMb(maxFileSize)}`);
    }

    const mimeType = resolveMimeType(file);
    const fileExtension = resolveFileExtension(mimeType);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    assertMimeSignature(fileBuffer, mimeType);
    const writeResult = await executeWriteRollout({
      domain: 'account',
      endpoint: 'account-media-upload',
      userId: authContext.userId,
      requestId: requestMeta.requestId,
      logger(entry) {
        console.warn('[Rollout][account-media-upload]', entry);
      },
      edgeValidate: async () =>
        validateEdgeUploadTicket({
          authContext,
          fileExtension,
          fileSize,
          mimeType,
          request,
          requestMeta,
          target,
        }),
      edgeWrite: async () =>
        uploadWithEdgeFlow({
          authContext,
          fileBuffer,
          fileExtension,
          fileSize,
          mimeType,
          request,
          requestMeta,
          target,
        }),
      legacyWrite: async () =>
        uploadWithLegacyAdminFlow({
          fileBuffer,
          fileExtension,
          mimeType,
          target,
          userId: authContext.userId,
        }),
    });
    const bucket = normalizeValue(writeResult?.result?.bucket);
    const path = normalizeValue(writeResult?.result?.path);
    const url = normalizeValue(writeResult?.result?.url);

    if (!url) {
      throw createHttpError('Image upload succeeded but URL could not be generated', 500);
    }

    return NextResponse.json({
      decision: writeResult?.decision || null,
      ok: true,
      bucket,
      path,
      source: writeResult?.source || 'unknown',
      target,
      url,
    });
  } catch (error) {
    const message = normalizeValue(error?.message || 'Image upload failed');
    let status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

    if (message === 'Invalid CSRF token') {
      status = 403;
    } else if (
      message === 'Authentication session is required' ||
      message === 'Invalid or expired authentication token'
    ) {
      status = 401;
    } else if (status < 400 || status > 599) {
      status = 500;
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}
