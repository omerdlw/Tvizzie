import { handleSignUpCompletePost } from '@/domains/auth/server/api-handlers';
import { makeAuthResponsePrivate } from '@/domains/auth/server/response';

export async function POST(request) {
  return makeAuthResponsePrivate(await handleSignUpCompletePost(request), {
    varyByCookie: true,
  });
}
