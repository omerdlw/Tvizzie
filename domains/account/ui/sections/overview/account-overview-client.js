'use client';

import { FullscreenState } from '@/domains/shell/shared/components/feedback/fullscreen-state';
import {
  AccountSectionStateProvider,
  useAccountSectionState,
} from '@/domains/account/hooks/account-section-state';
import { useAccountOverviewState } from '@/domains/account/hooks/account-overview-state';
import AccountOverviewFeed from './overview-feed';

function MissingCurrentAccountState({ RegistryComponent = null }) {
  return (
    <>
      {RegistryComponent ? <RegistryComponent /> : null}
      <FullscreenState contentClassName="px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-black text-white uppercase">Session Ended</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Your account profile could not be initialized. Refresh the page and try again.
          </p>
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

export default function AccountOverviewClient({ RegistryComponent = null, routeData = null }) {
  const { isCurrentAccountMissing, overviewData, providerValue } =
    useAccountOverviewState(routeData);

  if (isCurrentAccountMissing) {
    return <MissingCurrentAccountState RegistryComponent={RegistryComponent} />;
  }

  return (
    <AccountSectionStateProvider value={providerValue}>
      <AccountOverviewContent overviewData={overviewData} RegistryComponent={RegistryComponent} />
    </AccountSectionStateProvider>
  );
}
