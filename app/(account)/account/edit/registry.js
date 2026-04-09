'use client';

import { buildAccountEditState } from '@/features/account/registry-config';
import { useRegistry } from '@/core/modules/registry';

const ACCOUNT_EDIT_REGISTRY_SOURCE = 'account-edit';

export default function Registry(props) {
  useRegistry(
    buildAccountEditState({
      navRegistrySource: ACCOUNT_EDIT_REGISTRY_SOURCE,
      ...props,
    })
  );

  return null;
}
