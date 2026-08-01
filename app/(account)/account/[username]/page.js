import { createAccountRoutePage } from '@/domains/account/ui/route/page-factory';
import { isReservedAccountSegment } from '@/shared/lib/account';
import {
  getUsernameAccountOverviewRouteData,
  redirectCurrentAccountSection,
} from '@/domains/account/server/account-route-data.server';

import Client from '@/domains/account/screens/account-profile-client';

export default createAccountRoutePage(Client, getUsernameAccountOverviewRouteData, {
  beforeLoad: async (params) => {
    if (isReservedAccountSegment(params?.username)) {
      await redirectCurrentAccountSection(params.username);
    }
  },
});
