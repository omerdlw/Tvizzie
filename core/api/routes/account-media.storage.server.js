import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/clients/supabase/constants';
import { invokeInternalEdgeFunction } from '@/core/services/shared';
import { ALLOWED_MIME_TYPES, DEFAULT_MEDIA_BUCKET, MAX_UPLOAD_BYTES } from './account-media.constants';
import { createHttpError, normalizeValue } from './account-media.shared';

let signedUploadClient = null;

function resolveMediaBucket() {
  return DEFAULT_MEDIA_BUCKET;
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

export async function uploadWithLegacyAdminFlow({ fileBuffer, fileExtension, mimeType, target, userId }) {
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

export async function uploadWithEdgeFlow({
  authContext,
  fileBuffer,
  fileExtension,
  fileSize,
  mimeType,
  request,
  requestMeta,
  target,
}) {
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
  const uploadResult = await uploadClient.storage
    .from(preparedBucket)
    .uploadToSignedUrl(preparedPath, token, fileBuffer, {
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

export async function validateEdgeUploadTicket({
  authContext,
  fileExtension,
  fileSize,
  mimeType,
  request,
  requestMeta,
  target,
}) {
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
