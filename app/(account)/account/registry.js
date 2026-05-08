'use client';

import { createAccountSectionRegistry } from '@/features/account/route/section-factory';

export default createAccountSectionRegistry({
  displayName: 'AccountOverviewRegistry',
  navDescription: (sectionState) => sectionState.navDescription,
  navRegistrySource: 'account-overview',
});
