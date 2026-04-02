import { getUsernameAccountListDetailRouteData } from '@/services/account/account-route-data.server'

import Client from './client'

export default async function Page({ params }) {
  const { slug, username } = await params
  const routeData = await getUsernameAccountListDetailRouteData(username, slug)

  return <Client slug={slug} {...routeData} />
}
