'use client'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

export default function ProfileAction({
  isOwner = false,
  isAuthenticated = false,
  onSignIn,
  isNotFound = false,
  onEditProfile,
  isFollowing = false,
  onFollow,
  isLoading = false,
}) {
  if (isNotFound) {
    return (
      <button
        type="button"
        onClick={() => (window.location.href = '/')}
        className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 text-[10px] font-bold tracking-[0.15em] text-black uppercase transition-all hover:bg-white/90 active:scale-[0.98]"
      >
        Back Home
      </button>
    )
  }

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[20px] border border-transparent bg-white px-4 text-[11px] font-bold tracking-[0.15em] text-black uppercase transition-all hover:border-white/10 hover:bg-white/5 hover:text-white active:scale-[0.98]"
      >
        <Icon icon="solar:user-circle-bold" size={14} />
        Sign In
      </button>
    )
  }

  if (isOwner) {
    return (
      <button
        type="button"
        onClick={onEditProfile}
        className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[20px] border border-transparent bg-white px-4 text-[11px] font-bold tracking-[0.15em] text-black uppercase transition-all hover:border-white/10 hover:bg-white/5 hover:text-white active:scale-[0.98]"
      >
        <Icon icon="solar:pen-bold" size={14} />
        Edit Profile
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onFollow}
      disabled={isLoading}
      className={cn(
        'mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[20px] px-4 text-[10px] font-bold tracking-[0.15em] uppercase transition-all active:scale-[0.98] disabled:opacity-50',
        isFollowing
          ? 'border border-white/10 bg-white/5 text-white/70 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400'
          : 'bg-white text-black hover:bg-white/90'
      )}
    >
      <Icon
        icon={isFollowing ? 'solar:user-minus-bold' : 'solar:user-plus-bold'}
        size={14}
      />
      {isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  )
}
