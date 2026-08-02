export const dynamic = 'force-dynamic';

import { createAccountRoutePage } from '@/domains/account/ui/account-page-factory';
import { getUsernameAccountReviewsRouteData } from '@/domains/account/server/routes/route-read.server';
import Client from '@/app/(account)/account/[username]/reviews/client';

export default createAccountRoutePage(Client, getUsernameAccountReviewsRouteData);
