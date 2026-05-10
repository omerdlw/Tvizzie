import Icon from '@/ui/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper: 'auth-input-control flex min-h-11 w-full items-center justify-center px-3 sm:min-h-12 sm:px-4',
  input: 'auth-input-native w-full text-base',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'auth-input-right-icon flex h-full min-w-10 items-center justify-center',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default: 'auth-primary-button flex min-h-11 w-full items-center justify-center px-3 font-semibold sm:min-h-12 sm:px-4',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default: 'auth-secondary-button flex min-h-11 w-full items-center justify-center px-3 font-semibold sm:min-h-12 sm:px-4',
});

export function AuthField({ children, className = '', htmlFor, label }) {
  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="auth-field-label text-sm font-medium">
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
