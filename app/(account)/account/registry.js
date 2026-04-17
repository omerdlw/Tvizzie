'use client';

import { createAccountSectionRegistry } from './shared/section-factory';

export default createAccountSectionRegistry({
  displayName: 'AccountOverviewRegistry',
  navDescription: (sectionState) => sectionState.navDescription,
  navRegistrySource: 'account-overview',
});
