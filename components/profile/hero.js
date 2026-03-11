import { cn } from '@/lib/utils/index'
import Icon from '@/ui/icon'

const TABS = [
  { key: 'favorites', icon: 'solar:heart-bold', label: 'Favorites' },
  { key: 'watchlist', icon: 'solar:bookmark-bold', label: 'Watchlist' },
  { key: 'lists', icon: 'solar:clipboard-list-bold', label: 'Lists' },
]

function StatItem({ label, value, onClick }) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5',
        onClick && 'group/stat cursor-pointer'
      )}
    >
      <span className="text-base font-bold text-white sm:text-lg">{value}</span>
      <span className="text-[11px] font-semibold tracking-wide text-white/35 uppercase transition-colors group-hover/stat:text-white/50">
        {label}
      </span>
    </Wrapper>
  )
}

export function ProfileHero({
  profile,
  activeTab,
  onTabChange,
  favoritesCount = 0,
  watchlistCount = 0,
  listsCount = 0,
  followerCount = 0,
  followingCount = 0,
}) {
  const getAvatarUrl = (p) => {
    const seed = p?.username || p?.id || 'tvizzie'
    return (
      p?.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
    )
  }

  const contentCount =
    activeTab === 'favorites'
      ? favoritesCount
      : activeTab === 'watchlist'
        ? watchlistCount
        : listsCount

  const topName = profile?.displayName || profile?.username || 'Profile'
  const subName = profile?.username ? `@${profile.username}` : null

  return (
    <div className="relative mx-auto mt-6 w-full max-w-4xl sm:mt-12">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12 md:gap-16">
        <div className="group/avatar relative shrink-0">
          <div className="absolute -inset-1.5 rounded-full bg-linear-to-tr from-white/20 via-white/5 to-white/15 opacity-80 blur-[2px] transition-all duration-700 group-hover/avatar:opacity-100" />
          <div className="relative size-[100px] overflow-hidden rounded-full ring-[3px] ring-white/15 transition-all duration-500 sm:size-[150px]">
            <img
              src={getAvatarUrl(profile)}
              alt={topName}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/avatar:scale-110"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-5 sm:items-start sm:pt-2">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {topName}
              </h1>
            </div>
            {subName && (
              <p className="text-sm font-medium text-white/40">{subName}</p>
            )}
          </div>

          <div className="flex items-center gap-6 sm:gap-10">
            <StatItem label="Content" value={contentCount} />
            <StatItem label="Followers" value={followerCount} />
            <StatItem label="Following" value={followingCount} />
          </div>

          <div className="flex max-w-xl flex-col items-center gap-2 sm:items-start">
            {profile?.description && (
              <p className="text-center text-sm leading-relaxed text-white/45 sm:text-left sm:text-base">
                {profile.description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-10 flex w-full items-center border-t border-white/10 sm:mt-16">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange?.(tab.key)}
            className={cn(
              'relative flex flex-1 cursor-pointer items-center justify-center gap-2 py-4 text-[10px] font-bold tracking-[0.18em] uppercase transition-all duration-300',
              activeTab === tab.key
                ? 'text-white'
                : 'text-white/30 hover:text-white/60'
            )}
          >
            {activeTab === tab.key && (
              <div className="absolute inset-x-0 top-0 h-[2px] bg-white" />
            )}
            <Icon icon={tab.icon} size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
