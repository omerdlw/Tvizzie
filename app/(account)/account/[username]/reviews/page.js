import Client from './client';
import { getUsernameAccountReviewsRouteData } from '@/core/services/account/account-route-data.server';

export default async function Page({ params }) {
  const { username } = await params;
  const routeData = await getUsernameAccountReviewsRouteData(username);

  return <Client routeData={routeData} />;
}
