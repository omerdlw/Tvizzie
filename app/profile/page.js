import { Suspense } from 'react'

import ProfilePage from './client'
import ProfileLoading from './loading'

export default function Page() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfilePage />
    </Suspense>
  )
}
