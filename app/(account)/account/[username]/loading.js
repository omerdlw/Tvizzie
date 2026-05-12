'use client';

import { AccountPathLoading } from '@/features/account/route/section-state';
import Registry from './registry';

export default function Loading() {
  return <AccountPathLoading Registry={Registry} />;
}
