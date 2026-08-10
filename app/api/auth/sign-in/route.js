import { handleSignInPost } from '@/domains/auth/server/api-handlers.server';

export async function POST(request) {
  const response = await handleSignInPost(request);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
}
