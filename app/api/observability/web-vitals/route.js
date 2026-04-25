import { NextResponse } from 'next/server';

import { CACHE_CONTROL, cacheControlHeaders } from '@/core/services/shared/cache-policy.server';

function normalizeMetric(payload = {}) {
  const delta = Number(payload?.delta);
  const value = Number(payload?.value);

  return {
    delta: Number.isFinite(delta) ? delta : 0,
    id: String(payload?.id || '').trim().slice(0, 120),
    name: String(payload?.name || '').trim().slice(0, 40),
    navigationType: String(payload?.navigationType || '').trim().slice(0, 40) || 'navigate',
    pathname: String(payload?.pathname || '').trim().slice(0, 200) || '/',
    rating: String(payload?.rating || '').trim().slice(0, 40) || 'unknown',
    value: Number.isFinite(value) ? value : 0,
  };
}

function isValidMetric(metric) {
  return Boolean(metric.id && metric.name);
}

export async function POST(request) {
  let payload = null;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const metric = normalizeMetric(payload);

  if (!isValidMetric(metric)) {
    return NextResponse.json({ error: 'Metric name and id are required' }, { status: 400 });
  }

  console.info('[web-vitals]', JSON.stringify(metric));

  return new NextResponse(null, {
    status: 204,
    headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
  });
}
