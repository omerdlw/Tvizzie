import { useEffect, useState } from 'react'
import Link from 'next/link'
import { subscribeToFollowers, subscribeToFollowing, subscribeToFollowStatus, followUser, unfollowUser } from '@/services/follows.service'
import { useAuth } from '@/modules/auth'
import { useToast } from '@/modules/notification/hooks'
import { useModal } from '@/modules/modal/context'
import Icon from '@/ui/icon'
import { cn } from '@/lib/utils/index'

function ActionButton({ children, onClick, href, variant = 'ghost', className: extra, disabled }) {
    const base = cn(
        'flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[10px] font-bold tracking-[0.15em] uppercase transition-all duration-300 active:scale-95 disabled:opacity-40 cursor-pointer',
        variant === 'solid'
            ? 'bg-white text-black hover:bg-white/90'
            : 'border border-white/10 bg-white/5 text-white/50 backdrop-blur-sm hover:bg-white/10 hover:text-white',
        extra
    )

    if (href) {
        return (
            <Link href={href} className={base}>
                {children}
            </Link>
        )
    }

    return (
        <button type="button" onClick={onClick} disabled={disabled} className={base}>
            {children}
        </button>
    )
}

export function ProfileHero({
    isOwner = false,
    ownerLink,
    profile,
    publicLink,
    onEditToggle,
    onCreateList,
    activeTab,
}) {
    const auth = useAuth()
    const toast = useToast()
    const { openModal } = useModal()
    const [isFollowing, setIsFollowing] = useState(false)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!profile?.id) return undefined

        const unsubFollowers = subscribeToFollowers(profile.id, (followers) => {
            setFollowerCount(followers.length)
        })

        const unsubFollowing = subscribeToFollowing(profile.id, (following) => {
            setFollowingCount(following.length)
        })

        let unsubStatus = () => { }
        if (!isOwner && auth.user?.id) {
            unsubStatus = subscribeToFollowStatus(auth.user.id, profile.id, setIsFollowing)
        }

        return () => {
            unsubFollowers()
            unsubFollowing()
            unsubStatus()
        }
    }, [profile?.id, auth.user?.id, isOwner])

    const handleFollow = async () => {
        if (!auth.isAuthenticated) {
            toast.error('Please sign in to follow users.')
            return
        }
        setIsLoading(true)
        try {
            if (isFollowing) {
                await unfollowUser(auth.user.id, profile.id)
            } else {
                await followUser(auth.user.id, profile.id)
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const openFollowList = (type) => {
        openModal('FOLLOW_LIST_MODAL', 'center', {
            data: {
                userId: profile.id,
                type,
                title: type === 'followers' ? 'Followers' : 'Following'
            }
        })
    }

    const getAvatarUrl = (p) => {
        const seed = p?.username || p?.id || 'tvizzie'
        return (
            p?.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
        )
    }

    return (
        <div className="relative mt-8 sm:mt-12">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end sm:gap-7">
                <div className="group/avatar relative shrink-0">
                    <div className="absolute -inset-2 rounded-[32px] bg-white/5 opacity-0 blur-2xl transition-all duration-700 group-hover/avatar:opacity-100" />
                    <div className="relative size-24 overflow-hidden rounded-[22px] ring-1 ring-white/15 transition-all duration-500 sm:size-28">
                        <img
                            src={getAvatarUrl(profile)}
                            alt={profile?.displayName || 'Avatar'}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover/avatar:scale-110"
                        />
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
                    <div className="flex flex-col items-center gap-1 sm:items-start">
                        <h1 className="font-zuume text-3xl font-bold tracking-normal uppercase text-white sm:text-4xl md:text-5xl">
                            {profile?.displayName || 'Profile'}
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            type="button"
                            onClick={() => openFollowList('followers')}
                            className="group/stat flex items-center gap-1.5 text-sm transition-colors cursor-pointer"
                        >
                            <span className="font-bold text-white">{followerCount}</span>
                            <span className="text-[10px] font-semibold tracking-[0.12em] text-white/30 uppercase group-hover/stat:text-white/50 transition-colors">
                                Followers
                            </span>
                        </button>
                        <span className="text-white/10">·</span>
                        <button
                            type="button"
                            onClick={() => openFollowList('following')}
                            className="group/stat flex items-center gap-1.5 text-sm transition-colors cursor-pointer"
                        >
                            <span className="font-bold text-white">{followingCount}</span>
                            <span className="text-[10px] font-semibold tracking-[0.12em] text-white/30 uppercase group-hover/stat:text-white/50 transition-colors">
                                Following
                            </span>
                        </button>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {isOwner ? (
                        <>
                            {publicLink && (
                                <ActionButton href={publicLink}>
                                    <Icon icon="solar:eye-bold" size={13} />
                                    Public
                                </ActionButton>
                            )}
                            <ActionButton onClick={onEditToggle}>
                                <Icon icon="solar:pen-bold" size={13} />
                                Edit
                            </ActionButton>
                            {activeTab === 'lists' && (
                                <ActionButton onClick={onCreateList}>
                                    <Icon icon="solar:add-circle-bold" size={13} />
                                    New List
                                </ActionButton>
                            )}
                        </>
                    ) : (
                        <>
                            <ActionButton
                                onClick={handleFollow}
                                disabled={isLoading}
                                variant={isFollowing ? 'ghost' : 'solid'}
                                className={isFollowing ? 'hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400' : ''}
                            >
                                <Icon
                                    icon={isFollowing ? 'solar:user-minus-bold' : 'solar:user-plus-bold'}
                                    size={13}
                                />
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </ActionButton>
                            {ownerLink && (
                                <ActionButton href={ownerLink}>
                                    My Profile
                                </ActionButton>
                            )}
                        </>
                    )}
                </div>
            </div>

            {profile?.description && (
                <p className="mt-4 max-w-xl text-sm leading-relaxed font-medium text-white/35 sm:ml-[calc(7rem+28px)]">
                    {profile.description}
                </p>
            )}

            <div className="mt-6 h-px w-full bg-white/5" />
        </div>
    )
}
