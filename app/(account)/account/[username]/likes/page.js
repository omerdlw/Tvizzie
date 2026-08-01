import { createAccountRoutePage } from '@/domains/account/ui/route/page-factory';
import { getUsernameAccountLikesRouteData } from '@/domains/account/server/account-route-data.server';
import Client from '@/domains/account/screens/account-likes-client';

export default createAccountRoutePage(Client, getUsernameAccountLikesRouteData, (query) => ({
  segment:
    query?.segment === 'reviews' ? 'reviews' : query?.segment === 'lists' ? 'lists' : 'titles',
}));
