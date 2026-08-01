import { getCurrentEditableAccountSnapshot } from '@/domains/account/server/account-route-data.server';

import Client from '@/domains/account/screens/account-edit-client';

export default async function Page() {
  const initialSnapshot = await getCurrentEditableAccountSnapshot();

  return <Client initialSnapshot={initialSnapshot} />;
}
