import { notFound, redirect } from 'next/navigation';

import Client from '../../client';
import { getUsernameAccountWatchlistRouteData } from '@/core/services/account/account-route-data.server';

export default async function Page({ params }) {
  const { page, username } = await params;
  const pageNumber = Number.parseInt(page, 10);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    notFound();
  }

  if (pageNumber === 1) {
    redirect(`/account/${username}/watchlist`);
  }

  const routeData = await getUsernameAccountWatchlistRouteData(username);

  return <Client routeData={routeData} />;
}
