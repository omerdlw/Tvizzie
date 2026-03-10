import { Suspense } from 'react'

import ProfileLoading from '@/components/profile/profile-loading'
import ProfilePage from '@/components/profile/profile-page'

export default async function Page({ params }) {
    const { username, tab } = await params

    return (
        <Suspense fallback={<ProfileLoading />}>
            <ProfilePage username={username} activeTab={tab} />
        </Suspense>
    )
}
