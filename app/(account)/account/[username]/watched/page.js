export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountWatchedRouteData } from '@/domains/account/server/routes/route-read';
import Client from '@/app/(account)/account/[username]/watched/client';

export default createAccountRoutePage(Client, getUsernameAccountWatchedRouteData);
