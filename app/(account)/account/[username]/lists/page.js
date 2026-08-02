export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountListsRouteData } from '@/domains/account/server/routes/route-read.server';
import Client from '@/app/(account)/account/[username]/lists/client';

export default createAccountRoutePage(Client, getUsernameAccountListsRouteData);
