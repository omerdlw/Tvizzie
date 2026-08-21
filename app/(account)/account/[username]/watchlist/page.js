export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountWatchlistRouteData } from '@/domains/account/server/page-data';
import AccountWatchlistView from '@/domains/account/ui/pages/account-watchlist';

export default createAccountRoutePage(AccountWatchlistView, getUsernameAccountWatchlistRouteData);
