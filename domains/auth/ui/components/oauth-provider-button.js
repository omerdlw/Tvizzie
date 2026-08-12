'use client';

import { getOAuthProviderIcon } from '@/domains/auth/utils/oauth';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

export const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-black/10 px-4 text-black transition-[background-color,border-color,color,transform] duration-300 ease-out hover:scale-[1.02] hover:bg-black hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
