export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountListsRouteData } from '@/domains/account/server/routes.server';
import Client from '@/app/(account)/account/[username]/lists/client';

export default createAccountRoutePage(Client, getUsernameAccountListsRouteData);
