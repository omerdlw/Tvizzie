'use client';

import { motion } from 'framer-motion';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import { NAV_BUTTON_INTERACTION_MOTION } from '@/core/modules/motion';
import Icon from '@/ui/icon';

export default function ForgotPasswordAction({ onClick, disabled, isPreparingReset }) {
  return (
    <div className={NAV_ACTION_STYLES.row}>
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={getNavActionClass({
          className: 'min-w-0 flex-1 whitespace-nowrap',
        })}
        {...NAV_BUTTON_INTERACTION_MOTION}
      >
        <Icon icon="solar:key-bold" size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{isPreparingReset ? 'Checking' : 'Forgot password?'}</span>
      </motion.button>
    </div>
  );
}
