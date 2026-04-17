import { createAccountRoutePage } from '../../shared/route-page';
import { getUsernameAccountActivityRouteData } from '@/core/services/account/account-route-data.server';
import Client from './client';

export default createAccountRoutePage(Client, getUsernameAccountActivityRouteData, (query) => ({
  page: Number.isFinite(Number(query?.page))
    ? Math.max(1, Math.floor(Number(query.page)))
    : 1,
  scope: query?.scope === 'following' ? 'following' : 'user',
  sort: query?.asort === 'oldest' ? 'oldest' : 'newest',
  subject: query?.asub === 'list' || query?.asub === 'movie' ? query.asub : 'all',
}));
