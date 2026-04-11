import { NextResponse } from 'next/server';

import { ROLLOUT_CONFIG } from '@/config/rollout.config';
import { getRealtimeMode } from '@/config/provider.config';

function normalizeValue(value) {
  return String(value || '').trim();
}

function evaluateEnvironment() {
  const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INFRA_INTERNAL_TOKEN',
  ];

  const missing = requiredKeys.filter((key) => !normalizeValue(process.env[key]));

  return {
    missing,
    ok: missing.length === 0,
    required: requiredKeys,
  };
}

export async function GET() {
  const envStatus = evaluateEnvironment();

  return NextResponse.json(
    {
      env: {
        missing: envStatus.missing,
        ok: envStatus.ok,
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
