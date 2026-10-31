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
import { AuthProvider, AuthListener } from "@/features/auth";
import {
  AccountProvider,
  AccountGuard,
  SocialRealtimeSync,
} from "@/features/account";
import { PictureForesight } from "@/features/artwork";
import { SearchDockCommand } from "@/features/search";
import { SmoothScrollProvider } from "@/motion/scroll";
import { Carry, Cursor } from "@/motion/film";
import { motion, themes } from "@/config";
import { APP_REGISTRY_ENTRIES } from "./registry";

const MODULES = Object.freeze([
  ambientModule,
  dockModule,
  controlsModule,
  contextMenuModule,
  modalModule,
  notificationModule,
]);

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Compose
      providers={[
        AuthProvider,
        AccountProvider,
        [ThemeProvider, { motion, themes }],
        [
          CoreProvider,
          { modules: MODULES, registryEntries: APP_REGISTRY_ENTRIES },
        ],
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
