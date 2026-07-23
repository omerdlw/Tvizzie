import Icon from '@/ui/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-12 w-full items-center rounded-[16px] border border-black/10 hover:bg-primary focus-within:bg-primary px-4 hover:border-black/30 focus-within:border-black/30',
  input: 'w-full text-black placeholder:text-black/50 outline-none',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'flex h-full items-center justify-center',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12 w-full rounded-[16px] items-center justify-center border border-transparent bg-black px-4 font-semibold text-white hover:border-black/10 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12 w-full rounded-[16px] items-center justify-center border border-black/10 bg-primary px-4 text-black hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
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
      className="flex h-full items-center justify-center rounded-md p-1 text-black/40 hover:text-black/70 focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:outline-none"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}
