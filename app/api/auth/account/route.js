import { handleAccountPost } from './server/account-route.handlers.server';

export async function POST(request) {
  return handleAccountPost(request);
}
