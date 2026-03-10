'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

const PROFILE_SECTIONS = ['favorites', 'watchlist', 'lists']

function TabButton({ active = false, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative cursor-pointer flex-auto rounded-[16px] px-4 py-2 text-[10px] font-semibold tracking-[0.18em] uppercase transition-all duration-300',
        active ? 'text-black' : 'text-white/45 hover:text-white'
      )}
    >
      {active && (
        <div className="absolute inset-0 z-0 rounded-full bg-white transition-all duration-300" />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}

export default function ProfileAction({
  activeTab = 'favorites',
  onTabChange,

  isAuthenticated = false,
  isPublicView = false,
  onSignIn,
  isNotFound = false,
}) {
  if (isNotFound) {
    return (
      <Link
        href="/"
        className="mt-2.5 flex py-3 w-full cursor-pointer items-center border border-transparent hover:border-white/10 hover:text-white justify-center gap-2 rounded-[20px] hover:bg-white/5 bg-white px-4 text-[10px] font-bold tracking-[0.15em] text-black uppercase transition-all active:scale-[0.98]"
      >
        Back Home
      </Link>
    )
  }

  if (!isAuthenticated && !isPublicView) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="mt-2.5 flex py-2.5 w-full cursor-pointer items-center border border-transparent hover:border-white/10 hover:text-white justify-center gap-2 rounded-[20px] hover:bg-white/5 bg-white px-4 text-[10px] font-bold tracking-[0.15em] text-black uppercase transition-all active:scale-[0.98]"
      >
        <Icon icon="logos:google-icon" size={14} />
        Sign In with Google
      </button>
    )
  }

  return (
    <div className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-[20px] border border-white/5 bg-white/5 p-1">
      {PROFILE_SECTIONS.map((tab) => (
        <TabButton
          key={tab}
          active={activeTab === tab}
          onClick={() => onTabChange?.(tab)}
        >
          {tab}
        </TabButton>
      ))}
    </div>
  )
}
