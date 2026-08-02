export const dynamic = 'force-dynamic';

import Client from '@/app/(auth)/callback/client';

export default async function CallbackPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return <Client initialProvider={resolvedSearchParams?.provider || null} />;
}
