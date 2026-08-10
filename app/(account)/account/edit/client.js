'use client';

import { useAccountEditPageState } from '@/domains/account/hooks';
import { AccountEditView } from '@/domains/account/ui/sections/edit/account-edit-view';

export default function Client({ initialSnapshot = null }) {
  const pageState = useAccountEditPageState({ initialSnapshot });

  return <AccountEditView {...pageState} />;
}
