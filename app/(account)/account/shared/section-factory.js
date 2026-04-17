'use client';

import { useRegistry } from '@/core/modules/registry';
import { useAuth } from '@/core/modules/auth';
import { AccountPageShell } from '@/features/account/shared/layout';
import { buildAccountRegistryState } from './registry-state';
import {
  AccountSectionStateProvider,
  buildAccountPageShellProps,
  useAccountSectionEngine,
  useAccountSectionState,
} from './section-state';

const EMPTY_SECTION_CLIENT_STATE = Object.freeze({});

function useEmptySectionClientState() {
  return EMPTY_SECTION_CLIENT_STATE;
}

export function createAccountSectionRegistry({
  displayName = 'AccountSectionRegistry',
  navDescription = null,
  navRegistrySource,
  resolveOverrides = null,
}) {
  function AccountSectionRegistry(props) {
    const sectionState = useAccountSectionState();

    useRegistry(
      buildAccountRegistryState(sectionState, {
        isPageLoading: props.isPageLoading ?? sectionState.isPageLoading,
        navDescription:
          typeof navDescription === 'function'
            ? navDescription(sectionState, props)
            : (navDescription ?? sectionState.navDescription),
        navRegistrySource,
        ...(resolveOverrides ? resolveOverrides(sectionState, props) : {}),
      })
    );

    return null;
  }

  AccountSectionRegistry.displayName = displayName;
  return AccountSectionRegistry;
}

export function createAccountSectionView({
  activeSection,
  displayName = 'AccountSectionView',
  Registry,
  renderContent,
  resolveRegistryProps = null,
  skeletonVariant = 'overview',
}) {
  function AccountSectionView(props) {
    const sectionState = useAccountSectionState();
    const shellProps = buildAccountPageShellProps(sectionState, {
      activeSection,
      skeletonVariant,
    });
    const registryProps = resolveRegistryProps ? resolveRegistryProps(sectionState, props) : undefined;

    return (
      <AccountPageShell {...shellProps} registry={<Registry {...registryProps} />}>
        {renderContent(sectionState, props)}
      </AccountPageShell>
    );
  }

  AccountSectionView.displayName = displayName;
  return AccountSectionView;
}

export function createAccountSectionClient({
  activeTab,
  displayName = 'AccountSectionClient',
  View,
  useSectionClientState = null,
}) {
  function AccountSectionClient({ routeData = null }) {
    const auth = useAuth();
    const useResolvedSectionClientState = useSectionClientState ?? useEmptySectionClientState;
    const sectionEngine = useAccountSectionEngine({
      activeTab,
      auth,
      routeData,
    });
    const sectionClientState = useResolvedSectionClientState({
      auth,
      routeData: sectionEngine.routeData,
      sectionProviderValue: sectionEngine.sectionProviderValue,
      sectionState: sectionEngine.sectionState,
    });
    const { providerValue = sectionEngine.sectionProviderValue, ...viewProps } =
      sectionClientState || EMPTY_SECTION_CLIENT_STATE;

    return (
      <AccountSectionStateProvider value={providerValue}>
        <View {...viewProps} />
      </AccountSectionStateProvider>
    );
  }

  AccountSectionClient.displayName = displayName;
  return AccountSectionClient;
}
