import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

import { normalizeEmailValue, normalizeValue } from '@/shared';
import { AUTH_COOKIE_PATH } from '@/domains/auth/utils/constants';
import { getCookieValue, isSecureCookieEnvironment } from './session';
import {
  createAuthenticatedEphemeralClient,
  mintPasswordlessSession,
} from './passwordless-session';

export const MFA_PRIMARY_COOKIE_NAME = 'tvz_mfa_primary';
export const MFA_PRIMARY_MAX_AGE_MS = 5 * 60 * 1000;
const MFA_PRIMARY_MAX_AGE_SECONDS = MFA_PRIMARY_MAX_AGE_MS / 1000;

function getMfaPrimarySecret() {
  const secret =
    normalizeValue(process.env.MFA_PRIMARY_SESSION_SECRET) ||
    normalizeValue(process.env.EMAIL_VERIFICATION_SECRET);

  if (!secret) {
    throw new Error(
      'MFA_PRIMARY_SESSION_SECRET is missing on the server and EMAIL_VERIFICATION_SECRET fallback is unavailable',
    );
  }

  return createHash('sha256').update(secret).digest();
}

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function decode(value) {
  return Buffer.from(normalizeValue(value), 'base64url');
}

function encryptPendingMfa(payload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getMfaPrimarySecret(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);

  return [encode(iv), encode(encrypted), encode(cipher.getAuthTag())].join('.');
}

function decryptPendingMfa(token) {
  const [encodedIv, encodedPayload, encodedTag, ...rest] = normalizeValue(token).split('.');
  if (rest.length || !encodedIv || !encodedPayload || !encodedTag) {
    throw new Error('Authenticator verification session is invalid');
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', getMfaPrimarySecret(), decode(encodedIv));
    decipher.setAuthTag(decode(encodedTag));
    const payload = JSON.parse(
      Buffer.concat([decipher.update(decode(encodedPayload)), decipher.final()]).toString('utf8'),
    );
    const expiresAt = Number(payload?.exp) * 1000;

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new Error('Authenticator verification session has expired');
    }

    const accessToken = normalizeValue(payload?.accessToken);
    const refreshToken = normalizeValue(payload?.refreshToken);
    const factorId = normalizeValue(payload?.factorId);
    const challengeId = normalizeValue(payload?.challengeId);
    const userId = normalizeValue(payload?.userId);

    if (!accessToken || !refreshToken || !factorId || !challengeId || !userId) {
      throw new Error('Authenticator verification session is invalid');
    }

    return {
      accessToken,
      challengeId,
      deviceHash: normalizeValue(payload?.deviceHash),
      email: normalizeEmailValue(payload?.email),
      factorId,
      refreshToken,
      userId,
    };
  } catch (error) {
    if (String(error?.message || '').includes('expired')) throw error;
    throw new Error('Authenticator verification session is invalid');
  }
}

export async function createMfaPrimaryChallenge({ deviceHash, email, userId }) {
  const pendingSession = await mintPasswordlessSession({ email, userId });
  const { client, session } = await createAuthenticatedEphemeralClient(pendingSession);
  const listed = await client.auth.mfa.listFactors();

  if (listed.error) {
    throw new Error(listed.error.message || 'Authenticator factors could not be loaded');
  }

  const factor = (listed.data?.totp || []).find((item) => item?.status === 'verified');
  if (!factor?.id) return null;

  const challenged = await client.auth.mfa.challenge({ factorId: factor.id });
  if (challenged.error || !challenged.data?.id) {
    throw new Error(challenged.error?.message || 'Authenticator challenge could not be created');
  }

  return encryptPendingMfa({
    accessToken: session.access_token,
    challengeId: challenged.data.id,
    deviceHash: normalizeValue(deviceHash),
    email: normalizeEmailValue(email),
    exp: Math.floor((Date.now() + MFA_PRIMARY_MAX_AGE_MS) / 1000),
    factorId: factor.id,
    refreshToken: session.refresh_token,
    userId: pendingSession.userId,
  });
}

export function readMfaPrimaryChallenge(request, { deviceHash } = {}) {
  const pending = decryptPendingMfa(getCookieValue(request, MFA_PRIMARY_COOKIE_NAME));
  const expectedDeviceHash = normalizeValue(deviceHash);

  if (expectedDeviceHash && pending.deviceHash !== expectedDeviceHash) {
    throw new Error('Authenticator verification session does not match this device');
  }

  return pending;
}

export async function verifyMfaPrimaryChallenge({ code, pending }) {
  const { client } = await createAuthenticatedEphemeralClient(pending);
  const verified = await client.auth.mfa.verify({
    challengeId: pending.challengeId,
    code: normalizeValue(code),
    factorId: pending.factorId,
  });

  const session = verified.data?.session || verified.data;
  if (verified.error || !session?.access_token || !session?.refresh_token) {
    throw new Error(verified.error?.message || 'Authenticator code could not be verified');
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: verified.data?.user || session.user || null,
  };
}

export function setMfaPrimaryCookie(response, token) {
  response.cookies.set(MFA_PRIMARY_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: MFA_PRIMARY_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearMfaPrimaryCookie(response) {
  response.cookies.set(MFA_PRIMARY_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}
