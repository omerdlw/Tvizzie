import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountActivityRouteData } from '@/domains/account/server/routes/read.server';
import Client from '@/domains/account/ui/activity-client';

export default createAccountRoutePage(Client, getUsernameAccountActivityRouteData, (query) => ({
  page: Number.isFinite(Number(query?.page)) ? Math.max(1, Math.floor(Number(query.page))) : 1,
  scope: query?.scope === 'following' ? 'following' : 'user',
  sort: query?.asort === 'oldest' ? 'oldest' : 'newest',
  subject:
    query?.asub === 'list' || query?.asub === 'movie' || query?.asub === 'tv' ? query.asub : 'all',
}));
