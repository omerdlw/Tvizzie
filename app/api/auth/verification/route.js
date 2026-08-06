import { handleVerificationPost } from '@/domains/auth/server/api-handlers.server';

export async function POST(request) {
  return handleVerificationPost(request);
}
