import { getRealtimeTransportMode } from '@/infrastructure/realtime/client';
import { NextResponse } from 'next/server';

import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';
import { ROLLOUT_CONFIG } from '@/infrastructure/http/server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function evaluateEnvironment() {
  const missing = [];
  const warnings = [];
  const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INFRA_INTERNAL_TOKEN',
    'TMDB_API_KEY',
    'EMAIL_VERIFICATION_SECRET',
    'LOGIN_VERIFICATION_SECRET',
    'SIGN_UP_PROOF_SECRET',
    'STEP_UP_SECRET',
    'RECENT_REAUTH_SECRET',
    'BREVO_API_KEY',
    'BREVO_SENDER_EMAIL',
  ];

  requiredKeys.forEach((key) => {
    if (!normalizeValue(process.env[key])) {
      missing.push(key);
    }
  });

  if (!normalizeValue(process.env.NEXT_PUBLIC_TMDB_READ_TOKEN)) {
    warnings.push('NEXT_PUBLIC_TMDB_READ_TOKEN');
  }

  return {
    missing,
    ok: missing.length === 0,
    required: requiredKeys,
    warnings,
    emailProvider: 'brevo',
  };
}

export async function GET() {
  const envStatus = evaluateEnvironment();

  return NextResponse.json(
    {
      env: {
        emailProvider: envStatus.emailProvider,
        missing: envStatus.missing,
        ok: envStatus.ok,
        warnings: envStatus.warnings,
      },
      generatedAt: new Date().toISOString(),
      ok: envStatus.ok,
      rollout: {
        canaryPercent: ROLLOUT_CONFIG.canaryPercent,
        defaultMode: ROLLOUT_CONFIG.defaultMode,
        domains: Object.keys(ROLLOUT_CONFIG.domains || {}),
      },
      runtime: {
        realtimeMode: getRealtimeTransportMode(),
      },
      service: 'tvizzie-api',
    },
    {
      status: envStatus.ok ? 200 : 503,
      headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
    },
  );
}
