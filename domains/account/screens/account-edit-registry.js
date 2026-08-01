'use client';

import { buildAccountEditState } from '@/domains/account/ui/registry-config';
import { createRouteRegistry } from '@/shared/lib/route-registry';

const ACCOUNT_EDIT_REGISTRY_SOURCE = 'account-edit';

export default createRouteRegistry({
  displayName: 'AccountEditRegistry',
  resolveConfig: (props) =>
    buildAccountEditState({
      navRegistrySource: ACCOUNT_EDIT_REGISTRY_SOURCE,
      ...props,
    }),
});
