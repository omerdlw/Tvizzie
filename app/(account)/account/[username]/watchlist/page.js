import { createAccountRoutePage } from '@/features/account/route/page-factory';
import { getUsernameAccountWatchlistRouteData } from '@/core/services/account/account-route-data.server';
import Client from './client';

export default createAccountRoutePage(Client, getUsernameAccountWatchlistRouteData);
