import { handleAccountPost } from '@/domains/auth/server/account-routes.server';

export async function POST(request) {
  return handleAccountPost(request);
}
