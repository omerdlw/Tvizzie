export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountActivityRouteData } from '@/domains/account/server/page-data';
import AccountActivityView from '@/domains/account/ui/pages/account-activity';

export default createAccountRoutePage(
  AccountActivityView,
  getUsernameAccountActivityRouteData,
  (query) => ({
    page: Number.isFinite(Number(query?.page)) ? Math.max(1, Math.floor(Number(query.page))) : 1,
    scope: query?.scope === 'following' ? 'following' : 'user',
    sort: query?.asort === 'oldest' ? 'oldest' : 'newest',
    subject:
      query?.asub === 'list' || query?.asub === 'movie' || query?.asub === 'tv'
        ? query.asub
        : 'all',
  }),
);
