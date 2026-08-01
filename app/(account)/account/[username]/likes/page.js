import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountLikesRouteData } from '@/domains/account/server/routes/route-read.server';
import Client from '@/domains/account/ui/likes-client';

export default createAccountRoutePage(Client, getUsernameAccountLikesRouteData, (query) => ({
  segment:
    query?.segment === 'reviews' ? 'reviews' : query?.segment === 'lists' ? 'lists' : 'titles',
}));
