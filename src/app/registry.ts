import { createElement } from "react";
import type { AppRegistryEntry } from "@omerdlw/base-framework/kernel";
import { project } from "@/config/project";
import { DEFAULT_ACCOUNT_ICON } from "@/features/account";
import { Logo } from "@/ui";

export const APP_REGISTRY_ENTRIES: readonly AppRegistryEntry[] = Object.freeze([
  {
    type: "dock",
    items: {
      "/": {
        description: project.description,
        icon: createElement(Logo, { size: 22 }),
        name: "home",
        title: "Guffin - Home",
        path: "/",
      },
      "/oscars": {
        description: "Every Best Picture winner, cast in gold",
        icon: "solar:cup-star-bold",
        name: "oscars",
        title: "Best Picture",
        path: "/oscars",
      },
      "/top-100": {
        description: "The IMDb Top 100 on one wall",
        icon: "solar:gallery-bold",
        name: "top-100",
        title: "IMDb Top 100",
        path: "/top-100",
      },
      "/directors": {
        description: "Ten masters, drawn from their films",
        icon: "solar:videocamera-record-bold",
        name: "directors",
        title: "Directors",
        path: "/directors",
      },
      "/account": {
        description: "Manage your account",
        icon: DEFAULT_ACCOUNT_ICON,
        name: "account",
        title: "Account",
        path: "/account",
      },
    },
  },
]);
