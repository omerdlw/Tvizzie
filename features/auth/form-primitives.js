import Icon from '@/ui/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper: 'auth-input-control',
  input: 'auth-input-native',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'auth-input-right-icon',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default: 'auth-primary-button',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default: 'auth-secondary-button',
});

export function AuthField({ children, className = '', htmlFor, label }) {
  return (
    <div className={`auth-field ${className}`}>
      <label htmlFor={htmlFor} className="auth-field-label">
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
      className="auth-password-toggle"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}
