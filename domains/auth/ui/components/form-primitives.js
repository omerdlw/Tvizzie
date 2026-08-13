import Icon from '@/ui/primitives/icon';

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-12 w-full items-center  border border-black/10 px-4 transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-black/30 hover:bg-primary focus-within:border-black/30 focus-within:bg-primary',
  input: 'w-full text-black placeholder:text-black/50 outline-none',
});

export const AUTH_PASSWORD_INPUT_CLASSNAMES = Object.freeze({
  ...AUTH_INPUT_CLASSNAMES,
  rightIcon: 'flex h-full items-center justify-center',
});

export const AUTH_PRIMARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12 w-full  items-center justify-center border border-transparent bg-black px-4 font-semibold text-white transition-[background-color,border-color,transform] duration-300 ease-out hover:scale-[1.015] hover:border-black/10 hover:bg-black/90 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
});

export const AUTH_SECONDARY_BUTTON_CLASSNAMES = Object.freeze({
  default:
    'inline-flex h-12 w-full  items-center justify-center border border-black/10 bg-primary px-4 text-black transition-[background-color,border-color,transform] duration-300 ease-out hover:scale-[1.015] hover:bg-white active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
      className="flex h-full items-center justify-center p-1 text-black/50 transition-[color,transform] duration-200 ease-out hover:scale-[1.05] hover:text-black/70 focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:outline-none active:scale-[0.94]"
    >
      <Icon icon={visible ? 'solar:eye-closed-linear' : 'solar:eye-linear'} size={20} />
    </button>
  );
}
