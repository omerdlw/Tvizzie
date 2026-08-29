export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountDiaryRouteData } from '@/domains/account/server/page-data';
import AccountDiaryView from '@/domains/account/ui/pages/account-diary';

export default createAccountRoutePage(AccountDiaryView, getUsernameAccountDiaryRouteData);
