import { SEARCH_STYLES } from '@/features/search/constants';

function resolveNavActionTone(tone, isActive) {
  if (!tone || tone === 'toggle') {
    return isActive ? SEARCH_STYLES.action.active : SEARCH_STYLES.action.muted;
  }

  return SEARCH_STYLES.action[tone] || SEARCH_STYLES.action.muted;
}

export function navActionClass({ cn, button = '', isActive = false, tone, className } = {}) {
  return cn(button, resolveNavActionTone(tone, isActive), className);
}
