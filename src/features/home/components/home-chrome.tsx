"use client";

import { usePage } from "@omerdlw/base-framework/kernel";
import { SearchAction } from "@/features/search";
import { SEARCH_PLACEHOLDER_DESCRIPTION } from "@/features/search/lib/constants";
import { project } from "@config/project";

export function HomeChrome(): null {
  usePage({
    title: project.name,
    dock: {
      action: SearchAction,
      description: SEARCH_PLACEHOLDER_DESCRIPTION,
      icon: "solar:home-2-bold",
      name: "home",
    },
  });
  return null;
}
