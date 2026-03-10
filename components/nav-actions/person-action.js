'use client'

import Icon from '@/ui/icon'

export default function PersonAction({ activeView, setActiveView }) {
  return (
    <div className="mt-2.5 flex w-full items-center gap-2">
      <button
        onClick={() =>
          setActiveView(activeView === 'timeline' ? 'profile' : 'timeline')
        }
        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[20px] px-4 py-2.5 text-[11px] font-semibold tracking-widest uppercase transition-all duration-300 ${
          activeView === 'timeline'
            ? 'bg-white/15 text-white ring-1 ring-white/15'
            : 'bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/80'
        }`}
      >
        {activeView === 'timeline' ? (
          <>
            <Icon icon="solar:arrow-left-bold" size={16} />
            Back
          </>
        ) : (
          <>
            <Icon icon="solar:sort-by-time-bold" size={16} />
            Timeline
          </>
        )}
      </button>
      <button
        onClick={() =>
          setActiveView(activeView === 'awards' ? 'profile' : 'awards')
        }
        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-[11px] font-semibold tracking-widest uppercase transition-all duration-300 ${
          activeView === 'awards'
            ? 'bg-white/15 text-white ring-1 ring-white/15'
            : 'bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/80'
        }`}
      >
        {activeView === 'awards' ? (
          <>
            <Icon icon="solar:arrow-left-bold" size={16} />
            Back
          </>
        ) : (
          <>
            <Icon icon="solar:cup-star-bold" size={16} />
            Awards
          </>
        )}
      </button>
    </div>
  )
}
