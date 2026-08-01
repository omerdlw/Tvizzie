import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getCurrentAccountOverviewRouteData } from '@/domains/account/server/routes/route-read.server';
import Client from '@/domains/account/ui/overview-client';

export default createAccountRoutePage(Client, getCurrentAccountOverviewRouteData);
