'use client';

import { AccountOverviewRegistry } from '@/app/(account)/registry';
import AccountOverviewClient from '@/domains/account/ui/sections/overview/account-overview-client';

export default function AccountClient({ routeData = null, RegistryComponent = AccountOverviewRegistry }) {
  return <AccountOverviewClient routeData={routeData} RegistryComponent={RegistryComponent} />;
}
