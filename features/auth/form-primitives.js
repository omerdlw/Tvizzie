import Icon from '@/ui/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-12 w-full rounded items-center border-[0.5px] border-white/10 bg-white/5 px-4 transition focus-within:border-white/15 focus-within:bg-white/10',
  input: 'w-full text-white placeholder:text-white/50',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'flex h-full items-center justify-center',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center h-12 w-full rounded bg-white px-4 font-semibold text-black transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center h-12 w-full rounded border-[0.5px] border-white/10 hover:bg-white/10 bg-white/5 px-4 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50',
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
      className="flex h-full items-center justify-center"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}
