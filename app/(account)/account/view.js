import AccountOverviewFeed from '@/features/account/feeds/overview';
import Registry from './registry';

export default function AccountView({ model, RegistryComponent = Registry }) {
  return <AccountOverviewFeed model={model} RegistryComponent={RegistryComponent} />;
}
