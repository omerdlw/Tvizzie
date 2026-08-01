'use client';

import AccountClient from '@/domains/account/screens/account-overview-client';
import Registry from '@/domains/account/screens/account-profile-registry';

export default function Client({ routeData = null }) {
  return <AccountClient routeData={routeData} RegistryComponent={Registry} />;
}
