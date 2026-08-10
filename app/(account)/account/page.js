export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentAccountOverviewRouteData } from '@/domains/account/server/routes.server';
import Client from '@/app/(account)/account/client';

export default async function AccountPage() {
  const routeData = await getCurrentAccountOverviewRouteData();

  if (routeData?.username) {
    redirect(`/account/${routeData.username}`);
  }

  // A new OAuth user has a valid session before their profile/username is
  // bootstrapped. Render the client bootstrapper instead of bouncing that
  // authenticated request back to /sign-in.
  if (routeData?.initialResolvedUserId) {
    return <Client routeData={routeData} />;
  }

  redirect('/sign-in');
}
