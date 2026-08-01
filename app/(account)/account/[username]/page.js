import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { isReservedAccountSegment } from '@/shared/lib/account';
import {
  getUsernameAccountOverviewRouteData,
  redirectCurrentAccountSection,
} from '@/domains/account/server/routes/route-read.server';

import Client from '@/domains/account/ui/profile-client';

export default createAccountRoutePage(Client, getUsernameAccountOverviewRouteData, {
  beforeLoad: async (params) => {
    if (isReservedAccountSegment(params?.username)) {
      await redirectCurrentAccountSection(params.username);
    }
  },
});
