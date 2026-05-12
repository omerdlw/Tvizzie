'use client';

import { AccountSectionLoading } from '@/features/account/route/section-state';
import Registry from './registry';

export default function AccountLoading() {
  return <AccountSectionLoading Registry={Registry} variant="overview" />;
}
