"use client";

import {
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { Button, Icon } from "@/ui";
import { DeletePanel } from "./delete-panel";
import { EmailForm } from "./email-form";
import { MediaForm } from "./media-form";
import { PasskeysPanel } from "./passkeys-panel";
import { ProfileForm } from "./profile-form";
import { ProvidersPanel } from "./providers-panel";
import { SessionsPanel } from "./sessions-panel";
import { useSecurity } from "./use-security";

const SECTIONS = {
  "avatar-banner": { icon: "solar:gallery-bold", title: "Avatar & Banners" },
  account: { icon: "solar:user-circle-bold", title: "Account info" },
  email: { icon: "solar:letter-bold", title: "Email sign-in" },
  providers: { icon: "solar:link-bold", title: "Connected providers" },
  sessions: { icon: "solar:devices-bold", title: "Active sessions" },
  passkeys: { icon: "solar:key-bold", title: "Passkeys" },
  delete: { icon: "solar:trash-bin-trash-bold", title: "Delete account" },
} as const;

type Section = keyof typeof SECTIONS;
type SettingsKey = Section | "overview";

const OVERVIEW = { icon: "solar:settings-bold", title: "Account settings" };
const SECURITY_SECTIONS: readonly SettingsKey[] = [
  "passkeys",
  "providers",
  "sessions",
];

function Overview() {
  const { openSurface } = useDockActions();
  return (
    <div className="grid gap-2.5">
      {(Object.keys(SECTIONS) as Section[]).map((key) => (
        <Button
          className="group/item flex h-[52px] w-full cursor-pointer items-center gap-3 rounded-[16px] bg-white/[0.06] py-1.5 pr-4 pl-1.5 text-left ring-1 ring-inset ring-white/[0.04] hover:bg-white/10 hover:ring-white/[0.08]"
          key={key}
          onClick={() =>
            void openSurface(createAccountSettingsSurfaceEntry(key))
          }
        >
          <span className="center size-10 shrink-0 rounded-[10px] bg-white/[0.06] text-white/70 group-hover/item:bg-white/10 group-hover/item:text-white">
            <Icon
              className="ui-glyph center"
              icon={SECTIONS[key].icon}
              size={20}
            />
          </span>
          <span className="min-w-0 flex-1 text-sm leading-snug font-medium text-white">
            {SECTIONS[key].title}
          </span>
          <Icon
            className="center shrink-0 text-white/50 group-hover/item:translate-x-0.5 group-hover/item:text-white"
            icon="solar:alt-arrow-right-linear"
            size={16}
          />
        </Button>
      ))}
    </div>
  );
}

function AccountSettingsSurface({
  close,
  section,
}: {
  close?: () => void;
  section: SettingsKey;
}) {
  const security = useSecurity(SECURITY_SECTIONS.includes(section));
  const done = () => close?.();

  switch (section) {
    case "overview":
      return <Overview />;
    case "account":
      return <ProfileForm onSaved={done} />;
    case "avatar-banner":
      return <MediaForm onSaved={done} />;
    case "email":
      return <EmailForm />;
    case "providers":
      return (
        <ProvidersPanel
          identities={security.identities}
          reload={security.reload}
        />
      );
    case "sessions":
      return (
        <SessionsPanel
          loading={security.loading}
          reload={security.reload}
          sessions={security.sessions}
        />
      );
    case "passkeys":
      return (
        <PasskeysPanel
          loading={security.loading}
          passkeys={security.passkeys}
          reload={security.reload}
        />
      );
    case "delete":
      return <DeletePanel />;
  }
}

export function createAccountSettingsSurfaceEntry(
  section: SettingsKey = "overview",
): SurfaceEntry {
  const { icon, title } = section === "overview" ? OVERVIEW : SECTIONS[section];
  return {
    component: AccountSettingsSurface,
    icon,
    props: { section },
    title,
    width: section === "avatar-banner" ? 580 : undefined,
  };
}
