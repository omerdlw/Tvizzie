'use client'

export const AUTH_PAGE_STYLES = Object.freeze({
  page: 'flex min-h-dvh text-white bg-black',
  leftColumn: 'relative z-10 flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-1/2 lg:px-24 bg-[#0a0a0a]',
  rightColumn: 'relative hidden w-full overflow-hidden lg:block lg:w-1/2 bg-black',
  frame: 'mx-auto flex w-full max-w-[440px] flex-col justify-center',
  card: 'w-full',
  mobileHeader: 'relative flex flex-col gap-3 pb-8',
  cardEyebrow: 'text-xs font-medium text-white/45',
  title: 'text-[2.2rem] leading-[0.94] font-semibold text-white sm:text-[2.5rem]',
  subtitle: 'text-sm leading-6 text-white/60',
  switchCopy: 'text-sm leading-6 text-white/58',
  switchLink: 'font-medium text-white transition hover:opacity-80',
  form: 'flex flex-col gap-6',
  buttonStack: 'grid gap-3',
  stepper: 'flex flex-wrap gap-2',
  stepItem:
    'inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-white/48',
  stepItemActive: 'border-white text-white',
  stepItemInactive: 'text-white/45',
  stepDot:
    'flex size-6 items-center justify-center rounded-full border border-current/15 text-xs font-medium',
  stepLabel: 'text-sm font-medium',
  panel: 'border border-white/8 bg-white/5 p-5',
  panelEyebrow: 'text-xs font-medium text-white/45',
  panelTitle: 'pt-2 text-[1.4rem] leading-tight font-semibold text-white',
  panelText: 'pt-2 text-sm leading-6 text-white/58',
  fieldStack: 'flex flex-col gap-4',
  fieldGroup: 'flex flex-col gap-2.5',
  splitFields: 'grid gap-4 sm:grid-cols-2',
  fieldLabel: 'text-sm font-medium text-white/80',
  inputWrapper:
    'flex items-center rounded-xl border border-white/10 bg-white/5 px-4 transition-colors hover:border-white/20 focus-within:!border-white/40 focus-within:!bg-white/10',
  input:
    'w-full bg-transparent px-0 py-3.5 text-base leading-6 text-white outline-none placeholder:text-white/30',
  leftIcon: 'flex shrink-0 items-center pr-3 text-white/40',
  rightIcon: 'flex shrink-0 items-center pl-3 text-white/40',
  checkboxRow:
    'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  checkboxLabel:
    'flex min-w-0 items-start gap-3 text-sm font-medium text-white/60 sm:items-center cursor-pointer',
  checkboxText: 'block leading-5 sm:leading-none',
  checkbox:
    'mt-0.5 size-4 border border-white/20 bg-transparent accent-white cursor-pointer sm:mt-0',
  primaryButton:
    'flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white bg-white px-5 text-sm font-medium text-black transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
  secondaryButton:
    'flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent px-5 text-sm font-medium text-white transition hover:bg-white/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
  ghostAction:
    'self-start text-sm font-medium text-white/60 transition hover:text-white sm:self-auto cursor-pointer',
  helperText: 'text-xs leading-5 text-white/50',
  infoBox:
    'rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/80',
  actionGrid: 'grid gap-3 sm:grid-cols-2',
  statusRow: 'flex items-center gap-2 text-sm font-medium text-white',
  footerNote: 'pt-2 text-xs leading-6 text-white/48',
})

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper: AUTH_PAGE_STYLES.inputWrapper,
  input: AUTH_PAGE_STYLES.input,
  leftIcon: AUTH_PAGE_STYLES.leftIcon,
  rightIcon: AUTH_PAGE_STYLES.rightIcon,
})

export const AUTH_BUTTON_CLASSNAMES = Object.freeze({
  primary: Object.freeze({
    default: AUTH_PAGE_STYLES.primaryButton,
  }),
  secondary: Object.freeze({
    default: AUTH_PAGE_STYLES.secondaryButton,
  }),
})
