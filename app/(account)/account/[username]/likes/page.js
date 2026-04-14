import Client from './client';
import { getUsernameAccountLikesRouteData } from '@/core/services/account/account-route-data.server';

export default async function Page({ params, searchParams }) {
  const { username } = await params;
  const query = await searchParams;
  const segment = query?.segment === 'reviews' ? 'reviews' : query?.segment === 'lists' ? 'lists' : 'films';
  const routeData = await getUsernameAccountLikesRouteData(username, {
    segment,
  });

  return <Client routeData={routeData} />;
}
