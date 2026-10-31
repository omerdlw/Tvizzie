import type { CSSProperties } from "react";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { dockTheme } from "@omerdlw/base-framework/modules/dock";
import { dockMotion } from "./motion/dock";

const toLeft = (gradient: string) =>
  gradient
    .replaceAll("to right", "to left")
    .replace(/at (\d+)%/g, (_, x) => `at ${100 - Number(x)}%`);

const BANNER_SHARP_MASK =
  "radial-gradient(ellipse 72% 170% at 82% 42%, black 0%, black 32%, rgba(0,0,0,0.7) 52%, rgba(0,0,0,0.25) 74%, transparent 100%), linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, black 28%, black 72%, rgba(0,0,0,0.7) 100%), linear-gradient(to right, black 0%, black 68%, rgba(0,0,0,0.55) 100%)";

const BANNER_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 45%), linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 28%, rgba(0,0,0,0.1) 52%, transparent 66%, rgba(0,0,0,0.12) 76%, rgba(0,0,0,0.38) 100%)";

const SHELL = "rounded-[26px]";
const INNER = "rounded-[16px]";

const GLASS =
  "bg-black/70 ring-1 ring-inset ring-white/[0.08] inset-shadow-[0_1px_0_rgb(255_255_255/0.07)] shadow-[0_30px_70px_-30px_rgb(0_0_0/0.9),0_10px_24px_-14px_rgb(0_0_0/0.7)]";

const FLOAT =
  "bg-black/70 ring-1 ring-inset ring-white/[0.08] inset-shadow-[0_1px_0_rgb(255_255_255/0.06)] shadow-[0_14px_32px_-16px_rgb(0_0_0/0.85)] backdrop-blur-lg";

const CONTROL_BUTTON = `ui-iris center relative size-9 shrink-0 cursor-pointer text-white/70 hover:text-white ${FLOAT}`;

const FILL =
  "bg-white/[0.06] ring-1 ring-inset ring-white/[0.04] hover:bg-white/10 hover:ring-white/[0.08]";

const MEDIA_ICON_BUTTON = `ui-iris center relative size-8 cursor-pointer rounded-full text-white/70 hover:text-white ${FILL}`;

const TONE_MUTED = `text-white/75 hover:text-white ${FILL}`;
const TONE_ACTIVE =
  "bg-white text-black ring-1 ring-inset ring-white hover:bg-white/90 [--sheen-ink:0_0_0] [--sheen:0.08]";
const SURFACE = "bg-black/70 ring-1 ring-inset ring-white/[0.08]";

