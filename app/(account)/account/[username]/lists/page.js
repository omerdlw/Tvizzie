export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountListsRouteData } from '@/domains/account/server/page-data';
import AccountListsView from '@/domains/account/ui/pages/account-lists';

export default createAccountRoutePage(AccountListsView, getUsernameAccountListsRouteData);
