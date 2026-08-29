export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountWatchedRouteData } from '@/domains/account/server/page-data';
import AccountWatchedView from '@/domains/account/ui/pages/account-watched';

export default createAccountRoutePage(AccountWatchedView, getUsernameAccountWatchedRouteData);
