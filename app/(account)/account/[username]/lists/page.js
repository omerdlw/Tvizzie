import Client from './client'
import { getUsernameAccountListsRouteData } from '@/services/account/account-route-data.server'

export default async function Page({ params }) {
  const { username } = await params
  const routeData = await getUsernameAccountListsRouteData(username)

  return <Client {...routeData} />
}
