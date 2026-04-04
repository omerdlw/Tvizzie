import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { jsonResponse } from '../_shared/http.ts';
import { parseBoolean } from '../_shared/normalize.ts';
import { parseWebhookJsonFallback, readAndVerifyWebhook } from '../_shared/webhook.ts';

type AccessTokenHookPayload = {
  authentication_method?: string;
  claims?: Record<string, unknown>;
  user_id?: string;
};

const HOOK_SECRET_ENV_NAMES = ['CUSTOM_ACCESS_TOKEN_HOOK_SECRET'];

const REQUIRED_CLAIMS = [
  'iss',
  'aud',
  'exp',
  'iat',
  'sub',
  'role',
  'aal',
  'session_id',
  'email',
  'phone',
  'is_anonymous',
];

const OPTIONAL_CLAIMS = ['jti', 'nbf', 'amr', 'client_id'];

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

function hasClaim(claims: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(claims, key);
}

function hasRequiredClaims(claims: Record<string, unknown>): boolean {
  return REQUIRED_CLAIMS.every((claim) => hasClaim(claims, claim));
}

function applyRoleOverrides(claims: Record<string, unknown>): void {
  const appMetadata = claims.app_metadata;

  if (!appMetadata || typeof appMetadata !== 'object' || Array.isArray(appMetadata)) {
    return;
  }

  const role = (appMetadata as Record<string, unknown>)?.role;

  if (typeof role === 'string' && role.trim()) {
    claims.role = role.trim();
  }
}

function buildClaims(inputClaims: Record<string, unknown>): Record<string, unknown> {
  const includeUserMetadata = parseBoolean(Deno.env.get('CUSTOM_TOKEN_INCLUDE_USER_METADATA'), false);
  const includeAppMetadata = parseBoolean(Deno.env.get('CUSTOM_TOKEN_INCLUDE_APP_METADATA'), true);
  const forceAudience = String(Deno.env.get('CUSTOM_TOKEN_FORCE_AUD') || '').trim();

  const output: Record<string, unknown> = {};

  for (const claim of REQUIRED_CLAIMS) {
    if (hasClaim(inputClaims, claim)) {
      output[claim] = inputClaims[claim];
    }
  }

  for (const claim of OPTIONAL_CLAIMS) {
    if (hasClaim(inputClaims, claim)) {
      output[claim] = inputClaims[claim];
    }
  }

  if (includeAppMetadata && hasClaim(inputClaims, 'app_metadata')) {
    output.app_metadata = inputClaims.app_metadata;
  }

  if (includeUserMetadata && hasClaim(inputClaims, 'user_metadata')) {
    output.user_metadata = inputClaims.user_metadata;
  }

  if (forceAudience) {
    output.aud = forceAudience;
  }

  applyRoleOverrides(output);

  return output;
}

function fallbackClaims(rawPayload: string): Record<string, unknown> | null {
  const fallback = parseWebhookJsonFallback<AccessTokenHookPayload>(rawPayload);

  if (!fallback?.claims || typeof fallback.claims !== 'object') {
    return null;
  }

  return fallback.claims as Record<string, unknown>;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: { http_code: 405, message: 'Method not allowed' } });
  }

  const failOpen = parseBoolean(Deno.env.get('CUSTOM_TOKEN_HOOK_FAIL_OPEN'), true);
  let safeClaims: Record<string, unknown> | null = null;

  try {
    const verification = await readAndVerifyWebhook<AccessTokenHookPayload>(request, HOOK_SECRET_ENV_NAMES);

    if (!verification.verified || !verification.event) {
      if (failOpen) {
        const claims = fallbackClaims(verification.rawPayload);

        if (claims) {
          safeClaims = claims;
          return jsonResponse(200, { claims });
        }
      }

      return runtimeErrorResponse(verification.error?.message || 'Webhook signature verification failed');
    }

    const inputClaims = verification.event.claims;

    if (!inputClaims || typeof inputClaims !== 'object' || Array.isArray(inputClaims)) {
      if (failOpen) {
        const claims = fallbackClaims(verification.rawPayload);

        if (claims) {
          safeClaims = claims;
          return jsonResponse(200, { claims });
        }
      }

      return runtimeErrorResponse('Invalid claims payload');
    }
    safeClaims = inputClaims;

    const claims = buildClaims(inputClaims);

    if (!hasRequiredClaims(claims)) {
      if (failOpen) {
        return jsonResponse(200, { claims: inputClaims });
      }

      return runtimeErrorResponse('Required JWT claims are missing');
    }

    return jsonResponse(200, { claims });
  } catch (error) {
    if (failOpen && safeClaims) {
      return jsonResponse(200, { claims: safeClaims });
    }

    return runtimeErrorResponse(String((error as Error)?.message || 'Custom access token hook failed'));
  }
});
