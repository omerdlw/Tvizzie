import AccountListDetailFeed from '@/features/account/feeds/list-detail';
import Registry from './registry';

export default function ListView({ model = null }) {
  return <AccountListDetailFeed model={model} RegistryComponent={Registry} />;
}
