'use client'

import AccountHero from './hero'
import AccountSectionNav from '../section-nav'

export default function AccountProfileLayout({
  activeSection = 'overview',
  children,
  followerCount = 0,
  followingCount = 0,
  likesCount = 0,
  listsCount = 0,
  onOpenFollowList = null,
  onReadMore,
  profile = null,
  username = null,
  watchedCount = null,
  watchlistCount = 0,
}) {
  const profileHandle = username || profile?.username || null

  return (
    <div>
      <div className="relative">
        <AccountHero
          profile={profile}
          likesCount={likesCount}
          followerCount={followerCount}
          followingCount={followingCount}
          listsCount={listsCount}
          onOpenFollowList={onOpenFollowList}
          watchedCount={watchedCount}
          watchlistCount={watchlistCount}
          onReadMore={onReadMore}
        />
        <AccountSectionNav
          activeKey={activeSection}
          username={profileHandle}
          className="absolute inset-x-0 top-0 z-20"
        />
      </div>
      <main>{children}</main>
    </div>
  )
}
