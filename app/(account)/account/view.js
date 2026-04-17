import AccountOverviewFeed from '@/features/account/feeds/overview';
import { useAccountSectionState } from './shared/section-state';
import Registry from './registry';

export default function AccountView({ overviewData = null, RegistryComponent = Registry }) {
  const sectionState = useAccountSectionState();
  const model = {
    ...sectionState,
    ...(overviewData ?? {}),
    profileHandle: sectionState.profileHandle ?? sectionState.profile?.username ?? sectionState.username ?? null,
  };

  return <AccountOverviewFeed model={model} RegistryComponent={RegistryComponent} />;
}
