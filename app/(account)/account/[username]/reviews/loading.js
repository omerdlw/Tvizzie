'use client';

import { AccountSectionLoading } from '@/features/account/route/loading-state';
import { Registry } from './view';

export default function Loading() {
  return <AccountSectionLoading Registry={Registry} variant="reviews" />;
}
