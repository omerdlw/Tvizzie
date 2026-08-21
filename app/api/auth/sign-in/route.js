import { handleSignInPost } from '@/domains/auth/server/api-handlers';
import { makeAuthResponsePrivate } from '@/domains/auth/server/response';

export async function POST(request) {
  return makeAuthResponsePrivate(await handleSignInPost(request), { varyByCookie: true });
}
