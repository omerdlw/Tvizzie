export const MODAL_ACTION_BUTTON_SECONDARY_CLASS =
  'h-8 shrink-0 whitespace-nowrap border border-white/10 bg-transparent px-4 text-xs leading-4 font-semibold tracking-wide uppercase text-white/70 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white';

export const MODAL_ACTION_BUTTON_PRIMARY_CLASS =
  'h-8 shrink-0 whitespace-nowrap border border-white bg-white px-4 text-xs leading-4 font-semibold tracking-wide uppercase text-primary transition-colors hover:border-info hover:bg-info hover:text-primary disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/50';

export const MODAL_INPUT_CLASSNAMES = Object.freeze({
  wrapper:
    'flex h-10 items-center border border-white/10 bg-white/10 px-3.5 transition-colors focus-within:border-white/20 focus-within:bg-white/10',
  input: 'h-full w-full bg-transparent text-sm leading-5 text-white outline-none placeholder:text-white/50',
});

export const MODAL_TEXTAREA_CLASSNAMES = Object.freeze({
  wrapper:
    'flex min-h-10 items-center border border-white/10 bg-white/10 px-3.5 py-2.5 transition-colors focus-within:border-white/20 focus-within:bg-white/10',
  textarea: 'max-h-[220px] min-h-5 w-full resize-none bg-transparent text-sm leading-5 text-white outline-none placeholder:text-white/50',
});

export const MODAL_SCROLLABLE_BODY_CLASS = 'min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5';

export const MODAL_EMPTY_PANEL_CLASS =
  'flex h-28 flex-col items-center justify-center gap-2 border border-white/10 bg-white/10 text-center text-white/50';
