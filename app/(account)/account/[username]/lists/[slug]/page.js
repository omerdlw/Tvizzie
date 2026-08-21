export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountListDetailRouteData } from '@/domains/account/server/page-data';

import AccountListDetailView from '@/domains/account/ui/pages/account-list-detail';

function loadRouteData(username, slug) {
  return getUsernameAccountListDetailRouteData(username, slug).then((routeData) => ({
    ...routeData,
    slug,
  }));
}

export default createAccountRoutePage(AccountListDetailView, loadRouteData, {
  resolveOptions: (_, params) => params?.slug,
});
