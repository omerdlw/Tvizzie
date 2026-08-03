export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountWatchlistRouteData } from '@/domains/account/server/routes/route-read';
import Client from '@/app/(account)/account/[username]/watchlist/client';

export default createAccountRoutePage(Client, getUsernameAccountWatchlistRouteData);
