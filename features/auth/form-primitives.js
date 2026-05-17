import Icon from '@/ui/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex min-h-11 w-full items-center justify-center border border-white/10 bg-white/10 px-3 focus-within:border-white/15 sm:min-h-12 sm:px-4',
  input: 'w-full text-base text-white placeholder:text-white/50',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'auth-input-right-icon flex h-full min-w-10 items-center justify-center',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'flex min-h-11 w-full items-center justify-center bg-white px-3 font-semibold text-black hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:px-4',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'flex min-h-11 w-full items-center justify-center border border-white/10 bg-white/10 px-3 font-semibold hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:px-4',
});

export function AuthField({ children, className = '', htmlFor, label }) {
  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-white/50">
        {label}
      </label>
      {children}
    </div>
  );
}

export function PasswordToggleButton({ visible, onClick, showLabel = 'Show password', hideLabel = 'Hide password' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? hideLabel : showLabel}
      className="auth-password-toggle flex h-full min-w-10 items-center justify-center"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}
