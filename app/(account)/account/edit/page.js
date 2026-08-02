import { getCurrentEditableAccountSnapshot } from '@/domains/account/server/routes/route-read.server';

import Client from '@/app/(account)/account/edit/client';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialSnapshot = await getCurrentEditableAccountSnapshot();

  return <Client initialSnapshot={initialSnapshot} />;
}
