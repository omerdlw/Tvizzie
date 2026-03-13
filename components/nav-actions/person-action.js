'use client'

import Icon from '@/ui/icon'

import { NAV_ACTION_ICON, NAV_ACTION_LAYOUT, navActionClass } from './constants'

export default function PersonAction({ activeView, setActiveView }) {
  return (
    <div className={NAV_ACTION_LAYOUT.row}>
      <button
        type="button"
        onClick={() =>
          setActiveView(activeView === 'timeline' ? 'profile' : 'timeline')
        }
        className={navActionClass({
          className: 'flex-1',
          tone: 'toggle',
          isActive: activeView === 'timeline',
        })}
      >
        {activeView === 'timeline' ? (
          <>
            <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_ICON.default} />
            Back
          </>
        ) : (
          <>
            <Icon
              icon="solar:sort-by-time-bold"
              size={NAV_ACTION_ICON.default}
            />
            Timeline
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() =>
          setActiveView(activeView === 'awards' ? 'profile' : 'awards')
        }
        className={navActionClass({
          className: 'flex-1',
          tone: 'toggle',
          isActive: activeView === 'awards',
        })}
      >
        {activeView === 'awards' ? (
          <>
            <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_ICON.default} />
            Back
          </>
        ) : (
          <>
            <Icon icon="solar:cup-star-bold" size={NAV_ACTION_ICON.default} />
            Awards
          </>
        )}
      </button>
    </div>
  )
}
