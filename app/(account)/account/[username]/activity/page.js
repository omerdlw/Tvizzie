export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/layouts/account-page-factory';
import { getUsernameAccountActivityRouteData } from '@/domains/account/server/routes.server';
import Client from '@/app/(account)/account/[username]/activity/client';

export default createAccountRoutePage(Client, getUsernameAccountActivityRouteData, (query) => ({
  page: Number.isFinite(Number(query?.page)) ? Math.max(1, Math.floor(Number(query.page))) : 1,
  scope: query?.scope === 'following' ? 'following' : 'user',
  sort: query?.asort === 'oldest' ? 'oldest' : 'newest',
  subject:
    query?.asub === 'list' || query?.asub === 'movie' || query?.asub === 'tv' ? query.asub : 'all',
}));
