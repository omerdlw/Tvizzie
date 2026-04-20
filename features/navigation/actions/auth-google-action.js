'use client';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import Icon from '@/ui/icon';

export default function AuthGoogleAction({ isLoading = false, label = 'Continue with Google', onClick }) {
  return (
    <div className={NAV_ACTION_STYLES.row}>
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className={getNavActionClass({
          variant:
            'w-full border border-[#0d9488] bg-[#99f6e4] text-[#134e4a] transition-colors duration-[200ms]',
          className: 'justify-center text-sm font-medium tracking-normal normal-case',
        })}
      >
        <Icon icon="flat-color-icons:google" size={18} />
        <span>{isLoading ? 'Opening Google' : label}</span>
      </button>
    </div>
  );
}
