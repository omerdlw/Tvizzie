'use client';

import { AccountPathLoading } from '@/features/account/route/loading-state';
import Registry from './registry';

export default function Loading() {
  return <AccountPathLoading Registry={Registry} />;
}
