'use client';

import { AccountSectionLoading } from '@/features/account/route/section-state';
import { Registry } from './view';

export default function Loading() {
  return <AccountSectionLoading Registry={Registry} variant="list-detail" />;
}
