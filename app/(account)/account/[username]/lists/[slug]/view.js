import AccountListDetailFeed from '@/features/account/feeds/list-detail';
import Registry from './registry';

export default function ListView(props) {
  return <AccountListDetailFeed {...props} RegistryComponent={Registry} />;
}
