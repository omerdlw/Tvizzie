import { createAccountRoutePage } from '@/domains/account/ui/route/page-factory';
import { getUsernameAccountWatchlistRouteData } from '@/domains/account/server/account-route-data.server';
import Client from '@/domains/account/screens/account-watchlist-client';

export default createAccountRoutePage(Client, getUsernameAccountWatchlistRouteData);
