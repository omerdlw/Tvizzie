export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { isReservedAccountSegment } from '@/domains/account/utils/validation';
import {
  getUsernameAccountOverviewRouteData,
  redirectCurrentAccountSection,
} from '@/domains/account/server/page-data';

import AccountOverviewView from '@/domains/account/ui/pages/account-overview';

export default createAccountRoutePage(AccountOverviewView, getUsernameAccountOverviewRouteData, {
  beforeLoad: async (params) => {
    if (isReservedAccountSegment(params?.username)) {
      await redirectCurrentAccountSection(params.username);
    }
  },
});
