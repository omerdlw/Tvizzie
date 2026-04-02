import { getCurrentEditableAccountSnapshot } from '@/services/account/current-account-snapshot.server'

import Client from './client'

export default async function Page() {
  const initialSnapshot = await getCurrentEditableAccountSnapshot()

  return <Client initialSnapshot={initialSnapshot} />
}
