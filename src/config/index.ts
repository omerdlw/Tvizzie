import { ambientThemeConfig } from "./theme/ambient";
import { backgroundThemeConfig } from "./theme/background";
import { errorThemeConfig } from "./theme/error";
import { primitivesThemeConfig } from "./theme/primitives";
import { contextMenuThemeConfig } from "./theme/context-menu";
import { controlsThemeConfig } from "./theme/controls";
import { dockThemeConfig } from "./theme/dock";
import { loadingThemeConfig } from "./theme/loading";
import { modalThemeConfig } from "./theme/modal";
import { notificationThemeConfig } from "./theme/notification";

export const themes = Object.freeze([
  errorThemeConfig,
  primitivesThemeConfig,
  ambientThemeConfig,
  backgroundThemeConfig,
  contextMenuThemeConfig,
  controlsThemeConfig,
  dockThemeConfig,
  loadingThemeConfig,
  modalThemeConfig,
  notificationThemeConfig,
]);
