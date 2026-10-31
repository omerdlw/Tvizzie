"use client";

import { defineThemeSpec } from "@omerdlw/base-framework/theme";

type PrimitivesThemeSlot =
  | "adaptiveImage"
  | "adaptiveImageFallback"
  | "adaptiveImageFrame"
  | "avatar"
  | "avatarFallback"
  | "avatarImage"
  | "backdropHero"
  | "backdropHeroGradient"
  | "backdropHeroImage"
  | "button"
  | "input"
  | "loader"
  | "loaderInline"
  | "selectCheck"
  | "selectChevron"
  | "selectContent"
  | "selectEmpty"
  | "selectIcon"
  | "selectOption"
  | "selectOptionBody"
  | "selectOptionContent"
  | "selectOptionDescription"
  | "selectPlaceholder"
  | "selectRoot"
  | "selectText"
  | "selectTrigger"
  | "selectTriggerContent"
  | "spinner"
  | "stack"
  | "stackBase"
  | "stackTop"
  | "switch"
  | "switchThumb"
  | "textarea"
  | "tooltip";

export const primitivesTheme =
  defineThemeSpec<PrimitivesThemeSlot>("primitives");
