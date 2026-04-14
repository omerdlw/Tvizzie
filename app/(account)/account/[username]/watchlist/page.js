import Client from './client';
import { getUsernameAccountWatchlistRouteData } from '@/core/services/account/account-route-data.server';

export default async function Page({ params }) {
  const { username } = await params;
  const routeData = await getUsernameAccountWatchlistRouteData(username);

  return <Client routeData={routeData} />;
}
