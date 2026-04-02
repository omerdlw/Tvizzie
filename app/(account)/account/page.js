import Client from './client'
import { getCurrentAccountOverviewRouteData } from '@/services/account/account-route-data.server'

export default async function Page() {
  const routeData = await getCurrentAccountOverviewRouteData()

  return <Client {...routeData} />
}
