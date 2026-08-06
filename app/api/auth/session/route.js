import { handleSessionGet } from '@/domains/auth/server/api-handlers.server';

export async function GET(request) {
  return handleSessionGet(request);
}
