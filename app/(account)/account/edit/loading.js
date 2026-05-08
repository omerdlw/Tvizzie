'use client';

import { AccountSectionLoading } from '@/features/account/route/loading-state';
import Registry from './registry';

export default function AccountEditLoading() {
  return <AccountSectionLoading Registry={Registry} registryProps={{ isLoading: true }} variant="edit" />;
}
