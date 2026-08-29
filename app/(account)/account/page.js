export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getCurrentAccountOverviewRouteData } from '@/domains/account/server/page-data';
import AccountOverviewView from '@/domains/account/ui/pages/account-overview';

export default async function AccountPage() {
  const routeData = await getCurrentAccountOverviewRouteData();

  if (routeData?.username) {
    redirect(`/account/${routeData.username}`);
  }

  return <AccountOverviewView routeData={routeData} />;
}
