import { Suspense } from 'react'

import ProfileLoading from './loading'
import ProfilePage from './client'

export default function Page() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfilePage />
    </Suspense>
  )
}
