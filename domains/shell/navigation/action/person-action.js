'use client';

import SocialLinks from '@/domains/media/ui/components/social-links';
import Icon from '@/ui/primitives/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/domains/shell/navigation/action/constants';

export default function PersonAction({ activeView, setActiveView, externalIds }) {
  const toggle = (view) => setActiveView(activeView === view ? 'main' : view);

  return (
    <div className="flex flex-col gap-2">
      <div className={NAV_ACTION_STYLES.row}>
        <button
          type="button"
          onClick={() => toggle('timeline')}
          className={getNavActionClass({
            className: 'flex-1',
            isActive: activeView === 'timeline',
          })}
        >
          <span className="flex items-center justify-center gap-2">
            {activeView === 'timeline' ? (
              <>
                <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_STYLES.icon} />
                Back
              </>
            ) : (
              <>
                <Icon icon="solar:sort-by-time-bold" size={NAV_ACTION_STYLES.icon} />
                Timeline
              </>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggle('awards')}
          className={getNavActionClass({
            className: 'flex-1',
            isActive: activeView === 'awards',
          })}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon
              icon={activeView === 'awards' ? 'solar:arrow-left-bold' : 'solar:cup-star-bold'}
              size={NAV_ACTION_STYLES.icon}
            />
            {activeView === 'awards' ? 'Back' : 'Awards'}
          </span>
        </button>
      </div>

      {externalIds ? (
        <SocialLinks externalIds={externalIds} className="w-full justify-center" />
      ) : null}
    </div>
  );
}