export const dockThemeConfig = defineTheme(dockTheme, {
  slots: {
    stack:
      "dock-root ui-motion @container fixed inset-x-0 bottom-1 mx-auto touch-manipulation select-none",
    backdrop: "fixed inset-0 cursor-pointer bg-black/60 backdrop-blur-sm",

    card: [
      `group @container absolute h-auto w-full overflow-hidden ${SHELL} p-2.5 backdrop-blur-md backdrop-saturate-150 cursor-pointer ${GLASS}`,
      "data-[anchored=true]:cursor-default data-[blur=heavy]:backdrop-blur-lg data-[shelf=true]:px-[6.5px] data-[shelf=true]:py-0",
      "data-[placement=top]:inset-0 data-[placement=top]:h-full data-[placement=bottom]:bottom-0 data-[placement=float]:top-0",
      "data-[ghost=true]:pointer-events-none data-[ghost=true]:select-none",
    ].join(" "),
    cardContent:
      "flow-root w-full overflow-hidden data-[shelf=true]:min-h-[96px]",
    cardSurface: `w-full overflow-hidden ${INNER}`,
    cardShelf: "relative flex h-[45px] w-full items-center justify-between",
    cardStandard: "w-full",
    cardHud: "relative flex w-full items-center justify-between",
    cardBody: "relative flex h-auto w-full flex-col gap-2.5",
    cardFooter: "relative w-full overflow-visible",
    cardAction: "flow-root overflow-visible",

    bannerRoot:
      "pointer-events-none absolute inset-0 overflow-hidden select-none",
    bannerSharpImage: "absolute inset-0",
    bannerScrim: "pointer-events-none absolute inset-0",

    header: "relative min-h-[48px] w-full",
    headerRow: "relative flex w-full items-center gap-2.5",
    headerIcon: "center relative shrink-0",
    headerIconEmpty: "size-12",
    headerBody:
      "relative flex w-full flex-1 items-center justify-between gap-2.5 overflow-hidden",
    headerText:
      "flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5",
    headerTitleRow: "flex items-center gap-1.5",
    headerTitle: "text-[15px] tracking-[-0.01em]",
    title: "truncate font-semibold",
    titleWrap: "relative overflow-hidden",
    description: "relative min-h-[1.25rem] w-full overflow-hidden text-sm",
    descriptionText:
      "text-white/60 data-[multiline=false]:truncate data-[multiline=true]:wrap-break-word data-[multiline=true]:whitespace-normal",

    icon: "relative size-12 shrink-0",
    iconMotion: "size-full",
    iconImage: `size-12 shrink-0 ${INNER} bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-white/[0.06]`,
    iconGlyph: `center size-12 shrink-0 ${INNER} text-white ${FILL}`,
    iconGlyphInner: "center shrink-0",
    iconButton: "size-full cursor-pointer p-0 focus:outline-none select-none",
    iconBadge:
      "center absolute -end-1 -bottom-1 size-6 overflow-hidden rounded-full bg-black text-[11px] leading-none font-bold tabular-nums text-white",
    iconOverlay:
      "center absolute -end-1.5 -bottom-1.5 size-6 overflow-hidden rounded-full data-[interactive=false]:cursor-default data-[interactive=true]:cursor-pointer",
    iconOverlayImage:
      "size-full rounded-full bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-white/10",
    iconOverlayGlyph: "center text-white",

    commandBar: "flex shrink-0 items-center",
    commandTooltip:
      "dock-tooltip rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90 shadow-[0_14px_32px_-16px_rgb(0_0_0/0.85)] ring-1 ring-white/[0.07] backdrop-blur-xl backdrop-saturate-150 ring-inset inset-shadow-[0_1px_0_rgb(255_255_255/0.06)]",
    command:
      "ui-iris center relative size-9 cursor-pointer rounded-full bg-transparent text-white/60 hover:text-white select-none data-[banner=true]:[--iris:rgb(255_255_255/0.1)] data-[banner=true]:before:backdrop-blur-md",
    commandBadge:
      "center bg-white absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] leading-none font-semibold tabular-nums text-black",

    statusCard: SURFACE,
    statusIcon: "bg-white/[0.06] text-white",
    statusTitle: "text-white",
    statusDescription: "text-white/70",

    surfaceHost: `@container relative w-full overflow-hidden ${INNER}`,
    surfaceHostInner: "w-full",
    surfaceShell: `@container relative flex flex-col overflow-hidden ${INNER}`,
    surfaceBody: `@container w-full overflow-hidden ${INNER}`,

    controls:
      "pointer-events-none absolute inset-x-0 bottom-[calc(100%+12px)] select-none flex items-center justify-center gap-1",
    controlAction:
      "pointer-events-auto flex shrink-0 items-center overflow-hidden",
    controlBack: "pointer-events-auto shrink-0 overflow-hidden",
    controlClose: "pointer-events-auto shrink-0",
    controlButton: CONTROL_BUTTON,
    controlBackIcon: "rtl:rotate-180",
    controlHeaderButton: `pointer-events-auto ${CONTROL_BUTTON} disabled:opacity-50 disabled:pointer-events-none data-[text=true]:h-9 data-[text=true]:px-4 data-[text=true]:text-[13px] data-[text=true]:font-medium data-[text=true]:whitespace-nowrap`,
    controlRadiusSingle: "rounded-full",
    controlRadiusFirst: "rounded-full",
    controlRadiusLast: "rounded-full",
    controlRadiusMiddle: "rounded-full",

    extensions:
      "relative flex h-full w-full items-center justify-between select-none",
    extensionsLeft:
      "pointer-events-auto flex h-full shrink-0 items-center justify-start gap-1 data-[fill=true]:w-full data-[fill=true]:min-w-0 data-[fill=true]:flex-1",
    extensionsCenterLayer:
      "pointer-events-none absolute inset-0 flex items-center justify-center",
    extensionsCenter:
      "pointer-events-auto flex items-center justify-center gap-1 data-[fill=true]:w-full",
    extensionsRight:
      "pointer-events-auto ms-auto flex h-full shrink-0 items-center justify-end gap-1",
    extensionPill:
      "pointer-events-auto flex min-h-6 h-full max-w-full items-center gap-1 select-none data-[fill=true]:w-full data-[fill=true]:min-w-0 data-[fill=true]:flex-1 data-[fill=true]:justify-center",
    extensionBare:
      "pointer-events-auto data-[fill=true]:w-full data-[fill=true]:min-w-0 data-[fill=true]:flex-1",

    scrubber:
      "group absolute inset-x-0 top-0 h-3 cursor-pointer touch-none overflow-hidden rounded-t-[26px] select-none",
    scrubberTrack:
      "absolute inset-x-0 top-0 h-1 w-full origin-top scale-y-[0.625] transform-gpu bg-white/10",
    scrubberProgress:
      "h-full w-full origin-left bg-white/70 group-hover:bg-white",
    scrubberTooltip:
      "pointer-events-none absolute top-3 -translate-x-1/2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium tabular-nums text-white/90 ring-1 ring-white/[0.07] backdrop-blur-xl ring-inset",

    media: "flex w-full items-center justify-between gap-2 select-none",
    mediaGroup: "flex items-center gap-1.5",
    mediaSpeed: `center h-8 cursor-pointer rounded-full px-3.5 text-xs font-medium tabular-nums text-white/70 select-none hover:text-white data-[active=true]:bg-white data-[active=true]:text-black data-[active=true]:ring-white ${FILL}`,
    mediaSkip: MEDIA_ICON_BUTTON,
    mediaToggle: `flex size-8 cursor-pointer items-center justify-center rounded-full text-white/70 select-none hover:text-white data-[active=true]:bg-white data-[active=true]:text-black data-[active=true]:ring-white ${FILL}`,
    mediaMute:
      "center size-5 cursor-pointer p-0 text-white/70 hover:text-white",
    mediaVolume: `group flex h-8 items-center gap-1.5 rounded-full px-3 select-none data-[active=true]:bg-white/10 ${FILL}`,
    mediaVolumeTrack:
      "group/track relative flex h-6 w-16 cursor-pointer touch-none items-center select-none sm:w-20",
    mediaVolumeRail:
      "relative h-1.5 w-full overflow-hidden rounded-full bg-white/10",
    mediaVolumeFill: "h-full origin-left rounded-full bg-white",
    mediaVolumeThumb:
      "ui-fade pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md group-hover/track:opacity-100 data-[active=true]:opacity-100",

    breadcrumbs: `absolute inset-x-0 top-[calc(100%+6px)] flex h-10 w-full items-center justify-center rounded-full px-5 text-xs select-none ${FLOAT}`,
    breadcrumbsNav: "flex scrollbar-none items-center gap-1.5 overflow-x-auto",
    breadcrumbsEllipsis: "px-0.5 text-white/50 select-none",
    breadcrumbsItem: "flex items-center gap-1.5",
    breadcrumbsCurrent: "max-w-[180px] truncate font-medium text-white",
    breadcrumbsLink: "max-w-[140px] truncate text-white/70 hover:text-white",
    breadcrumbsSeparator: "center shrink-0 text-white/50 rtl:rotate-180",

    loading: "flex min-h-[48px] w-full items-center gap-2.5",
    loadingIcon: `skeleton-block size-12 shrink-0 ${INNER}`,
    loadingText: "flex min-w-0 flex-1 flex-col justify-center gap-1.5",
    loadingTitle: "skeleton-block h-3.5 w-36 max-w-[60%] rounded-full",
    loadingDescription: "skeleton-block h-3 w-56 max-w-[85%] rounded-full",

    action: `ui-sheen center h-10 w-full ${INNER} gap-2 px-4 text-[13px] font-medium tracking-[-0.005em] cursor-pointer select-none`,
    actionActive: TONE_ACTIVE,
    actionFill: "min-w-0 flex-1 justify-center whitespace-nowrap",
    actionLabel: "truncate",
    actionMuted: TONE_MUTED,
    actionRow: "flex w-full items-center gap-2.5",
    actionStack: "flex flex-col gap-2.5",
    actionSurface: SURFACE,
  },
  styles: {
    stack: {
      zIndex: Z_INDEX.DOCK,
      maxWidth: "100vw",
      contain: "layout",
      borderRadius: 26,
    },
    backdrop: { zIndex: Z_INDEX.DOCK_BACKDROP },
    cardFooter: { zIndex: Z_INDEX.DOCK_CARD_CONTENT },
    bannerRoot: { zIndex: Z_INDEX.DOCK_CARD_BACKGROUND },
    bannerSharpImage: {
      "--dock-banner-mask-ltr": BANNER_SHARP_MASK,
      "--dock-banner-mask-rtl": toLeft(BANNER_SHARP_MASK),
    } as CSSProperties,
    bannerScrim: {
      "--dock-banner-scrim-ltr": BANNER_SCRIM,
      "--dock-banner-scrim-rtl": toLeft(BANNER_SCRIM),
    } as CSSProperties,
    iconBadge: { zIndex: Z_INDEX.DOCK_CARD_BADGE },
    iconOverlay: { zIndex: Z_INDEX.DOCK_CARD_BADGE },
    scrubber: { zIndex: Z_INDEX.DOCK_CARD_MEDIA },
    controls: { zIndex: Z_INDEX.DOCK_SURFACE_POPOVER },
    controlButton: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    controlHeaderButton: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    extensionsLeft: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    extensionsCenterLayer: { zIndex: Z_INDEX.DOCK_SURFACE_CENTER },
    extensionsRight: { zIndex: Z_INDEX.DOCK_SURFACE_CONTROL },
    breadcrumbs: { zIndex: Z_INDEX.DOCK_BREADCRUMBS },
  },
  motion: dockMotion,
});
