'use server';

import { getPersonAwards } from '@/domains/media/server/person-awards';

export async function getPersonAwardsServer({ personId }) {
  if (!personId) return { success: false, error: 'missing_person_id' };

  try {
    return {
      success: true,
      data: await getPersonAwards(personId),
    };
  } catch {
    return { success: false, error: 'awards_unavailable' };
  }
}
