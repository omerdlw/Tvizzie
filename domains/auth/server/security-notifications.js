import 'server-only';

import { normalizeEmailValue, normalizeValue } from '@/shared';

import { claimAuthSecurityNotification } from './security-surfaces';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character] || character;
  });
}

function getBrevoConfig() {
  const apiKey = normalizeValue(process.env.BREVO_API_KEY);
  const from =
    normalizeValue(process.env.BREVO_SENDER_EMAIL) || normalizeValue(process.env.BREVO_SMTP_FROM);
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

async function sendSecurityEmail({ email, eventType, dedupeKey, title, description }) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail) return false;

  const config = getBrevoConfig();
  if (!config) return false;

  const claimed = await claimAuthSecurityNotification({
    dedupeKey,
    eventType,
    userId: dedupeKey?.split(':')[1],
  }).catch(() => false);
  if (!claimed) return false;

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': config.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: config.from, name: 'Tvizzie' },
      to: [{ email: normalizedEmail }],
      subject: `Tvizzie security alert: ${title}`,
      textContent: `${title}\n\n${description}\n\nIf this was not you, sign in and review your account security settings.`,
      htmlContent: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px"><h2>${safeTitle}</h2><p>${safeDescription}</p><p style="color:#777">If this was not you, sign in and review your account security settings.</p></div>`,
    }),
  });

  if (!response.ok) throw new Error(`Security notification failed with status ${response.status}`);
  return true;
}

function createDedupeKey({ eventType, userId, fingerprint = '' }) {
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  return `${eventType}:${userId}:${bucket}:${normalizeValue(fingerprint).slice(0, 80)}`;
}

export function sendNewDeviceNotification({ email, userId, deviceLabel, fingerprint }) {
  return sendSecurityEmail({
    dedupeKey: createDedupeKey({ eventType: 'new-device', fingerprint, userId }),
    description: `A new ${deviceLabel || 'device'} signed in to your Tvizzie account.`,
    email,
    eventType: 'new-device',
    title: 'New device sign-in',
  });
}

export function sendProviderLinkedNotification({ email, userId, provider }) {
  const label = normalizeValue(provider) || 'OAuth provider';
  return sendSecurityEmail({
    dedupeKey: createDedupeKey({ eventType: 'provider-linked', fingerprint: label, userId }),
    description: `${label} was connected as a sign-in method for your account.`,
    email,
    eventType: 'provider-linked',
    title: 'New sign-in method connected',
  });
}

export function sendPasskeyAddedNotification({ email, userId, deviceLabel }) {
  return sendSecurityEmail({
    dedupeKey: createDedupeKey({ eventType: 'passkey-added', fingerprint: deviceLabel, userId }),
    description: `A passkey${deviceLabel ? ` on ${deviceLabel}` : ''} was added to your account.`,
    email,
    eventType: 'passkey-added',
    title: 'Passkey added',
  });
}
