import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountListDetailRouteData } from '@/domains/account/server/routes/read.server';

import Client from '@/domains/account/ui/list-detail-client';

function loadRouteData(username, slug) {
  return getUsernameAccountListDetailRouteData(username, slug).then((routeData) => ({
    ...routeData,
    slug,
  }));
}

export default createAccountRoutePage(Client, loadRouteData, {
  resolveOptions: (_, params) => params?.slug,
});
