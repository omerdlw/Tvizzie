import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

import { normalizeTrim, pickFirstEnv } from './normalize.ts';

export type VerifiedWebhookResult<T> = {
  error: Error | null;
  event: T | null;
  headers: Record<string, string>;
  rawPayload: string;
  verified: boolean;
};

function normalizeWebhookSecret(secret: string): string {
  return secret
    .replace(/^v\d+,whsec_/i, '')
    .replace(/^whsec_/i, '')
    .trim();
}

function parseWebhookSecrets(rawSecrets: string): string[] {
  return rawSecrets
    .split('|')
    .map((item) => normalizeWebhookSecret(item))
    .filter(Boolean);
}

export async function readAndVerifyWebhook<T>(
  request: Request,
  secretEnvNames: string[]
): Promise<VerifiedWebhookResult<T>> {
  const rawPayload = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  const rawSecrets = pickFirstEnv(secretEnvNames);

  if (!rawSecrets) {
    return {
      error: new Error(`Missing webhook secret. Expected one of: ${secretEnvNames.join(', ')}`),
      event: null,
      headers,
      rawPayload,
      verified: false,
    };
  }

  const secrets = parseWebhookSecrets(rawSecrets);

  if (!secrets.length) {
    return {
      error: new Error('Webhook secret is empty after normalization'),
      event: null,
      headers,
      rawPayload,
      verified: false,
    };
  }

  let latestError: Error | null = null;

  for (const secret of secrets) {
    try {
      const webhook = new Webhook(secret);
      const event = webhook.verify(rawPayload, headers) as T;

      return {
        error: null,
        event,
        headers,
        rawPayload,
        verified: true,
      };
    } catch (error) {
      latestError = error as Error;
    }
  }

  return {
    error: latestError || new Error('Webhook signature verification failed'),
    event: null,
    headers,
    rawPayload,
    verified: false,
  };
}

export function parseWebhookJsonFallback<T>(rawPayload: string): T | null {
  const payload = normalizeTrim(rawPayload);

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}
