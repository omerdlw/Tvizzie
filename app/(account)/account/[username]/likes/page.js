export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/pages/account-route-page';
import { getUsernameAccountLikesRouteData } from '@/domains/account/server/routes.server';
import Client from '@/app/(account)/account/[username]/likes/client';

export default createAccountRoutePage(Client, getUsernameAccountLikesRouteData, (query) => ({
  segment:
    query?.segment === 'reviews' ? 'reviews' : query?.segment === 'lists' ? 'lists' : 'titles',
}));
