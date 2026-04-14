import Client from './client';
import { getUsernameAccountActivityRouteData } from '@/core/services/account/account-route-data.server';

export default async function Page({ params, searchParams }) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const page = Number.isFinite(Number(resolvedSearchParams?.page))
    ? Math.max(1, Math.floor(Number(resolvedSearchParams.page)))
    : 1;
  const scope = resolvedSearchParams?.scope === 'following' ? 'following' : 'user';
  const sort = resolvedSearchParams?.asort === 'oldest' ? 'oldest' : 'newest';
  const subject =
    resolvedSearchParams?.asub === 'list' || resolvedSearchParams?.asub === 'movie' ? resolvedSearchParams.asub : 'all';
  const routeData = await getUsernameAccountActivityRouteData(username, {
    page,
    scope,
    sort,
    subject,
  });

  return <Client routeData={routeData} />;
}
