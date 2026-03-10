import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FollowsService } from '@/services/follows.service'
import { useAuth } from '@/modules/auth'
import { useToast } from '@/modules/notification/hooks'
import { useModal } from '@/modules/modal/context'
import Icon from '@/ui/icon'
import { cn } from '@/lib/utils/index'

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

        const unsubFollowers = FollowsService.subscribeToFollowers(profile.id, (followers) => {
            setFollowerCount(followers.length)
        })

        const unsubFollowing = FollowsService.subscribeToFollowing(profile.id, (following) => {
            setFollowingCount(following.length)
        })

        let unsubStatus = () => { }
        if (!isOwner && auth.user?.id) {
            unsubStatus = FollowsService.subscribeToFollowStatus(auth.user.id, profile.id, setIsFollowing)
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
                await FollowsService.unfollowUser(auth.user.id, profile.id)
            } else {
                await FollowsService.followUser(auth.user.id, profile.id)
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
    const getAvatarUrl = (profile) => {
        const seed = profile?.username || profile?.id || 'tvizzie'
        return (
            profile?.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
        )
    }

    return (
        <div className="relative bg-transparent mt-12 mb-8 transition-all duration-500">
            <div className="flex flex-col items-center gap-10">
                <div className="flex flex-col items-center gap-8 text-center px-4">
                    <div className="relative group/avatar">
                        <div className="absolute -inset-4 rounded-[60px] bg-white/5 opacity-0 group-hover/avatar:opacity-100 blur-2xl transition-all duration-700 -z-1" />
                        <div className="relative size-40 sm:size-52 shrink-0 overflow-hidden rounded-[50px] border border-white/10 bg-black/40 duration-500 ring-1 ring-white/15">
                            <img
                                src={getAvatarUrl(profile)}
                                alt={profile?.displayName || 'Profile avatar'}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover/avatar:scale-110"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <h1 className="font-zuume text-6xl font-bold tracking-tight uppercase text-white sm:text-8xl lg:text-9xl">
                            {profile?.displayName || 'Profile'}
                        </h1>

                        {profile?.description && (
                            <p className="max-w-xl text-base font-medium leading-relaxed text-white/50">
                                {profile.description}
                            </p>
                        )}

                        <div className="flex items-center gap-8 mt-2">
                            <button
                                onClick={() => openFollowList('followers')}
                                className="group flex flex-col items-center gap-1"
                            >
                                <span className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{followerCount}</span>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Followers</span>
                            </button>
                            <div className="w-px h-8 bg-white/10" />
                            <button
                                onClick={() => openFollowList('following')}
                                className="group flex flex-col items-center gap-1"
                            >
                                <span className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{followingCount}</span>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Following</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    {isOwner ? (
                        <>
                            {publicLink && (
                                <Link
                                    href={publicLink}
                                    className="flex h-11 items-center cursor-pointer hover:bg-white hover:text-black justify-center rounded-[20px] border border-white/10 bg-white/5 px-6 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase transition"
                                >
                                    View Public
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={onEditToggle}
                                className="flex h-11 items-center cursor-pointer hover:bg-white hover:text-black justify-center rounded-[20px] border border-white/10 bg-white/5 px-6 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase transition"
                            >
                                Edit Profile
                            </button>
                            {activeTab === 'lists' && (
                                <button
                                    type="button"
                                    onClick={onCreateList}
                                    className="flex h-11 items-center cursor-pointer hover:bg-white hover:text-black justify-center rounded-[20px] border border-white/10 bg-white/5 px-8 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase transition active:scale-95"
                                >
                                    Create New List
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleFollow}
                                disabled={isLoading}
                                className={cn(
                                    "flex h-12 items-center justify-center gap-3 rounded-[20px] px-10 text-[11px] font-black tracking-[0.2em] uppercase transition-all active:scale-95 disabled:opacity-50",
                                    isFollowing
                                        ? "border border-white/10 bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                                        : "bg-white text-black hover:bg-white/90"
                                )}
                            >
                                <Icon icon={isFollowing ? "solar:user-minus-bold" : "solar:user-plus-bold"} size={16} />
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                            {ownerLink && (
                                <Link
                                    href={ownerLink}
                                    className="flex h-12 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 px-6 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase transition hover:bg-white/10"
                                >
                                    My Profile
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
