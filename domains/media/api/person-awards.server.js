'use server';

import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';

export async function getPersonAwardsServer({ personId }) {
  try {
    if (!personId) {
      return { success: false, error: 'missing_person_id' };
    }

    const response = await TmdbService.getPersonAwards(personId);
    if (!response) {
      return { success: false, error: 'no_data' };
    }

    return { success: true, data: response.data || null };
  } catch (err) {
    return { success: false, error: err?.message || 'unknown_error' };
  }
}
