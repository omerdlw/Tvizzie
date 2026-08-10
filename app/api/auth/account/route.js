import { handleAccountPost } from '@/domains/auth/server/account-routes.server';
import { makeAuthResponsePrivate } from '@/domains/auth/server/response.server';

export async function POST(request) {
  return makeAuthResponsePrivate(await handleAccountPost(request), { varyByCookie: true });
}
