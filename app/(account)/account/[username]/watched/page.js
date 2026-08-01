import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountWatchedRouteData } from '@/domains/account/server/routes/read.server';
import Client from '@/domains/account/ui/watched-client';

export default createAccountRoutePage(Client, getUsernameAccountWatchedRouteData);
