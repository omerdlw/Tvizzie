import AccountOverviewFeed from '@/domains/account/ui/feeds/overview';
import { useAccountSectionState } from '@/domains/account/ui/route/section-state';
import Registry from '@/domains/account/screens/account-overview-registry';

export default function AccountView({ overviewData = null, RegistryComponent = Registry }) {
  const sectionState = useAccountSectionState();
  const model = {
    ...sectionState,
    ...(overviewData ?? {}),
    profileHandle:
      sectionState.profileHandle ?? sectionState.profile?.username ?? sectionState.username ?? null,
  };

  return <AccountOverviewFeed model={model} RegistryComponent={RegistryComponent} />;
}
