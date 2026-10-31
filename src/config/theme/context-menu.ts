import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { contextMenuTheme } from "@omerdlw/base-framework/modules/context-menu";
import { contextMenuMotion } from "./motion/context-menu";

export const contextMenuThemeConfig = defineTheme(contextMenuTheme, {
  slots: {
    backdrop: "fixed inset-0",
    menu: "ui-motion max-w-sm min-w-64 overflow-hidden rounded-[24px] bg-black/80 ring-1 ring-white/[0.08] ring-inset inset-shadow-[0_1px_0_rgb(255_255_255/0.07)] shadow-[0_24px_64px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl backdrop-saturate-150",
    header: "mb-2 flex items-center gap-3 border-b border-white/[0.06] pb-2",
    headerIcon:
      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[16px] ring-1 ring-inset ring-white/[0.08] bg-white/[0.06] bg-cover bg-center bg-no-repeat text-white/70",
    headerText: "h-full w-full min-w-0 space-y-0.5",
    headerEyebrow:
      "text-[11px] font-medium tracking-[0.08em] text-white/45 uppercase",
    headerTitle: "truncate text-sm leading-tight font-semibold text-white",
    headerDescription: "text-xs leading-snug text-white/70",
    separator: "mx-3 my-1.5 h-px bg-white/[0.06]",
    item: "group flex h-10 w-full items-center gap-2.5 rounded-[16px] px-3 text-left text-sm font-medium text-white/75 hover:bg-white/[0.08] hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white disabled:pointer-events-none disabled:opacity-50",
    itemIcon: "ui-glyph shrink-0 text-white/50 group-hover:text-white/80",
    itemLabel: "grow truncate",
    itemShortcut:
      "ml-2 shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/50 uppercase ring-1 ring-white/[0.06] ring-inset",
  },
  styles: {
    backdrop: { zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP },
    menu: { padding: 8, zIndex: Z_INDEX.CONTEXT_MENU },
  },
  motion: contextMenuMotion,
});
