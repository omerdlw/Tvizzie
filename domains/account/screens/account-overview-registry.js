'use client';

import { createAccountSectionRegistry } from '@/domains/account/ui/route/section-factory';

export default createAccountSectionRegistry({
  displayName: 'AccountOverviewRegistry',
  navDescription: (sectionState) => sectionState.navDescription,
  navRegistrySource: 'account-overview',
});
