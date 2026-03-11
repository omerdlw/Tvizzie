'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { subscribeToFollowers, subscribeToFollowing } from '@/services/follows.service'
import { getUserProfile } from '@/services/profile.service'
import Icon from '@/ui/icon'
import Container from '@/modules/modal/container'

export default function FollowListModal({ close, data, header }) {
    const { userId, type, title } = data || {}
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) return undefined

        const subscribe = type === 'followers'
            ? subscribeToFollowers
            : subscribeToFollowing

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
        <Container header={{ ...header, title: title || header.title, label: 'Social' }} close={close}>
            <div className="flex w-full flex-col gap-4 max-h-[60vh] overflow-y-auto scrollbar-hide p-2.5">
                {loading ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Icon icon="solar:users-group-two-rounded-bold" size={48} className="text-white/10 mb-4" />
                        <p className="text-sm text-white/40">No users found</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {users.map((user) => (
                            <Link
                                key={user.id}
                                href={`/profile/${user.username || user.id}`}
                                onClick={close}
                                className="group flex items-center gap-4 rounded-[20px] border border-white/5 bg-white/2 p-3 transition-all hover:bg-white/10 hover:border-white/10"
                            >
                                <div className="size-10 shrink-0 overflow-hidden rounded-xl border border-white/10">
                                    <img
                                        src={getAvatarUrl(user)}
                                        alt={user.displayName}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="truncate text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {user.displayName}
                                    </h4>
                                    <p className="truncate text-[10px] font-bold tracking-widest text-white/30 uppercase">
                                        @{user.username || 'user'}
                                    </p>
                                </div>
                                <Icon icon="solar:alt-arrow-right-linear" size={16} className="text-white/20" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </Container>
    )
}
