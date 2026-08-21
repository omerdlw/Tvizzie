export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountLikesRouteData } from '@/domains/account/server/page-data';
import AccountLikesView from '@/domains/account/ui/pages/account-likes';

export default createAccountRoutePage(
  AccountLikesView,
  getUsernameAccountLikesRouteData,
  (query) => ({
    segment:
      query?.segment === 'reviews' ? 'reviews' : query?.segment === 'lists' ? 'lists' : 'titles',
  }),
);
