'use client';

export const AUTH_PAGE_STYLES = Object.freeze({
  page: 'flex h-screen w-screen bg-white',
  leftColumn:
    'relative z-10 flex h-screen w-full flex-col justify-center overflow-y-auto px-6 py-10 sm:px-12 lg:w-1/2 lg:px-24 bg-[#fef3c7]',
  rightColumn: 'relative hidden h-screen w-full overflow-hidden lg:block lg:w-1/2 bg-[#dbeafe]',
  frame: 'mx-auto flex w-full max-w-[440px] flex-col justify-center',
  card: 'w-full',
  mobileHeader: 'relative flex flex-col gap-3 pb-8',
  cardEyebrow: 'text-xs font-medium text-[#0f172a]',
  title: 'text-[2.2rem] leading-[0.94] font-semibold text-[#0f172a] sm:text-[2.5rem]',
  subtitle: 'text-sm leading-6 text-[#0f172a]',
  switchCopy: 'text-sm leading-6 text-[#0f172a]',
  switchLink: 'font-medium text-[#0f172a] transition ',
  form: 'flex flex-col gap-6',
  buttonStack: 'grid gap-3',
  stepper: 'flex flex-wrap gap-2',
  stepItem: 'inline-flex items-center gap-2 rounded-full border border-[#0284c7] px-3 py-2 text-sm text-[#0f172a]',
  stepItemActive: 'border-[#0284c7] text-[#0f172a]',
  stepItemInactive: 'text-[#0f172a]',
  stepDot: 'flex size-6 items-center justify-center rounded-full border border-current/15 text-xs font-medium',
  stepLabel: 'text-sm font-medium',
  panel: 'border border-[#0284c7] bg-[#dbeafe] p-5',
  panelEyebrow: 'text-xs font-medium text-[#0f172a]',
  panelTitle: 'pt-2 text-[1.4rem] leading-tight font-semibold text-[#0f172a]',
  panelText: 'pt-2 text-sm leading-6 text-[#0f172a]',
  fieldStack: 'flex flex-col gap-4',
  fieldGroup: 'flex flex-col gap-2.5',
  splitFields: 'grid gap-4 sm:grid-cols-2',
  fieldLabel: 'text-sm font-medium text-[#0f172a]',
  inputWrapper: 'flex items-center rounded-xl border border-[#0284c7] bg-[#dbeafe] px-4 transition-colors ',
  input: 'w-full bg-transparent px-0 py-3.5 text-base leading-6 text-[#0f172a] outline-none placeholder:text-[#0f172a]',
  leftIcon: 'flex shrink-0 items-center pr-3 text-[#0f172a]',
  rightIcon: 'flex shrink-0 items-center pl-3 text-[#0f172a]',
  checkboxRow: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  checkboxLabel: 'flex min-w-0 items-start gap-3 text-sm font-medium text-[#0f172a] sm:items-center cursor-pointer',
  checkboxText: 'block leading-5 sm:leading-none',
  checkbox: 'mt-0.5 size-4 border border-[#0284c7] bg-transparent accent-[#0ea5e9] cursor-pointer sm:mt-0',
  primaryButton:
    'flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#0284c7] bg-[#dbeafe] px-5 text-sm font-medium text-[#0f172a] transition disabled:cursor-not-allowed disabled:opacity-50',
  secondaryButton:
    'flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#0284c7] bg-transparent px-5 text-sm font-medium text-[#0f172a] transition disabled:cursor-not-allowed disabled:opacity-50',
  ghostAction: 'self-start text-sm font-medium text-[#0f172a] transition sm:self-auto cursor-pointer',
  helperText: 'text-xs leading-5 text-[#0f172a]',
  infoBox: 'rounded-xl border border-[#0284c7] bg-[#dbeafe] px-4 py-3 text-sm leading-6 text-[#0f172a]',
  actionGrid: 'grid gap-3 sm:grid-cols-2',
  statusRow: 'flex items-center gap-2 text-sm font-medium text-[#0f172a]',
  footerNote: 'pt-2 text-xs leading-6 text-[#0f172a]',
});

export const AUTH_INPUT_CLASSNAMES = Object.freeze({
  wrapper: AUTH_PAGE_STYLES.inputWrapper,
  input: AUTH_PAGE_STYLES.input,
  leftIcon: AUTH_PAGE_STYLES.leftIcon,
  rightIcon: AUTH_PAGE_STYLES.rightIcon,
});

export const AUTH_BUTTON_CLASSNAMES = Object.freeze({
  primary: Object.freeze({
    default: AUTH_PAGE_STYLES.primaryButton,
  }),
  secondary: Object.freeze({
    default: AUTH_PAGE_STYLES.secondaryButton,
  }),
});
