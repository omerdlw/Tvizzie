import 'server-only';

import { NextResponse } from 'next/server';
import { readReviews } from './read-reviews.server.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(await readReviews(Object.fromEntries(searchParams)));
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Reviews could not be loaded'),
      },
      {
        status: Number.isFinite(Number(error?.status)) ? Number(error.status) : 500,
      },
    );
  }
}
