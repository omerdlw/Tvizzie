export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountLikesRouteData } from '@/domains/account/server/routes/route-read';
import Client from '@/app/(account)/account/[username]/likes/client';

export default createAccountRoutePage(Client, getUsernameAccountLikesRouteData, (query) => ({
  segment:
    query?.segment === 'reviews' ? 'reviews' : query?.segment === 'lists' ? 'lists' : 'titles',
}));
