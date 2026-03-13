'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import { EmptyState } from '@/components/shared/empty-state'
import Container from '@/modules/modal/container'
import {
  subscribeToFollowers,
  subscribeToFollowing,
} from '@/services/follows.service'
import { getUserProfile } from '@/services/profile.service'
import Icon from '@/ui/icon'

export default function FollowListModal({ close, data, header }) {
  const { userId, type } = data || {}
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return undefined

    const subscribe =
      type === 'followers' ? subscribeToFollowers : subscribeToFollowing

    const unsubscribe = subscribe(userId, async (list) => {
      setLoading(true)
      const profiles = await Promise.all(
        list.map(async (item) => {
          const profile = await getUserProfile(item.id)
          return profile
        })
      )
      setUsers(profiles.filter(Boolean))
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userId, type])

  const getAvatarUrl = (profile) => {
    const seed = profile?.username || profile?.id || 'tvizzie'
    return (
      profile?.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
    )
  }

  return (
    <Container header={{ ...header }} className="w-full sm:w-[460px]" close={close}>
      <div className="scrollbar-hide flex max-h-[60vh] w-full flex-col gap-2 overflow-y-auto p-2.5">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-[20px] border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon="solar:users-group-two-rounded-bold"
            title="No users found"
            description="This list is currently empty."
            className="py-10"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username || user.id}`}
                onClick={close}
                className="group flex items-center gap-4 rounded-[20px] border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10"
              >
                <div className="size-10 shrink-0 overflow-hidden rounded-[14px] border border-white/10">
                  <img
                    src={getAvatarUrl(user)}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold text-white transition-colors">
                    {user.displayName}
                  </h4>
                  <p className="truncate text-[10px] font-bold tracking-widest text-white/30 uppercase">
                    @{user.username || 'user'}
                  </p>
                </div>
                <Icon
                  icon="solar:alt-arrow-right-linear"
                  size={16}
                  className="text-white/30"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
