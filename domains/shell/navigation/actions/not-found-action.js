'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/shared';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from './constants';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

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
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className={`${NAV_ACTION_STYLES.row} ${className}`.trim()}
    >
      <Button
        type="button"
        onClick={() => router.push('/')}
        className={getNavActionClass({
          className: cn('min-w-0 flex-1 whitespace-nowrap', DESTRUCTIVE_ACTION_TONE_CLASS),
        })}
      >
        <Icon icon="solar:home-2-bold" size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{homeLabel}</span>
      </Button>

      {canGoBack ? (
        <Button
          type="button"
          onClick={() => {
            router.back();
          }}
          className={getNavActionClass({
            className: cn('min-w-0 flex-1 whitespace-nowrap', DESTRUCTIVE_ACTION_TONE_CLASS),
          })}
        >
          <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_STYLES.icon} />
          <span className="truncate">{backLabel}</span>
        </Button>
      ) : null}
    </motion.div>
  );
}
