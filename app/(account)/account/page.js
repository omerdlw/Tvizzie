import { createAccountRoutePage } from '@/domains/account/ui/route/page-factory';
import { getCurrentAccountOverviewRouteData } from '@/domains/account/server/account-route-data.server';
import Client from '@/domains/account/screens/account-overview-client';

export default createAccountRoutePage(Client, getCurrentAccountOverviewRouteData);
