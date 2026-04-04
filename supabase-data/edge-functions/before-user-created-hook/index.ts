import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { jsonResponse } from '../_shared/http.ts';
import { parseBoolean, parseCsvSet, parseNumber, normalizeLower } from '../_shared/normalize.ts';
import { callUpstash, isUpstashConfigured, sha256Hex } from '../_shared/upstash.ts';
import { readAndVerifyWebhook } from '../_shared/webhook.ts';

type BeforeUserCreatedEvent = {
  metadata?: {
    ip_address?: string;
    name?: string;
    time?: string;
    uuid?: string;
  };
  user?: {
    app_metadata?: {
      provider?: string;
      providers?: string[];
    };
    email?: string;
    id?: string;
    user_metadata?: Record<string, unknown>;
  };
};

class SignupPolicyError extends Error {
  public readonly httpCode: number;

  constructor(message: string, httpCode = 400) {
    super(message);
    this.name = 'SignupPolicyError';
    this.httpCode = httpCode;
  }
}

const HOOK_SECRET_ENV_NAMES = ['BEFORE_USER_CREATED_HOOK_SECRET'];

function allowResponse(): Response {
  return jsonResponse(200, {});
}

function rejectResponse(error: SignupPolicyError): Response {
  const status = error.httpCode === 403 ? 403 : 400;

  return jsonResponse(status, {
    error: {
      http_code: error.httpCode,
      message: error.message,
    },
  });
}

function runtimeErrorResponse(message: string): Response {
  return jsonResponse(
    503,
    {
      error: {
        http_code: 503,
        message,
      },
    },
    {
      'retry-after': 'true',
    }
  );
}

function extractDomain(email: string): string {
  const [_, domain = ''] = normalizeLower(email).split('@');
  return domain;
}

function isDisposableDomain(domain: string): boolean {
  const disposableDomains = parseCsvSet(Deno.env.get('AUTH_DISPOSABLE_EMAIL_DOMAINS'));
  return disposableDomains.has(domain);
}

async function enforceSignupRateLimit(event: BeforeUserCreatedEvent): Promise<void> {
  const maxAttempts = Math.max(0, parseNumber(Deno.env.get('SIGNUP_RATE_LIMIT_MAX_ATTEMPTS'), 20));

  if (!maxAttempts || !isUpstashConfigured()) {
    return;
  }

  const windowMs = Math.max(1_000, parseNumber(Deno.env.get('SIGNUP_RATE_LIMIT_WINDOW_MS'), 600_000));
  const keyPrefix =
    normalizeLower(Deno.env.get('SIGNUP_RATE_LIMIT_KEY_PREFIX')).replace(/[^a-z0-9:_-]/g, '') || 'tvz:signup:hook:v1';

  const email = normalizeLower(event.user?.email);
  const domain = extractDomain(email);
  const ipAddress = normalizeLower(event.metadata?.ip_address) || 'unknown';
  const keyMaterial = `${ipAddress}:${domain || email || 'no-email'}`;
  const keyHash = await sha256Hex(keyMaterial);

  const now = Date.now();
  const windowBucket = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${keyHash}:${windowBucket}`;
  const ttlSeconds = Math.max(2, Math.ceil(windowMs / 1000) + 5);

  const count = Number(await callUpstash(['incr', key])) || 0;

  if (count <= 1) {
    await callUpstash(['expire', key, ttlSeconds]);
  }

  if (count > maxAttempts) {
    throw new SignupPolicyError('Too many signup attempts. Please wait and try again.', 429);
  }
}

function enforceSignupPolicies(event: BeforeUserCreatedEvent): void {
  const email = normalizeLower(event.user?.email);
  const domain = extractDomain(email);
  const provider = normalizeLower(event.user?.app_metadata?.provider);

  const allowedDomains = parseCsvSet(Deno.env.get('AUTH_ALLOWED_EMAIL_DOMAINS'));
  const blockedDomains = parseCsvSet(Deno.env.get('AUTH_BLOCKED_EMAIL_DOMAINS'));
  const blockedProviders = parseCsvSet(Deno.env.get('AUTH_BLOCKED_SIGNUP_PROVIDERS'));

  if (blockedProviders.has(provider)) {
    throw new SignupPolicyError(`Signups with ${provider} are not allowed.`, 403);
  }

  if (domain && blockedDomains.has(domain)) {
    throw new SignupPolicyError('This email domain is not allowed for signup.', 403);
  }

  if (domain && isDisposableDomain(domain)) {
    throw new SignupPolicyError('Disposable email domains are not allowed.', 403);
  }

  if (allowedDomains.size > 0 && (!domain || !allowedDomains.has(domain))) {
    throw new SignupPolicyError('Please sign up with an approved email domain.', 403);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: { http_code: 405, message: 'Method not allowed' } });
  }

  const failOpen = parseBoolean(Deno.env.get('SIGNUP_HOOK_FAIL_OPEN'), true);

  try {
    const verification = await readAndVerifyWebhook<BeforeUserCreatedEvent>(request, HOOK_SECRET_ENV_NAMES);

    if (!verification.verified || !verification.event) {
      if (failOpen) {
        return allowResponse();
      }

      return runtimeErrorResponse(verification.error?.message || 'Webhook signature verification failed');
    }

    enforceSignupPolicies(verification.event);
    await enforceSignupRateLimit(verification.event);

    return allowResponse();
  } catch (error) {
    if (error instanceof SignupPolicyError) {
      return rejectResponse(error);
    }

    if (failOpen) {
      return allowResponse();
    }

    return runtimeErrorResponse(String((error as Error)?.message || 'Signup validation is temporarily unavailable'));
  }
});
