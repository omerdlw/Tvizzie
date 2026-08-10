export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountWatchlistRouteData } from '@/domains/account/server/routes.server';
import Client from '@/app/(account)/account/[username]/watchlist/client';

export default createAccountRoutePage(Client, getUsernameAccountWatchlistRouteData);
