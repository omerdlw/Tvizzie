'use client';

import { FullscreenState } from '@/ui/feedback/fullscreen-state';
import {
  AccountSectionStateProvider,
  useAccountSectionState,
} from '@/domains/account/hooks/account-section-state';
import { useAccountOverviewState } from '@/domains/account/hooks/account-overview-state';
import { AccountOverviewRegistry } from '@/domains/account/ui/registry';
import AccountOverviewFeed from '@/domains/account/ui/sections/overview/overview-feed';

function MissingCurrentAccountState({ RegistryComponent = null }) {
  return (
    <>
      {RegistryComponent ? <RegistryComponent /> : null}
      <FullscreenState contentClassName="">
        <div>
          <h1>Session Ended</h1>
          <p>Your account profile could not be initialized. Refresh the page and try again</p>
        </div>
      </FullscreenState>
    </>
  );
}

function AccountOverviewContent({ overviewData, RegistryComponent }) {
  const sectionState = useAccountSectionState();
  const model = {
    ...sectionState,
    ...overviewData,
    profileHandle:
      sectionState.profileHandle ?? sectionState.profile?.username ?? sectionState.username ?? null,
  };

  return <AccountOverviewFeed overviewData={model} RegistryComponent={RegistryComponent} />;
}

export default function AccountOverviewView({
  RegistryComponent = AccountOverviewRegistry,
  routeData = null,
}) {
  const { isAuthPending, isCurrentAccountMissing, overviewData, providerValue } =
    useAccountOverviewState(routeData);

  if (isAuthPending) return null;

  if (isCurrentAccountMissing) {
    return <MissingCurrentAccountState RegistryComponent={RegistryComponent} />;
  }

  return (
    <AccountSectionStateProvider value={providerValue}>
      <AccountOverviewContent overviewData={overviewData} RegistryComponent={RegistryComponent} />
    </AccountSectionStateProvider>
  );
}
