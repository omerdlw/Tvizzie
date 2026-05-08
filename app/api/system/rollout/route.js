import { NextResponse } from 'next/server';

import { resolveWriteRolloutDecision } from '@/core/services/shared/write-rollout.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domain = normalizeValue(searchParams.get('domain'));
  const endpoint = normalizeValue(searchParams.get('endpoint'));
  const userId = normalizeValue(searchParams.get('userId'));

  if (!domain || !endpoint || !userId) {
    return NextResponse.json(
      {
        error: 'domain, endpoint and userId are required',
      },
      {
        status: 400,
      }
    );
  }

  const decision = resolveWriteRolloutDecision({
    domain,
    endpoint,
    userId,
  });

  return NextResponse.json({
    decision,
  });
}
