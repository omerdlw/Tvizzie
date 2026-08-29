import { InteractiveFeatureBoundary } from '@/app/_shell/interactive-boundary';
import { AccountNavTransitionProvider } from '@/domains/account/ui/layouts/account-layout';

export default function AccountLayout({ children }) {
  return (
    <AccountNavTransitionProvider>
      <InteractiveFeatureBoundary>{children}</InteractiveFeatureBoundary>
    </AccountNavTransitionProvider>
  );
}
