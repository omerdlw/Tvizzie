'use client';

import { composeProviders } from '@/app/_shell/compose-providers';
import { ACCOUNT_PROVIDER_CONFIG } from '@/domains/account/client';
import GlobalContextMenuRegistry from '@/app/_shell/global-context-menu-registry';
import AccountNavRegistry from '@/app/_shell/navigation/account-nav-registry';

import { AccountProvider } from '@/modules/account';
import { ContextMenuGlobal, ContextMenuProvider } from '@/modules/context-menu';
import { NotificationBadgeListener } from '@/modules/notification';

const InteractiveProviders = composeProviders(
  [AccountProvider, { config: ACCOUNT_PROVIDER_CONFIG }],
  [ContextMenuProvider],
);

function SharedInteractiveFrame({ children }) {
  return <>{children}</>;
}

export function AuthInteractiveBoundary({ children }) {
  return <SharedInteractiveFrame>{children}</SharedInteractiveFrame>;
}

export function InteractiveFeatureBoundary({ children }) {
  return (
    <InteractiveProviders>
      <SharedInteractiveFrame>
        <AccountNavRegistry />
        <GlobalContextMenuRegistry />
        <NotificationBadgeListener />
        <ContextMenuGlobal />
        {children}
      </SharedInteractiveFrame>
    </InteractiveProviders>
  );
}
