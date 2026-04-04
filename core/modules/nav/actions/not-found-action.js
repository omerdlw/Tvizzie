'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import Icon from '@/ui/icon';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';

export default function NotFoundAction({ homeLabel = 'Return Home', backLabel = 'Back', className = '' }) {
  const router = useRouter();

  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  return (
    <div className={`${NAV_ACTION_STYLES.row} ${className}`.trim()}>
      <button
        type="button"
        onClick={() => router.push('/')}
        className={getNavActionClass({
          className: 'min-w-0 flex-1 whitespace-nowrap',
        })}
      >
        <Icon icon="solar:home-2-bold" size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{homeLabel}</span>
      </button>

      {canGoBack && (
        <button
          type="button"
          onClick={() => {
            router.back();
          }}
          className={getNavActionClass({
            className: 'min-w-0 flex-1 whitespace-nowrap',
          })}
        >
          <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_STYLES.icon} />
          <span className="truncate">{backLabel}</span>
        </button>
      )}
    </div>
  );
}
