export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { isReservedAccountSegment } from '@/domains/account/utils';
import {
  getUsernameAccountOverviewRouteData,
  redirectCurrentAccountSection,
} from '@/domains/account/server/routes/route-read';

import Client from '@/app/(account)/account/[username]/client';

export default createAccountRoutePage(Client, getUsernameAccountOverviewRouteData, {
  beforeLoad: async (params) => {
    if (isReservedAccountSegment(params?.username)) {
      await redirectCurrentAccountSection(params.username);
    }
  },
});
