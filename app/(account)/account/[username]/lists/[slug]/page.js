export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountListDetailRouteData } from '@/domains/account/server/routes/route-read';

import Client from '@/app/(account)/account/[username]/lists/[slug]/client';

function loadRouteData(username, slug) {
  return getUsernameAccountListDetailRouteData(username, slug).then((routeData) => ({
    ...routeData,
    slug,
  }));
}

export default createAccountRoutePage(Client, loadRouteData, {
  resolveOptions: (_, params) => params?.slug,
});
