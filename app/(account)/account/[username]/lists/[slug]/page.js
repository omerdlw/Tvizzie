import { createAccountRoutePage } from '../../../shared/route-page';
import { getUsernameAccountListDetailRouteData } from '@/core/services/account/account-route-data.server';

import Client from './client';

function loadRouteData(username, slug) {
  return getUsernameAccountListDetailRouteData(username, slug).then((routeData) => ({
    ...routeData,
    slug,
  }));
}

export default createAccountRoutePage(Client, loadRouteData, {
  resolveOptions: (_, params) => params?.slug,
});
