import { primitivesTheme } from "@/ui";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";

const DISABLED = "disabled:cursor-not-allowed disabled:opacity-50";
const LAYER = "col-start-1 row-start-1";
const FIELD_BOX = `w-full ${DISABLED}`;

export const primitivesThemeConfig = defineTheme(primitivesTheme, {
  slots: {
    adaptiveImage: `h-full w-full opacity-0 data-[fill]:absolute data-[fill]:inset-0 data-[fill]:select-none data-[state=loaded]:opacity-100`,
    adaptiveImageFallback: "relative h-full w-full overflow-hidden select-none",
    adaptiveImageFrame:
      "relative h-full w-full overflow-hidden bg-white/5 select-none",

    avatar:
      "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white/10 text-white/70 select-none",
    avatarFallback:
      "flex h-full w-full items-center justify-center text-xs font-medium uppercase",
    avatarImage: "h-full w-full object-cover",

    backdropHero:
      "relative isolate h-80 w-[calc(100%+2rem)] -translate-x-4 overflow-hidden sm:h-96 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(36rem,52vw,44rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32 xl:h-[clamp(40rem,56vw,48rem)] xl:w-[calc(100%+24rem)] xl:-translate-x-48",
    backdropHeroGradient: "pointer-events-none absolute inset-0 z-10",
    backdropHeroImage: "absolute inset-0 bg-cover bg-no-repeat",

    button:
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:aria-busy:cursor-wait disabled:aria-busy:opacity-100",

    input: FIELD_BOX,
    textarea: `block ${FIELD_BOX}`,

    loader: "shrink-0 leading-none select-none pointer-events-none",
    loaderInline: "inline-flex items-center justify-center",
    spinner:
      "inline-flex animate-spin items-center justify-center align-middle leading-none",
    stack: "inline-grid place-items-center",
    stackBase: `invisible select-none ${LAYER}`,
    stackTop: `center ${LAYER}`,

    selectCheck: "shrink-0 text-white",
    selectChevron:
      "cine-turn shrink-0 text-white/50 group-aria-expanded:rotate-180 group-aria-expanded:text-white",
    selectContent:
      "ui-motion absolute top-full left-0 mt-1.5 max-h-64 w-full overflow-y-auto overscroll-contain bg-[color-mix(in_oklab,var(--black),var(--white)_10%)] p-1 shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.12] ring-inset",
    selectEmpty: "px-3 py-2 text-center text-xs text-white/50",
    selectIcon: "ui-glyph shrink-0 text-white/70",
    selectOption: `flex cursor-pointer items-center justify-between gap-2.5 px-3 py-2 text-sm text-white/70 select-none data-[highlighted]:text-white aria-selected:font-medium aria-selected:text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-40`,
    selectOptionBody: "flex min-w-0 flex-col",
    selectOptionContent: "flex min-w-0 items-center gap-2.5",
    selectOptionDescription: "truncate text-xs text-white/50",
    selectPlaceholder: "truncate text-white/50",
    selectRoot: "relative inline-flex w-full flex-col gap-1.5",
    selectText: "truncate",
    selectTrigger: `cine-fade group flex w-full items-center justify-between gap-2 bg-white/5 px-3.5 py-2.5 text-left text-sm text-white ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:ring-white/10 aria-expanded:bg-white/10 aria-expanded:ring-white/[0.12] ${DISABLED}`,
    selectTriggerContent: "flex min-w-0 items-center gap-2 truncate",

    switch: `group/switch ui-still relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-white/[0.1] p-0.5 ring-1 ring-white/[0.06] ring-inset transition-[background-color,box-shadow,outline-color,outline-offset] duration-slow ease-out-cream hover:bg-white/[0.14] hover:ring-white/[0.1] data-[state=checked]:bg-white data-[state=checked]:ring-white data-[state=checked]:hover:bg-white/90 ${DISABLED}`,
    switchThumb: `pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-white/60 shadow-[0_1px_3px_rgb(0_0_0/0.35)] transition-[translate,width,background-color] duration-slow ease-out-cream group-hover/switch:bg-white/80 group-active/switch:w-6 data-[state=checked]:translate-x-4 data-[state=checked]:bg-black group-active/switch:data-[state=checked]:translate-x-3`,

    tooltip: "tooltip-content pointer-events-none select-none",
  },
  styles: {
    loaderInline: { height: "1em" },
    selectContent: { zIndex: Z_INDEX.SELECT },
    tooltip: { zIndex: Z_INDEX.TOOLTIP },
  },
});
