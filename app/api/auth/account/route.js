import { handleAccountPost } from '@/domains/auth/server/account-routes';
import { makeAuthResponsePrivate } from '@/domains/auth/server/response';

export async function POST(request) {
  return makeAuthResponsePrivate(await handleAccountPost(request), { varyByCookie: true });
}
