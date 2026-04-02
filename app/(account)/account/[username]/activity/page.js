import Client from './client'
import { getUsernameAccountActivityRouteData } from '@/services/account/account-route-data.server'

export default async function Page({ params, searchParams }) {
  const { username } = await params
  const scope =
    (await searchParams)?.scope === 'following' ? 'following' : 'user'
  const routeData = await getUsernameAccountActivityRouteData(username, {
    scope,
  })

  return <Client {...routeData} />
}
