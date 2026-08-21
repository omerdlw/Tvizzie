import { getCurrentEditableAccountSnapshot } from '@/domains/account/server/page-data';

import AccountEditPage from '@/domains/account/ui/pages/account-edit';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialSnapshot = await getCurrentEditableAccountSnapshot();

  return <AccountEditPage initialSnapshot={initialSnapshot} />;
}
