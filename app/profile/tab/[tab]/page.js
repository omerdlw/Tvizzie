import { Suspense } from 'react'

import ProfileLoading from '@/components/profile/profile-loading'
import ProfilePage from '@/components/profile/profile-page'

export default async function Page({ params }) {
    const { tab } = await params

    return (
        <Suspense fallback={<ProfileLoading />}>
            <ProfilePage activeTab={tab} />
        </Suspense>
    )
}
