import { defineTheme } from "@omerdlw/base-framework/theme";
import { ambientTheme } from "@omerdlw/base-framework/modules/ambient";

export const ambientThemeConfig = defineTheme(ambientTheme, {
  slots: {
    transition: "",
  },
});
