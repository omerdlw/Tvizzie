import { createAccountRoutePage } from '../../shared/route-page';
import { getUsernameAccountReviewsRouteData } from '@/core/services/account/account-route-data.server';
import Client from './client';

export default createAccountRoutePage(Client, getUsernameAccountReviewsRouteData);
