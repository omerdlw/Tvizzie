import { createAccountRoutePage } from '@/domains/account/ui/route/page-factory';
import { getUsernameAccountListDetailRouteData } from '@/domains/account/server/account-route-data.server';

import Client from '@/domains/account/screens/account-list-detail-client';

function loadRouteData(username, slug) {
  return getUsernameAccountListDetailRouteData(username, slug).then((routeData) => ({
    ...routeData,
    slug,
  }));
}

export default createAccountRoutePage(Client, loadRouteData, {
  resolveOptions: (_, params) => params?.slug,
});
