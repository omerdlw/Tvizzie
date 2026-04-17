'use client';

import { createAccountSectionRegistry } from '../shared/section-factory';

export default createAccountSectionRegistry({
  displayName: 'AccountProfileOverviewRegistry',
  navDescription: (sectionState) => sectionState.navDescription,
  navRegistrySource: 'account-profile-overview',
});
