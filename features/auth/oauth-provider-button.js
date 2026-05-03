'use client';

import { getOAuthProviderIcon } from '@/core/auth/oauth-providers';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

export const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center w-full gap-3 h-12 px-4 bg-white/5 rounded hover:bg-white hover:text-black transition border-[0.5px] border-white/10 disabled:cursor-not-allowed disabled:opacity-50',
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
