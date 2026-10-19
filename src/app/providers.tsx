"use client";

import type { JSX, ReactNode } from "react";
import { Compose } from "@omerdlw/base-framework/kernel";
import { ambientModule } from "@omerdlw/base-framework/modules/ambient";
import { contextMenuModule } from "@omerdlw/base-framework/modules/context-menu";
import { controlsModule } from "@omerdlw/base-framework/modules/controls";
import { dockModule } from "@omerdlw/base-framework/modules/dock";
import { modalModule } from "@omerdlw/base-framework/modules/modal";
import { notificationModule } from "@omerdlw/base-framework/modules/notification";
import { ThemeProvider } from "@omerdlw/base-framework/theme";
import { CoreProvider } from "@omerdlw/base-framework/provider";
import type { AppRegistryEntry } from "@omerdlw/base-framework/kernel";
import { AuthProvider, AuthListener } from "@/features/auth";
import {
  AccountProvider,
  AccountGuard,
  SocialRealtimeSync,
} from "@/features/account";
import { PictureForesight } from "@/features/artwork";
import { SearchDockCommand } from "@/features/search";
import { SmoothScrollProvider } from "@/motion";
import { Carry, Cursor } from "@/motion/film";
import { motion, themes } from "@config";
import { APP_REGISTRY_ENTRIES } from "./registry";

// Each module comes from its own subpath. The "/modules" barrel bundles every
// module, so importing it next to "/modules/dock" shipped the dock twice.
// Background, loading and media are left out: nothing here registers them.
const MODULES = Object.freeze([
  ambientModule,
  dockModule,
  controlsModule,
  contextMenuModule,
  modalModule,
  notificationModule,
]);

interface ProvidersProps {
  children: ReactNode;
  registryEntries?: readonly AppRegistryEntry[];
}

export function Providers({
  children,
  registryEntries = APP_REGISTRY_ENTRIES,
}: ProvidersProps): JSX.Element {
  return (
    <Compose
      providers={[
        AuthProvider,
        AccountProvider,
        [ThemeProvider, { motion, themes }],
        [CoreProvider, { modules: MODULES, registryEntries }],
      ]}
    >
      <AuthListener />
      <AccountGuard />
      <SearchDockCommand />
      <SocialRealtimeSync />
      <PictureForesight />
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
      <Carry />
      <Cursor />
    </Compose>
  );
}
