export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountReviewsRouteData } from '@/domains/account/server/page-data';
import AccountReviewsView from '@/domains/account/ui/pages/account-reviews';

export default createAccountRoutePage(AccountReviewsView, getUsernameAccountReviewsRouteData);
