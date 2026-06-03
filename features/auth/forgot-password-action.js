'use client';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import Icon from '@/ui/icon';
export default function ForgotPasswordAction({
  onClick,
  disabled,
  isPreparingReset
}) {
  return <div className={NAV_ACTION_STYLES.row}>
      <button type="button" onClick={onClick} disabled={disabled} className={getNavActionClass({
      className: 'min-w-0 flex-1 whitespace-nowrap'
    })}>
        <Icon icon="solar:key-bold" size={NAV_ACTION_STYLES.icon} />
        <span className="truncate">{isPreparingReset ? 'Checking' : 'Forgot password?'}</span>
      </button>
    </div>;
}
