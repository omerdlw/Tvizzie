import { createAccountRoutePage } from '../shared/route-page';
import { isReservedAccountSegment } from '@/core/utils/account-routing';
import {
  getUsernameAccountOverviewRouteData,
  redirectCurrentAccountSection,
} from '@/core/services/account/account-route-data.server';

import Client from './client';

export default createAccountRoutePage(Client, getUsernameAccountOverviewRouteData, {
  beforeLoad: async (params) => {
    if (isReservedAccountSegment(params?.username)) {
      await redirectCurrentAccountSection(params.username);
    }
  },
});
