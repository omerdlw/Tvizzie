import 'server-only';

import { NextResponse } from 'next/server';
import { readReviews } from './read-reviews.server.js';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/http-server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await readReviews(Object.fromEntries(searchParams));
    return NextResponse.json(data, {
      headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_MEDIA_REVIEWS),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Reviews could not be loaded'),
      },
      {
        status: Number.isFinite(Number(error?.status)) ? Number(error.status) : 500,
        headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
      },
    );
  }
}

