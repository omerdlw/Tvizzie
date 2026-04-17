import { createAccountRoutePage } from '../../shared/route-page';
import { getUsernameAccountLikesRouteData } from '@/core/services/account/account-route-data.server';
import Client from './client';

export default createAccountRoutePage(Client, getUsernameAccountLikesRouteData, (query) => ({
  segment: query?.segment === 'reviews' ? 'reviews' : query?.segment === 'lists' ? 'lists' : 'films',
}));
