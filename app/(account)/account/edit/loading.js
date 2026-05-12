'use client';

import { AccountSectionLoading } from '@/features/account/route/section-state';
import Registry from './registry';

export default function AccountEditLoading() {
  return <AccountSectionLoading Registry={Registry} registryProps={{ isLoading: true }} variant="edit" />;
}
