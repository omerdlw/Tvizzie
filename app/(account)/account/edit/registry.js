'use client';

import { buildAccountEditState } from '@/features/account/registry-config';
import { createRouteRegistry } from '@/features/app-shell/route-registry-factory';

const ACCOUNT_EDIT_REGISTRY_SOURCE = 'account-edit';

export default createRouteRegistry({
  displayName: 'AccountEditRegistry',
  resolveConfig: (props) =>
    buildAccountEditState({
      navRegistrySource: ACCOUNT_EDIT_REGISTRY_SOURCE,
      ...props,
    }),
});
