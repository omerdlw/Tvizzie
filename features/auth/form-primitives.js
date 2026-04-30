import Icon from '@/ui/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-12 w-full  items-center border border-black/10 bg-primary px-4 transition focus-within:border-black/40',
  input: 'w-full text-black placeholder:text-black/50',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'flex h-full items-center justify-center',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12  w-full items-center justify-center border border-transparent bg-black px-4 font-semibold text-white transition hover:border-black/10 hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12  w-full items-center justify-center border border-black/10 bg-primary px-4 text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60',
});

export function AuthField({ children, className = '', htmlFor, label }) {
  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-black/50">
        {label}
      </label>
      {children}
    </div>
  );
}

export function PasswordToggleButton({
  visible,
  onClick,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? hideLabel : showLabel}
      className="flex h-full items-center justify-center"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}
