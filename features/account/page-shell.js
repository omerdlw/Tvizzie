'use client'

import NotFoundTemplate from '../shared/not-found-template'
import AccountProfileLayout from './profile/profile-layout'
import { ACCOUNT_SECTION_SHELL_CLASS } from './utils'
import AccountRouteSkeleton from '@/ui/skeletons/views/account'

const DEFAULT_NOT_FOUND_DESCRIPTION =
  "We couldn't load this account. It may have been removed, or the link may be invalid."

export function AccountNotFoundState({
  description = DEFAULT_NOT_FOUND_DESCRIPTION,
}) {
  return <NotFoundTemplate description={description} />
}

function AccountPageLoadingContent() {
  return (
    <section className="relative  text-white">
      <div className={`${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col gap-5`}>
        <div className="h-6 w-40 animate-pulse rounded-full /6" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="aspect-[3/4] animate-pulse" />
          <div className="aspect-[3/4] animate-pulse" />
          <div className="aspect-[3/4] animate-pulse" />
        </div>
      </div>
    </section>
  )
}

export default function AccountPageShell({
  activeSection = 'overview',
  children,
  followerCount = 0,
  followingCount = 0,
  isLoading = false,
  likesCount = 0,
  listsCount = 0,
  onOpenFollowList = null,
  onReadMore,
  profile = null,
  registry = null,
  resolvedUserId = null,
  skeletonVariant = 'overview',
  username = null,
  watchedCount = 0,
  watchlistCount = 0,
  loadingContent = null,
}) {
  if (isLoading && (!profile || !resolvedUserId)) {
    return (
      <>
        {registry}
        <AccountRouteSkeleton variant={skeletonVariant} />
      </>
    )
  }

  if (!resolvedUserId || !profile) {
    return (
      <>
        {registry}
        <AccountNotFoundState />
      </>
    )
  }

  return (
    <>
      {registry}
      <AccountProfileLayout
        activeSection={activeSection}
        profile={profile}
        likesCount={likesCount}
        followerCount={followerCount}
        followingCount={followingCount}
        listsCount={listsCount}
        onOpenFollowList={onOpenFollowList}
        username={username}
        watchedCount={watchedCount}
        watchlistCount={watchlistCount}
        onReadMore={onReadMore}
      >
        {isLoading ? loadingContent || <AccountPageLoadingContent /> : children}
      </AccountProfileLayout>
    </>
  )
}
