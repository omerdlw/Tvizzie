import { createAccountRoutePage } from '@/domains/account/ui/route/page-factory';
import { getUsernameAccountListsRouteData } from '@/domains/account/server/account-route-data.server';
import Client from '@/domains/account/screens/account-lists-client';

export default createAccountRoutePage(Client, getUsernameAccountListsRouteData);
