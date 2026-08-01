import { getCurrentEditableAccountSnapshot } from '@/domains/account/server/routes/route-read.server';

import Client from '@/domains/account/ui/edit-client';

export default async function Page() {
  const initialSnapshot = await getCurrentEditableAccountSnapshot();

  return <Client initialSnapshot={initialSnapshot} />;
}
