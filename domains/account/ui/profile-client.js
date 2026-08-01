'use client';

import AccountClient from '@/domains/account/ui/overview-client';
import Registry from '@/domains/account/ui/profile-registry';

export default function Client({ routeData = null }) {
  return <AccountClient routeData={routeData} RegistryComponent={Registry} />;
}
