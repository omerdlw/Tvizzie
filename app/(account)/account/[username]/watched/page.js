import { createAccountRoutePage } from '@/domains/account/ui/route/page-factory';
import { getUsernameAccountWatchedRouteData } from '@/domains/account/server/account-route-data.server';
import Client from '@/domains/account/screens/account-watched-client';

export default createAccountRoutePage(Client, getUsernameAccountWatchedRouteData);
