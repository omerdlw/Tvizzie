'use client';

import { createAccountSectionRegistry } from '@/domains/account/ui/account-section-factory';

export default createAccountSectionRegistry({
  displayName: 'AccountOverviewRegistry',
  navDescription: (sectionState) => sectionState.navDescription,
  navRegistrySource: 'account-overview',
});
