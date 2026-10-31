import { UserError } from "@omerdlw/base-framework/utils";
import type { Database } from "@/infrastructure/supabase/client";
import { USERNAME_PATTERN } from "./constants";
import type {
  AccountPatchInput,
  CurrentAccount,
  NormalizedAccountPatch,
  PublicAccount,
} from "./types";

type AccountRow = Pick<
  Database["public"]["Tables"]["accounts"]["Row"],
  | "avatar_url"
  | "background_url"
  | "banner_position"
  | "banner_url"
  | "bio"
  | "created_at"
  | "display_name"
  | "id"
  | "is_private"
  | "username"
>;

export function toPublicAccount(row: AccountRow): PublicAccount {
  return {
    avatarUrl: row.avatar_url || null,
    backgroundUrl: row.background_url || null,
    bannerPosition: row.banner_position || null,
    bannerUrl: row.banner_url || null,
    bio: row.bio || null,
    createdAt: row.created_at,
    displayName: row.display_name ?? "",
    id: row.id,
    isPrivate: row.is_private,
    username: row.username ?? "",
  };
}

export function toCurrentAccount(
  row: AccountRow,
  email: string | null,
): CurrentAccount {
  return { ...toPublicAccount(row), email };
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function normalizeUsername(value: unknown): string {
  const username = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!USERNAME_PATTERN.test(username)) {
    throw new UserError(
      "Username must be 3-30 characters and contain letters, numbers, _ or -",
    );
  }
  return username;
}

export function readAccountPatchField<K extends keyof AccountPatchInput, F>(
  input: AccountPatchInput | undefined,
  field: K,
  fallback: F,
): Exclude<AccountPatchInput[K], undefined> | F {
  const value = input?.[field];
  return value !== undefined
    ? (value as Exclude<AccountPatchInput[K], undefined>)
    : fallback;
}

export function normalizeAccountPatch(
  input: AccountPatchInput = {},
): NormalizedAccountPatch {
  const rawDisplayName = readAccountPatchField(input, "displayName", "");
  const displayName = normalizeText(rawDisplayName, 80);
  if (!displayName) throw new UserError("Display name is required");

  const rawAvatarUrl = readAccountPatchField(input, "avatarUrl", null);
  const rawBannerUrl = readAccountPatchField(input, "bannerUrl", null);
  const rawBackgroundUrl = readAccountPatchField(input, "backgroundUrl", null);
  const rawBannerPosition = readAccountPatchField(
    input,
    "bannerPosition",
    null,
  );
  const rawBio = readAccountPatchField(input, "bio", null);
  const rawIsPrivate = readAccountPatchField(input, "isPrivate", false);

  return {
    avatarUrl: normalizeText(rawAvatarUrl, 2048) || null,
    backgroundUrl: normalizeText(rawBackgroundUrl, 2048) || null,
    bannerPosition: normalizeText(rawBannerPosition, 64) || null,
    bannerUrl: normalizeText(rawBannerUrl, 2048) || null,
    bio: normalizeText(rawBio, 500) || null,
    displayName,
    isPrivate: rawIsPrivate === true || rawIsPrivate === "on",
    username: normalizeUsername(input.username),
  };
}
