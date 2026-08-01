import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountReviewsRouteData } from '@/domains/account/server/routes/read.server';
import Client from '@/domains/account/ui/reviews-client';

export default createAccountRoutePage(Client, getUsernameAccountReviewsRouteData);
