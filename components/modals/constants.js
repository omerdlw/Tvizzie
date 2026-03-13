const CONTROL_BASE =
  'w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition-colors outline-none placeholder:text-white/30 focus:border-white/20 focus:bg-white/8'

export const MODAL_LAYOUT = Object.freeze({
  actionRow: 'flex w-full flex-col gap-3 md:flex-row md:justify-end',
})

export const MODAL_FIELD = Object.freeze({
  label: 'ml-1 text-[10px] font-bold tracking-[0.15em] text-white/45 uppercase',
  input: `${CONTROL_BASE} font-medium`,
  textarea: `${CONTROL_BASE} min-h-[130px] resize-none`,
  infoBox:
    'rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75',
})

export const MODAL_BUTTON = Object.freeze({
  primary:
    'center h-11 w-full flex-auto gap-2 rounded-[20px] bg-white px-8 text-[11px] font-bold tracking-[0.18em] text-black uppercase transition hover:bg-white/90 active:scale-95 disabled:opacity-50',
  secondary:
    'h-11 w-full flex-auto rounded-[20px] border border-white/10 bg-white/5 px-6 text-[11px] font-bold tracking-[0.18em] text-white/70 uppercase transition hover:bg-white/10 hover:text-white active:scale-95',
  destructive:
    'h-11 w-full flex-auto rounded-[20px] px-8 text-[11px] font-bold tracking-[0.18em] uppercase',
})
