'use client';

import { getOAuthProviderIcon } from '@/core/auth/oauth-providers';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

export const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex w-full items-center gap-3 justify-center h-13 px-4 text-black hover:bg-black hover:text-white transition border border-black/10 disabled:cursor-not-allowed disabled:opacity-60',
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
