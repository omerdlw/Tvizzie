import 'server-only';

export const ACCOUNT_COLLECTION_RESOURCES = new Set([
  'likes',
  'watchlist',
  'lists',
  'list-items',
  'list-by-id',
  'list-by-slug',
  'liked-lists',
  'like-status',
  'watchlist-status',
  'watched-status',
  'watched',
]);

export const PROTECTED_ACCOUNT_COLLECTION_RESOURCES = new Set([
  'like-status',
  'liked-lists',
  'likes',
  'list-by-id',
  'list-by-slug',
  'list-items',
  'lists',
  'watchlist',
  'watchlist-status',
  'watched',
  'watched-status',
]);

export function resolveLimitCount(value, fallback = 0, max = 100) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

export function assertResult(result, fallbackMessage) {
  if (result?.error) {
    const error = result.error;
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('fetch failed') || message.includes('socket') || message.includes('connection')) {
      console.error(`[Supabase Connection Error] ${fallbackMessage}:`, error);
      return { data: null, error };
    }

    throw new Error(error.message || fallbackMessage);
  }

  return result;
}

async function withQueryTimeout(
  promise,
  { timeoutMs = 4000, fallbackValue = { data: [], error: null }, label = 'Query' } = {}
) {
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs)
  );

  const result = await Promise.race([promise, timeoutPromise]);

  if (result?.timedOut) {
    console.warn(`[Supabase ${label} Timeout] After ${timeoutMs}ms. Returning fallback.`);
    return result;
  }

  return result;
}

export async function executeCollectionQuery(
  query,
  { fallbackValue = { data: [], error: null }, label = 'Collection query', strict = false, timeoutMs = 4000 } = {}
) {
  if (strict) {
    return query;
  }

  return withQueryTimeout(query, {
    fallbackValue,
    label,
    timeoutMs,
  });
}

export async function countListLikesByListIds(client, assertQueryResult, listIds = []) {
  if (!Array.isArray(listIds) || listIds.length === 0) {
    return new Map();
  }

  const likesMap = new Map();

  for (let index = 0; index < listIds.length; index += 100) {
    const ids = listIds.slice(index, index + 100);
    const result = await client.from('list_likes').select('list_id, user_id').in('list_id', ids);

    assertQueryResult(result, 'List likes could not be loaded');
    (result.data || []).forEach((row) => {
      const current = likesMap.get(row.list_id) || [];
      current.push(row.user_id);
      likesMap.set(row.list_id, current);
    });
  }

  return likesMap;
}
