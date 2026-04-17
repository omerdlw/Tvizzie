import { NextResponse } from 'next/server';

import { ROLLOUT_CONFIG } from '@/config/rollout.config';
import { getRealtimeMode } from '@/config/provider.config';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeBoolean(value, fallback = false) {
  const normalized = normalizeLowerValue(value);

  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function hasAnyConfigured(keys = []) {
  return keys.some((key) => normalizeValue(process.env[key]));
}

function resolveEmailProvider() {
  const explicitProvider = normalizeLowerValue(process.env.EMAIL_PROVIDER);

  if (explicitProvider) {
    return explicitProvider;
  }

  if (normalizeValue(process.env.BREVO_SMTP_KEY) || normalizeValue(process.env.BREVO_SMTP_LOGIN)) {
    return 'brevo';
  }

  return 'smtp';
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
    'PASSWORD_RESET_PROOF_SECRET',
    'STEP_UP_SECRET',
    'RECENT_REAUTH_SECRET',
  ];
  const emailProvider = resolveEmailProvider();

  if (emailProvider === 'brevo') {
    requiredKeys.push('BREVO_SMTP_LOGIN', 'BREVO_SMTP_KEY', 'BREVO_SMTP_FROM');
  } else {
    requiredKeys.push('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM');
  }

  requiredKeys.forEach((key) => {
    if (!normalizeValue(process.env[key])) {
      missing.push(key);
    }
  });

  if (!hasAnyConfigured(['NEXT_PUBLIC_SITE_URL', 'SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL'])) {
    missing.push('NEXT_PUBLIC_SITE_URL|SITE_URL|VERCEL_PROJECT_PRODUCTION_URL');
  }

  if (normalizeBoolean(process.env.ACCOUNT_MEDIA_ALLOW_ANY_EXTERNAL_URL, false)) {
    warnings.push('ACCOUNT_MEDIA_ALLOW_ANY_EXTERNAL_URL');
  }

  if (!normalizeValue(process.env.NEXT_PUBLIC_TMDB_READ_TOKEN)) {
    warnings.push('NEXT_PUBLIC_TMDB_READ_TOKEN');
  }

  return {
    missing,
    ok: missing.length === 0,
    required: requiredKeys,
    warnings,
    emailProvider,
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
        realtimeMode: getRealtimeMode(),
      },
      service: 'tvizzie-api',
    },
    {
      status: envStatus.ok ? 200 : 503,
    }
  );
}
