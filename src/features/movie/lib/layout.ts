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

export const POSTER_ROW_ITEM =
  "w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)]";

const TITLE_SIZES = [
  "text-7xl sm:text-8xl lg:text-9xl",
  "text-6xl sm:text-7xl lg:text-8xl",
  "text-5xl sm:text-6xl lg:text-7xl",
  "text-4xl sm:text-5xl lg:text-6xl",
] as const;
const TITLE_LIMITS = [26, 37, 49] as const;

const TITLE_SIZE_DEFAULT = TITLE_SIZES[0];

function titleSize(text: string): string {
  const length = text.trim().length;
  const step = TITLE_LIMITS.findIndex((limit) => length <= limit);
  return TITLE_SIZES[step === -1 ? TITLE_SIZES.length - 1 : step];
}

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

export const TITLE_BOX =
  "relative top-[calc(-0.14em-round(-0.14em,1px))] mt-[round(-0.14em,1px)] mb-[round(-0.16em,1px)] max-w-full";
const TITLE_FACE = "font-zuume leading-none font-bold uppercase";
export const TITLE_TYPE = `${TITLE_FACE} ${TITLE_SIZE_DEFAULT}`;
export const titleClass = (title: string) =>
  `${TITLE_BOX} ${TITLE_FACE} ${titleSize(title)} text-balance [overflow-wrap:anywhere]`;

export const RULE_GAP = "mt-10 mb-6";
export const TAGLINE_TYPE =
  "text-sm leading-5 sm:text-[15px] sm:leading-[22px]";
export const TAGLINE_CLASS = `${TAGLINE_TYPE} font-medium tracking-[0.12em] uppercase text-balance`;
export const OVERVIEW_BOX = "max-w-[62ch]";
export const OVERVIEW_TYPE =
  "text-left text-base leading-7 sm:text-[17px] sm:leading-[30px]";
export const OVERVIEW_CLASS = `${OVERVIEW_BOX} ${OVERVIEW_TYPE} text-pretty`;
export const AFTER_TAGLINE = "mt-4";

export const SIDEBAR_CLASS =
  "grid grid-cols-1 items-start gap-x-8 gap-y-6 sm:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-1";
export const SIDEBAR_FACTS_CLASS =
  "flex flex-col gap-6 sm:col-start-2 lg:contents";
export const FACT_ROW_TYPE = "text-sm leading-5";

export const GALLERY_BACKDROP_ITEM = "w-full sm:w-[calc((100%-0.75rem)/2)]";
