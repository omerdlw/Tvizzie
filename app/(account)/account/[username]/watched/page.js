export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountWatchedRouteData } from '@/domains/account/server/routes.server';
import Client from '@/app/(account)/account/[username]/watched/client';

export default createAccountRoutePage(Client, getUsernameAccountWatchedRouteData);
