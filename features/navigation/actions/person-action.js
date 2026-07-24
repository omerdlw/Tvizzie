'use client';

import SocialLinks from '@/features/person/social-links';
import Icon from '@/ui/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/features/navigation/actions/model';

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
        </button>

        <button
          type="button"
          onClick={() => toggle('awards')}
          className={getNavActionClass({
            className: 'flex-1',
            isActive: activeView === 'awards',
          })}
        >
          {activeView === 'awards' ? (
            <>
              <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_STYLES.icon} />
              Back
            </>
          ) : (
            <>
              <Icon icon="solar:cup-star-bold" size={NAV_ACTION_STYLES.icon} />
              Awards
            </>
          )}
        </button>
      </div>

      {externalIds ? (
        <SocialLinks
          externalIds={externalIds}
          className="w-full justify-center rounded-[16px]"
        />
      ) : null}
    </div>
  );
}
