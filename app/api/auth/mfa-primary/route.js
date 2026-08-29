import { handleMfaPrimaryPost } from '@/domains/auth/server/api-handlers';
import { makeAuthResponsePrivate } from '@/domains/auth/server/response';

export async function POST(request) {
  return makeAuthResponsePrivate(await handleMfaPrimaryPost(request), { varyByCookie: true });
}
