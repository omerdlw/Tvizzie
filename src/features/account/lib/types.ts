export interface PublicAccount {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bannerPosition: string | null;
  bannerUrl: string | null;
  bio: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  isPrivate: boolean;
  username: string;
}

export interface CurrentAccount extends PublicAccount {
  email: string | null;
}

export interface AccountPatchInput {
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  bannerPosition?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  displayName?: string;
  isPrivate?: boolean | string;
  username?: string;
}

export interface NormalizedAccountPatch {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bannerPosition: string | null;
  bannerUrl: string | null;
  bio: string | null;
  displayName: string;
  isPrivate: boolean;
  username: string;
}

export interface AccountState {
  account: CurrentAccount | null;
  error: unknown;
  isLoading: boolean;
}

export interface AccountContextValue extends AccountState {
  refresh: () => Promise<void>;
}
