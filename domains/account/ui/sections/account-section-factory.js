'use client';

import { useState } from 'react';

import { useRegistry } from '@/modules/registry';
import { useAuth } from '@/modules/auth';
import SearchAction from '@/domains/shell/navigation/action/search-action';
import { useAccountProfileShell } from '@/domains/account/ui/layouts/account-profile-context';
import {
  AccountSectionStateProvider,
  useAccountSectionEngine,
  useAccountSectionState,
} from '../../hooks/account-section-state';

const EMPTY_SECTION_CLIENT_STATE = Object.freeze({});

function useEmptySectionClientState() {
  return EMPTY_SECTION_CLIENT_STATE;
}

export function createAccountSectionRegistry({
  displayName = 'AccountSectionRegistry',
  navDescription = null,
  navRegistrySource,
  resolveOverrides = null,
  buildState = null,
}) {
  function AccountSectionRegistry(props) {
    const sectionState = useAccountSectionState();
    const profileShell = useAccountProfileShell();
    const [isSearching, setIsSearching] = useState(false);
    const stableSectionState = profileShell
      ? {
          ...sectionState,
          profile: sectionState.profile || profileShell.profile,
          username: sectionState.username || profileShell.username,
        }
      : sectionState;
    const resolvedOverrides = resolveOverrides ? resolveOverrides(stableSectionState, props) : null;

    useRegistry(
      typeof buildState === 'function'
        ? buildState(stableSectionState, {
            isPageLoading: props.isPageLoading ?? stableSectionState.isPageLoading,
            navDescription:
              typeof navDescription === 'function'
                ? navDescription(stableSectionState, props)
                : (navDescription ?? stableSectionState.navDescription),
            navRegistrySource,
            ...(resolvedOverrides || {}),
            extraNavActions: [
              ...(Array.isArray(resolvedOverrides?.extraNavActions)
                ? resolvedOverrides.extraNavActions
                : []),
              {
                key: 'search-overlay',
                tooltip: 'Search',
                icon: isSearching ? 'material-symbols:close-rounded' : 'solar:magnifer-linear',
                order: 30,
                onClick: (event) => {
                  event.stopPropagation();
                  setIsSearching((value) => !value);
                },
              },
            ],
            navActionOverride: isSearching ? (
              <SearchAction />
            ) : (
              (resolvedOverrides?.navActionOverride ?? null)
            ),
            showToolbarFollowActionWithOverride: isSearching
              ? false
              : resolvedOverrides?.showToolbarFollowActionWithOverride,
          })
        : null
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
    const registryProps = resolveRegistryProps
      ? resolveRegistryProps(sectionState, props)
      : undefined;

    return (
      <>
        <Registry {...registryProps} />
        {renderContent(sectionState, props)}
      </>
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
