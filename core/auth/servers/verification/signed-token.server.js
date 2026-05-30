import { createHmac, timingSafeEqual } from 'crypto';

import { normalizeValue } from '@/core/utils/string';

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(value, invalidMessage) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new Error(invalidMessage);
  }
}

function signEncodedPayload(encodedPayload, secret) {
  return createHmac('sha256', normalizeValue(secret)).update(encodedPayload).digest('base64url');
}

export function createSignedToken(payload, { secret }) {
  const encodedPayload = encodePayload(payload);
  const signature = signEncodedPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifySignedToken(token, { secret, invalidMessage }) {
  const normalizedToken = normalizeValue(token);
  const [encodedPayload, signature] = normalizedToken.split('.');

  if (!encodedPayload || !signature) {
    throw new Error(invalidMessage);
  }

  const expectedSignature = signEncodedPayload(encodedPayload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error(invalidMessage);
  }

  return decodePayload(encodedPayload, invalidMessage);
}
