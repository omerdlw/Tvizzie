import { createAccountRoutePage } from '@/domains/account/ui/route/page-factory';
import { getUsernameAccountReviewsRouteData } from '@/domains/account/server/account-route-data.server';
import Client from '@/domains/account/screens/account-reviews-client';

export default createAccountRoutePage(Client, getUsernameAccountReviewsRouteData);
