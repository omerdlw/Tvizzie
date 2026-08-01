import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountWatchlistRouteData } from '@/domains/account/server/routes/read.server';
import Client from '@/domains/account/ui/watchlist-client';

export default createAccountRoutePage(Client, getUsernameAccountWatchlistRouteData);
