import { createAccountRoutePage } from '@/features/account/route/route-page';
import { getCurrentAccountOverviewRouteData } from '@/core/services/account/account-route-data.server';
import Client from './client';

export default createAccountRoutePage(Client, getCurrentAccountOverviewRouteData);
