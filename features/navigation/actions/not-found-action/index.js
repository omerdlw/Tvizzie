'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Icon from '@/ui/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/features/navigation/actions/model';

export default function NotFoundAction({
  homeLabel = 'Return Home',
  backLabel = 'Back',
  className = '',
}) {
  const router = useRouter();

  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  return (
    <div className={`${NAV_ACTION_STYLES.row} ${className}`.trim()}>
      <motion.button
        type="button"
        whileHover={{ scale: 1.012 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 450, damping: 26 }}
        onClick={() => router.push('/')}
        className={getNavActionClass({
          className: 'min-w-0 flex-1 whitespace-nowrap',
        })}
      >
        <Icon icon="solar:home-2-bold" size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{homeLabel}</span>
      </motion.button>

      {canGoBack ? (
        <motion.button
          type="button"
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 450, damping: 26 }}
          onClick={() => {
            router.back();
          }}
          className={getNavActionClass({
            className: 'min-w-0 flex-1 whitespace-nowrap',
          })}
        >
          <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_STYLES.icon} />
          <span className="truncate">{backLabel}</span>
        </motion.button>
      ) : null}
    </div>
  );
}
