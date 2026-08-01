import { handleAccountPost } from '@/domains/auth/servers/account-route/account-route.handlers.server';

export async function POST(request) {
  return handleAccountPost(request);
}
