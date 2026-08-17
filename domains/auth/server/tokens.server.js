import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { normalizeValue } from '@/domains/shell/shared/utils';

export function createSignedToken(payload, { secret }) {
  const normalizedSecret = normalizeValue(secret);
  if (!normalizedSecret) throw new Error('Token signing secret is required');

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', normalizedSecret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySignedToken(token, { invalidMessage = 'Invalid token', secret }) {
  const [encodedPayload, signature, ...extraParts] = normalizeValue(token).split('.');
  const normalizedSecret = normalizeValue(secret);

  if (!encodedPayload || !signature || extraParts.length || !normalizedSecret) {
    throw new Error(invalidMessage);
  }

  const expectedSignature = createHmac('sha256', normalizedSecret)
    .update(encodedPayload)
    .digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error(invalidMessage);
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new Error(invalidMessage);
  }
}
