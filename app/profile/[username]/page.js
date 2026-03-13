import { Suspense } from 'react'

import ProfileLoading from '../loading'
import ProfileUsernamePageClient from './client'

export default async function Page({ params }) {
  const { username } = await params

  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileUsernamePageClient username={username} />
    </Suspense>
  )
}
