'use server';

import { searchCommunityServerInternal } from '../server/search-community';

export async function searchCommunityServer({ query, limit = 10 }) {
  try {
    const data = await searchCommunityServerInternal({ query, limit });
    return { success: true, ...data };
  } catch (error) {
    return { success: false, error: error.message || 'Community search failed' };
  }
}
