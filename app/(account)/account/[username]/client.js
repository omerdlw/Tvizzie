'use client';

import AccountClient from '@/app/(account)/account/client';
import { AccountOverviewRegistry as Registry } from '@/app/(account)/registry';

export default function Client({ routeData = null }) {
  return <AccountClient routeData={routeData} RegistryComponent={Registry} />;
}
