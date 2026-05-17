'use client';

import { getOAuthProviderIcon } from '@/core/auth/oauth-providers';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

export const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'flex min-h-11 w-full items-center justify-center gap-3 border border-white/10 bg-white/10 px-3 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:px-4',
});

export default function OAuthProviderButton({ disabled = false, isBusy = false, mode = 'sign-in', onClick, provider }) {
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
