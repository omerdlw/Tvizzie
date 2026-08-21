import { NextResponse } from 'next/server';

import { searchAccountProfiles } from '@/domains/account/server/profile';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const items = await searchAccountProfiles({
      limitCount: searchParams.get('limitCount'),
      searchTerm: searchParams.get('searchTerm'),
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Account search failed:', error);
    return NextResponse.json({ error: 'Account search failed' }, { status: 500 });
  }
}
