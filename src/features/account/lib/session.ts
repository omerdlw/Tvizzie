import type { User } from "@supabase/supabase-js";
import { isImageIconSource } from "@omerdlw/base-framework/utils";
import type { CurrentAccount } from "./types";

const STORAGE_KEY = "dock_last_known_account_v2";

interface KnownAccount {
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
  id: string | null;
  username: string | null;
}

function sessionStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveLastKnownAccount(account: CurrentAccount): void {
  const known: KnownAccount = {
    avatarUrl: account.avatarUrl,
    displayName: account.displayName || null,
    email: account.email,
    id: account.id,
    username: account.username || null,
  };
  try {
    sessionStore()?.setItem(STORAGE_KEY, JSON.stringify(known));
  } catch {}
}

export function clearLastKnownAccount(): void {
  try {
    sessionStore()?.removeItem(STORAGE_KEY);
  } catch {}
}

function readLastKnownAccount(userId: string | null): KnownAccount | null {
  const store = sessionStore();
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const known = JSON.parse(raw) as KnownAccount;
    if (userId && known.id && known.id !== userId) {
      store?.removeItem(STORAGE_KEY);
      return null;
    }
    return known;
  } catch {
    return null;
  }
}

export function signedInStatus({
  account,
  user,
}: {
  account: CurrentAccount | null;
  user: User | null;
}): { description: string; icon: string; title: string } {
  const cached = readLastKnownAccount(user?.id ?? null);
  const metadata = user?.user_metadata ?? {};
  const username = (account?.username || cached?.username || "")
    .trim()
    .replace(/^@+/, "");
  const handle = username ? `@${username}` : "";
  const email = user?.email || account?.email || cached?.email;

  const title =
    String(
      account?.displayName ||
        metadata.displayName ||
        metadata.display_name ||
        metadata.full_name ||
        metadata.name ||
        cached?.displayName ||
        "",
    ).trim() ||
    username ||
    email ||
    "Account";

  const sameAsTitle =
    title.toLowerCase() === handle.toLowerCase() ||
    title.toLowerCase() === username.toLowerCase();
  const description = handle && !sameAsTitle ? handle : "Signed in";

  const avatar = (account?.avatarUrl || cached?.avatarUrl || "").trim();
  const icon =
    avatar && isImageIconSource(avatar) ? avatar : "solar:login-2-bold";

  return { description, icon, title };
}
