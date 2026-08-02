export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getCurrentAccountOverviewRouteData } from '@/domains/account/server/routes/route-read.server';
import Client from '@/app/(account)/account/client';

export default createAccountRoutePage(Client, getCurrentAccountOverviewRouteData);
