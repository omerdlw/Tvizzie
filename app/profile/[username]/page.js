import { Suspense } from 'react'

import ProfileLoading from '../loading'
import ProfilePage from '../client'

export default async function Page({ params }) {
  const { username } = await params

  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfilePage username={username} />
    </Suspense>
  )
}
