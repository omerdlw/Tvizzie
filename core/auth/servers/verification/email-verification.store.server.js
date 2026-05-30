import { AUTH_CHALLENGE_TABLE } from '@/core/auth/auth.constants';
import { createAdminClient } from '@/core/clients/supabase/admin';

import { AUTH_CHALLENGE_SELECT } from './email-verification.constants';

function getChallengesTable() {
  return createAdminClient().from(AUTH_CHALLENGE_TABLE);
}

export async function getChallengeByKey(key) {
  const result = await getChallengesTable().select(AUTH_CHALLENGE_SELECT).eq('challenge_key', key).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Verification challenge could not be loaded');
  }

  return result.data || null;
}

export async function upsertChallengeByKey(key, payload) {
  const result = await getChallengesTable().upsert(
    {
      challenge_key: key,
      ...payload,
    },
    {
      onConflict: 'challenge_key',
    }
  );

  if (result.error) {
    throw new Error(result.error.message || 'Verification challenge could not be persisted');
  }
}

export async function updateChallengeByKey(key, payload) {
  const result = await getChallengesTable().update(payload).eq('challenge_key', key);

  if (result.error) {
    throw new Error(result.error.message || 'Verification challenge could not be updated');
  }
}
