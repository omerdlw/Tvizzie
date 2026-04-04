import { isReservedAccountSegment } from '@/features/account/route-segments';
import {
  getUsernameAccountOverviewRouteData,
  redirectCurrentAccountSection,
} from '@/core/services/account/account-route-data.server';

import Client from './client';

export default async function Page({ params }) {
  const { username } = await params;

  if (isReservedAccountSegment(username)) {
    await redirectCurrentAccountSection(username);
  }

  const routeData = await getUsernameAccountOverviewRouteData(username);

  return <Client {...routeData} />;
}
