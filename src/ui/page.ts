const RHYTHM_GAP = "gap-8 sm:gap-10 lg:gap-12";
const RHYTHM_GAP_Y = "gap-y-8 sm:gap-y-10 lg:gap-y-12";
const STACK_CLASS = `flex w-full flex-col ${RHYTHM_GAP}`;

export const PAGE_CLASS = "min-h-screen pb-[calc(var(--dock-h,6rem)+2rem)]";
export const CONTAINER_CLASS =
  "relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 [overflow-anchor:none] sm:px-6 lg:px-8";

const overlapClass = (hasBackdrop: boolean) =>
  hasBackdrop
    ? "-mt-32 sm:-mt-48 lg:-mt-64 xl:-mt-72"
    : "pt-6 sm:pt-8 lg:pt-10";

export const COLUMNS_CLASS = `grid w-full grid-cols-1 items-start gap-x-8 ${RHYTHM_GAP_Y} lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] xl:grid-cols-[24rem_minmax(0,1fr)]`;

export const bodyClass = (hasBackdrop: boolean) =>
  `relative ${COLUMNS_CLASS} ${overlapClass(hasBackdrop)}`;

export const pageBodyClass = (hasBackdrop: boolean) =>
  `relative flex w-full flex-col ${RHYTHM_GAP} ${overlapClass(hasBackdrop)}`;

export const HEADER_CLASS =
  "relative flex w-full min-w-0 flex-col lg:col-start-2 lg:row-start-1";
export const ASIDE_CLASS =
  "w-full shrink-0 self-start lg:col-start-1 lg:row-span-2 lg:row-start-1";
export const MAIN_COLUMN_CLASS = `${STACK_CLASS} min-w-0 lg:col-start-2 lg:row-start-2`;
export const VIEW_CLASS = STACK_CLASS;

const HEADLINE_SIZES = [
  "text-7xl sm:text-8xl lg:text-9xl",
  "text-6xl sm:text-7xl lg:text-8xl",
  "text-5xl sm:text-6xl lg:text-7xl",
  "text-4xl sm:text-5xl lg:text-6xl",
] as const;
const HEADLINE_FACE = "font-zuume leading-none font-bold uppercase";

export const HEADLINE_BOX =
  "relative top-[calc(-0.14em-round(-0.14em,1px))] mt-[round(-0.14em,1px)] mb-[round(-0.16em,1px)] max-w-full";
export const HEADLINE_TYPE = `${HEADLINE_FACE} ${HEADLINE_SIZES[0]}`;

export function headlineClass(
  text: string,
  limits: readonly [number, number, number],
): string {
  const length = text.trim().length;
  const step = limits.findIndex((limit) => length <= limit);
  const size = HEADLINE_SIZES[step === -1 ? HEADLINE_SIZES.length - 1 : step];
  return `${HEADLINE_BOX} ${HEADLINE_FACE} ${size} text-balance [overflow-wrap:anywhere]`;
}

export const RULE_GAP = "mt-10 mb-6";
export const PROSE_BOX = "max-w-[62ch]";
export const PROSE_TYPE =
  "text-left text-base leading-7 sm:text-[17px] sm:leading-[30px]";
export const PROSE_CLASS = `${PROSE_BOX} ${PROSE_TYPE} text-pretty`;

export const SIDEBAR_CLASS =
  "grid grid-cols-1 items-start gap-x-8 gap-y-6 sm:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-1";
export const FACT_ROW_TYPE = "text-sm leading-5";

export const CAROUSEL_ITEM =
  "w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)]";
export const CAROUSEL_WIDE_ITEM = "w-full sm:w-[calc((100%-0.75rem)/2)]";

export const TONE = {
  arrows:
    "rounded-full bg-black/60 text-white ring-white/[0.08] shadow-[0_14px_32px_-16px_rgb(0_0_0/0.85)] backdrop-blur-md backdrop-saturate-150 inset-shadow-[0_1px_0_rgb(255_255_255/0.07)] hover:bg-black/75",
  chosen:
    "bg-[rgb(var(--grade)/0.16)] text-[rgb(var(--grade))] ring-1 ring-[rgb(var(--grade)/0.24)] ring-inset hover:bg-[rgb(var(--grade)/0.22)] hover:ring-[rgb(var(--grade)/0.32)]",
  label: "text-[11px] leading-4 font-semibold tracking-[0.14em] uppercase",
  rule: "bg-white/[0.06]",
  rules: "divide-white/[0.06]",
  surface:
    "bg-white/[0.06] text-white/70 ring-1 ring-white/[0.04] ring-inset hover:bg-white/10 hover:text-white hover:ring-white/[0.08]",
  tabs: "rounded-full [&_[data-pill]]:rounded-full [&_[role=tab]]:rounded-full",
} as const;
