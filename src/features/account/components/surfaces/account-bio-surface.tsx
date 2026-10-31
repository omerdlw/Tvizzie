"use client";

import { type SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { SurfaceProse } from "@/ui";

const FALLBACK_BIO_TEXT = "No bio provided";
const DEFAULT_TITLE = "Account";

interface AccountBioData {
  account?: {
    username?: string;
    displayName?: string;
    display_name?: string;
    bio?: string | null;
    [key: string]: unknown;
  };
  profile?: {
    username?: string;
    displayName?: string;
    display_name?: string;
    bio?: string | null;
    [key: string]: unknown;
  };
  username?: string;
  displayName?: string;
  bio?: string | null;
  [key: string]: unknown;
}

export function createAccountBioSurfaceEntry(
  data: AccountBioData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  const account = data.account || data.profile || {};
  const username = data.username || account.username || "";

  const displayName = String(
    data.displayName ||
      account.displayName ||
      account.display_name ||
      username ||
      DEFAULT_TITLE,
  ).trim();

  const bio = data.bio ?? account.bio ?? "";

  return {
    component: AccountBioSurface,
    title: `${displayName} Bio`,
    props: { bio, data },
    ...config,
  };
}

interface AccountBioSurfaceProps {
  bio?: string | null;
  data?: AccountBioData;
}

function AccountBioSurface({ bio, data = {} }: AccountBioSurfaceProps) {
  const displayBio =
    bio ?? data.bio ?? (data.account || data.profile)?.bio ?? "";

  return <SurfaceProse text={displayBio || FALLBACK_BIO_TEXT} />;
}
