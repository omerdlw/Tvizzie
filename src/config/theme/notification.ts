import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { notificationTheme } from "@omerdlw/base-framework/modules/notification";
import { notificationMotion } from "./motion/notification";

export const notificationThemeConfig = defineTheme(notificationTheme, {
  slots: {
    layer:
      "ui-motion pointer-events-none fixed inset-x-0 bottom-2 mx-auto flex w-full max-w-[380px] flex-col items-center justify-center px-4",
    toast:
      "pointer-events-auto flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-black/70 px-5 text-xs font-medium text-white ring-1 ring-white/[0.08] select-none ring-inset hover:bg-black/80 hover:ring-white/[0.12] inset-shadow-[0_1px_0_rgb(255_255_255/0.06)] shadow-[0_14px_32px_-16px_rgb(0_0_0/0.85)] backdrop-blur-lg",
    toastDocked: "absolute inset-x-0 top-[calc(100%+6px)] z-20",
    toastMessage: "truncate text-center text-xs font-medium text-white",
  },
  styles: {
    layer: { zIndex: Z_INDEX.NOTIFICATION },
  },
  motion: notificationMotion,
});
