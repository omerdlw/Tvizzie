export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentAccountOverviewRouteData } from '@/domains/account/server/routes.server';

export default async function AccountPage() {
  const routeData = await getCurrentAccountOverviewRouteData();

  if (routeData?.username) {
    redirect(`/account/${routeData.username}`);
  }

  redirect('/sign-in');
}
