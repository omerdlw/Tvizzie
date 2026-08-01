import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountListsRouteData } from '@/domains/account/server/routes/read.server';
import Client from '@/domains/account/ui/lists-client';

export default createAccountRoutePage(Client, getUsernameAccountListsRouteData);
