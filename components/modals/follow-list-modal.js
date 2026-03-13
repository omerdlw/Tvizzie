'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

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
    <Container header={{ ...header }} className="w-md" close={close}>
      <div className="scrollbar-hide flex max-h-[60vh] w-full flex-col gap-4 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse border-b border-white/10 last:border-none"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon
              icon="solar:users-group-two-rounded-bold"
              className="mb-4 text-white/50"
              size={48}
            />
            <p className="text-sm text-white/40">No users found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username || user.id}`}
                onClick={close}
                className="group flex items-center gap-4 border-b border-white/10 p-4 transition-all last:border-none hover:bg-white/5"
              >
                <div className="size-10 shrink-0 overflow-hidden rounded-xl border border-white/10">
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
                  className="text-white/20"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
