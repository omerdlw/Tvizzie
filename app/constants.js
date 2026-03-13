export const STYLES = Object.freeze({
  layout: Object.freeze({
    detailShell:
      'relative mx-auto flex h-auto w-full max-w-6xl flex-col gap-4 p-3 select-none sm:p-4 md:p-6',
    detailShellAnimated:
      'relative mx-auto flex h-auto w-full max-w-6xl flex-col gap-4 p-3 transition-all duration-[var(--motion-duration-slower)] ease-[var(--motion-easing-ease-in-out)] select-none sm:p-4 md:p-6',
    backdrop:
      'pointer-events-none fixed inset-0 -z-10 bg-linear-to-t from-black via-black/40 to-transparent',
    detailSplit:
      'mt-8 flex h-auto w-full flex-col items-start gap-6 sm:mt-12 lg:mt-20 lg:flex-row lg:gap-12',
    sidebar: 'w-full self-start lg:sticky lg:top-6 lg:w-100',
    content: 'flex w-full min-w-0 flex-col',
    section: '-m-1 mt-10 flex flex-col gap-4',
    inlineSection: '-m-1 flex w-full flex-col gap-4',
  }),
  chip: Object.freeze({
    subtle:
      'rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur-sm',
    stat: 'flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 backdrop-blur-sm',
  }),
})
