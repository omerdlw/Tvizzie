import 'server-only';

import { NextResponse } from 'next/server';

import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';
import { executeWriteRollout } from '@/core/services/shared/write-rollout.server';
import {
  assertMimeSignature,
  createHttpError,
  formatBytesToMb,
  normalizeTarget,
  normalizeValue,
  resolveFileExtension,
  resolveMaxBytes,
  resolveMimeType,
  resolveUploadErrorStatus,
} from './account-media.shared';
import {
  uploadWithEdgeFlow,
  uploadWithLegacyAdminFlow,
  validateEdgeUploadTicket,
} from './account-media.storage.server';

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

async function readAccountMediaUploadPayload(request) {
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

  return {
    fileBuffer,
    fileExtension,
    fileSize,
    mimeType,
    target,
  };
}

export async function handleAccountMediaPost(request) {
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

    const { fileBuffer, fileExtension, fileSize, mimeType, target } = await readAccountMediaUploadPayload(request);
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
    const { message, status } = resolveUploadErrorStatus(error);

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}
