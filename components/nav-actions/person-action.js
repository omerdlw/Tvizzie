'use client'

import Icon from '@/ui/icon'

import { NAV_ACTION_TONES, navActionBaseClass } from './constants'

export default function PersonAction({ activeView, setActiveView }) {
  return (
    <div className="mt-2.5 flex w-full items-center gap-2">
      <button
        type="button"
        onClick={() =>
          setActiveView(activeView === 'timeline' ? 'profile' : 'timeline')
        }
        className={navActionBaseClass({
          layout: 'flex cursor-pointer items-center justify-center gap-2 w-full',
          className: `flex-1 ${
            activeView === 'timeline'
              ? NAV_ACTION_TONES.active
              : NAV_ACTION_TONES.muted
          }`,
        })}
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
        type="button"
        onClick={() =>
          setActiveView(activeView === 'awards' ? 'profile' : 'awards')
        }
        className={navActionBaseClass({
          layout: 'flex cursor-pointer items-center justify-center gap-2 w-full',
          className: `flex-1 ${
            activeView === 'awards'
              ? NAV_ACTION_TONES.active
              : NAV_ACTION_TONES.muted
          }`,
        })}
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
