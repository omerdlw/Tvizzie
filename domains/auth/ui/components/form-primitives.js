import Icon from '@/ui/primitives/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-12 w-full items-center border border-white/5 px-4 transition-all duration-300 ease-in-out hover:bg-white/5 focus-within:bg-white/5',
  input: 'w-full text-white placeholder:text-white/50 outline-none',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'flex h-full items-center justify-center',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center h-12 w-full border border-transparent bg-white/80 cursor-pointer px-4 font-semibold text-black transition-all duration-300 ease-in-out hover:bg-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'center h-12 w-full border border-white/5 bg-white/5 px-4 text-white transition-all duration-300 ease-in-out hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
});

export function AuthField({ children, className = '' }) {
  return <div className={className}>{children}</div>;
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
      className="flex h-full items-center justify-center p-1 text-white/50 transition-all duration-300 ease-in-out hover:text-white"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}
