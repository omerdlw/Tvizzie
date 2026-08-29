import 'server-only';

import { searchAccountProfiles } from '@/domains/account/server/profile';
import { cleanString } from '@/shared';

import { toAccountProfileDocument } from './profile-document';

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(50, Math.max(1, Math.floor(parsed)));
}

export function normalizeAccountProfileSearch({ limit = 10, query } = {}) {
  return {
    limit: normalizeLimit(limit),
    query: cleanString(query),
  };
}

export function createAccountProfileSearch({ searchProfiles }) {
  if (typeof searchProfiles !== 'function') {
    throw new Error('Account profile search requires a profile search implementation');
  }

  return Object.freeze({
    async search({ limit, query } = {}) {
      const input = normalizeAccountProfileSearch({ limit, query });
      if (!input.query) return { items: [] };

      const profiles = await searchProfiles({
        limitCount: input.limit,
        searchTerm: input.query,
      });
      return {
        items: Array.isArray(profiles) ? profiles.map(toAccountProfileDocument) : [],
      };
    },
  });
}

export const accountProfileSearch = createAccountProfileSearch({
  searchProfiles: searchAccountProfiles,
});
