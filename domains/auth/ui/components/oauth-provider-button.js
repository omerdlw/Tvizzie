'use client';

import { getOAuthProviderIcon } from '@/domains/auth/utils/oauth';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

export const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex w-full rounded-2xl items-center gap-3 justify-center h-13 px-4 text-black hover:bg-black hover:text-white border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
});

export default function OAuthProviderButton({
  disabled = false,
  isBusy = false,
  mode = 'sign-in',
  onClick,
  provider,
}) {
  const providerIcon = getOAuthProviderIcon(provider);
  const providerLabel = provider === 'google' ? 'Google' : 'provider';
  const actionLabel = mode === 'sign-up' ? 'Sign up with' : 'Continue with';
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || isBusy}
      aria-label={`${actionLabel} ${providerLabel}`}
      classNames={PROVIDER_BUTTON_CLASSNAMES}
    >
      {providerIcon ? <Icon icon={providerIcon} size={20} /> : null}
    </Button>
  );
}
