import { Suspense } from 'react'

import ProfilePage from '../client'
import ProfileLoading from '../loading'

export default async function Page({ params }) {
  const { username } = await params

  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfilePage username={username} />
    </Suspense>
  )
}
