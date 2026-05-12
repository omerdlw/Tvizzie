'use client';

import { AccountSectionLoading } from '@/features/account/route/section-state';
import { Registry } from './view';

export default function AccountLoading() {
  return <AccountSectionLoading Registry={Registry} variant="activity" />;
}
