import { Suspense } from 'react'

import ProfileLoading from '@/components/profile/profile-loading'
import ProfilePage from '@/components/profile/profile-page'

export default function Page() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfilePage />
    </Suspense>
  )
}
