'use client';

import { OAUTH_PROVIDER_KEYS } from '@/modules/auth';
import { getOAuthProviderIcon } from '@/domains/auth/utils/oauth';
import Button from '@/ui/primitives/button';
import Icon from '@/ui/primitives/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-11 w-full items-center rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 transition-all duration-300 ease-in-out hover:ring-white/10 hover:bg-white/10 focus-within:ring-white/10 focus-within:bg-white/10',
  input: 'w-full text-white placeholder:text-white/40 outline-none text-sm',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center h-11 text-xs font-bold uppercase w-full cursor-pointer rounded-[20px] ring-1 ring-inset ring-transparent bg-white/70 px-4 text-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-50',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center h-11 text-xs font-bold uppercase w-full cursor-pointer rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
});

export function AuthField({ children, className = '', description = '', htmlFor, label }) {
  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-xs font-semibold text-white/40 uppercase"
        >
          {label}
        </label>
      ) : null}
      {children}
      {description ? <p className="mt-2 text-xs leading-5 text-white/40">{description}</p> : null}
    </div>
  );
}

const PROVIDER_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'group flex h-11 w-full cursor-pointer items-center justify-between rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-white/70 hover:bg-white hover:text-black hover:ring-transparent disabled:cursor-not-allowed disabled:opacity-50',
});

export function OAuthProviderButton({
  disabled = false,
  isBusy = false,
  mode = 'sign-in',
  onClick,
  provider,
}) {
  const providerIcon =
    getOAuthProviderIcon(provider) || (provider === 'email' ? 'solar:letter-bold' : null);
  const providerLabel =
    provider === 'passkey'
      ? 'Passkey'
      : provider === 'google'
        ? 'Google'
        : provider === 'github'
          ? 'GitHub'
          : provider === 'x'
            ? 'X'
            : 'Email';
  const actionLabel = mode === 'sign-up' ? 'Sign up with' : 'Continue with';

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || isBusy}
      aria-label={`${actionLabel} ${providerLabel}`}
      classNames={PROVIDER_BUTTON_CLASSNAMES}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="center size-7 shrink-0 text-white/70 group-hover:text-black">
          {providerIcon ? <Icon icon={providerIcon} size={18} /> : null}
        </span>
        <span className="text-sm font-medium">
          {actionLabel} {providerLabel}
        </span>
      </span>
    </Button>
  );
}

export function OAuthProviderList({
  activeProvider = null,
  disabled = false,
  includeEmail = false,
  includePasskey = false,
  mode,
  onSelect,
}) {
  const providers = [
    ...(includePasskey ? ['passkey'] : []),
    ...(includeEmail ? ['email'] : []),
    ...OAUTH_PROVIDER_KEYS,
  ];

  return (
    <div className="flex w-full flex-col gap-2.5">
      {providers.map((provider) => (
        <OAuthProviderButton
          key={provider}
          provider={provider}
          mode={mode}
          isBusy={activeProvider === provider}
          disabled={disabled || Boolean(activeProvider)}
          onClick={() => onSelect(provider)}
        />
      ))}
    </div>
  );
}
