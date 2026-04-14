import Client from './client';
import { getUsernameAccountWatchedRouteData } from '@/core/services/account/account-route-data.server';

export default async function Page({ params }) {
  const { username } = await params;
  const routeData = await getUsernameAccountWatchedRouteData(username);

  return <Client routeData={routeData} />;
}
