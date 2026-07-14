import { getCurrentEditableAccountSnapshot } from '@/core/services/account/account-route-data.server';

import Client from './client';

export default async function Page() {
  const initialSnapshot = await getCurrentEditableAccountSnapshot();

  return <Client initialSnapshot={initialSnapshot} />;
}
