import { handleSignUpCompletePost } from '@/domains/auth/server/api-handlers.server';
import { makeAuthResponsePrivate } from '@/domains/auth/server/response.server';

export async function POST(request) {
  return makeAuthResponsePrivate(await handleSignUpCompletePost(request), {
    varyByCookie: true,
  });
}
