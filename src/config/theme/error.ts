import { errorTheme } from "@omerdlw/base-framework/error";
import { defineTheme } from "@omerdlw/base-framework/theme";

export const errorThemeConfig = defineTheme(errorTheme, {
  slots: {
    screen:
      "ui-motion w-screen h-screen flex flex-col gap-2.5 center bg-red-500/10",
    icon: "bg-white/[0.06] text-white flex size-12 items-center justify-center rounded-full ring-1 ring-inset ring-white/[0.08] text-xl font-bold",
    title: "text-lg font-semibold",
    retryButton:
      "ui-sheen h-10 bg-red-900/50 cursor-pointer hover:bg-white hover:text-black px-5 text-[13px] font-medium text-white rounded-full [--sheen-ink:0_0_0]",
  },
});
