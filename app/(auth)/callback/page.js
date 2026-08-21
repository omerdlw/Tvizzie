export const dynamic = 'force-dynamic';

import OAuthCallbackView from '@/domains/auth/ui/pages/oauth-callback';

export default async function CallbackPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return <OAuthCallbackView initialProvider={resolvedSearchParams?.provider || null} />;
}
