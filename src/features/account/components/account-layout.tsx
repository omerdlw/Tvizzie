"use client";

import { useState, type ReactNode } from "react";

import { AdaptiveImage, BackdropHero, Icon } from "@/ui";
import {
  CinemaTitle,
  HeroStage,
  Reveal,
  RowItem,
  Scene,
  SceneBody,
} from "@/motion/cinema";
import {
  applyAvatarFallback,
  getInitial,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../lib/avatar";
import { SOCIAL_EVENTS } from "../lib/constants";
import type { PublicAccount } from "../lib/types";
import { SCENE } from "../lib/motion";
import { AvatarStage } from "./account-avatar";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import {
  useAmbientTheme,
  type AmbientPalette,
} from "@omerdlw/base-framework/modules/ambient";
import { useNavigationPayload } from "@omerdlw/base-framework/modules/navigation";
import { createAccountSocialSurfaceEntry } from "./surfaces/account-social-surface";
import { ProfileStatButton, ProfileStatRow } from "./browse/profile-stats";
import { accountHref } from "@/config/routes";

const DEFAULT_DISPLAY_NAME = "Account";

const JOIN_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

const AVATAR_CLASSES =
  "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/60 text-3xl font-semibold text-white shadow-2xl ring-2 ring-white/10 select-none sm:size-24 sm:text-4xl";

const CONTAINER = "mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8";

export type AccountData = PublicAccount;

function formatJoinDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : JOIN_DATE_FORMATTER.format(date);
}

function resolveAccountBackdropUrl(
  profile?: AccountData | null,
): string | null {
  const background = profile?.backgroundUrl?.trim() ?? "";
  if (!background) return null;
  return /^(https?:\/\/|\/|data:image\/)/.test(background) ? background : null;
}

function getAccountDisplayName(account?: AccountData | null): string {
  return account?.displayName || account?.username || DEFAULT_DISPLAY_NAME;
}

function useSocialFollowSync(
  accountId?: string | null,
  initialCount = 0,
  initialStatus = false,
) {
  const [isFollower, setIsFollower] = useState(initialStatus);
  const [prevAccountId, setPrevAccountId] = useState(accountId);
  const [prevInitialStatus, setPrevInitialStatus] = useState(initialStatus);
  const [prevInitialCount, setPrevInitialCount] = useState(initialCount);
  const [baseCount, setBaseCount] = useState(initialCount);

  if (accountId !== prevAccountId) {
    setPrevAccountId(accountId);
    setPrevInitialStatus(initialStatus);
    setPrevInitialCount(initialCount);
    setIsFollower(initialStatus);
    setBaseCount(initialCount);
  } else {
    if (initialStatus !== prevInitialStatus) {
      setPrevInitialStatus(initialStatus);
      setIsFollower(initialStatus);
    }
    if (initialCount !== prevInitialCount) {
      setPrevInitialCount(initialCount);
      setBaseCount(initialCount);
    }
  }

  useGlobalEvent(accountId ? SOCIAL_EVENTS.FOLLOW_CHANGE : null, (payload) => {
    if (payload.followingId === accountId) {
      setIsFollower(payload.status === "accepted");
    }
  });

  const delta = isFollower === prevInitialStatus ? 0 : isFollower ? 1 : -1;
  const followersCount = Math.max(0, baseCount + delta);

  return {
    followersCount,
    isFollower,
  };
}

interface AccountBackdropHeroProps {
  image?: string | null;
}

function AccountBackdropHero({ image }: AccountBackdropHeroProps) {
  return (
    <HeroStage>
      <BackdropHero
        image={image}
        position="center 25%"
        className="lg:h-[clamp(28rem,40vw,34rem)] xl:h-[clamp(30rem,42vw,36rem)]"
      />
    </HeroStage>
  );
}

function PrivateLockedView() {
  return (
    <div className="flex min-h-56 w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center rounded-[24px] ring-1 ring-white/10 ring-inset">
      <span className="center size-11 rounded-full bg-white/[0.06] text-white/60">
        <Icon icon="solar:lock-bold" size={20} />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-sm font-semibold text-white">
          This account is private
        </h2>
        <p className="text-sm text-white/50">
          Follow this account to see their films, reviews and lists.
        </p>
      </div>
    </div>
  );
}

interface AccountHeroProps {
  account?: AccountData | null;
  followersCount?: number;
  followingCount?: number;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  statsSlot?: ReactNode;
}

function AccountHero({
  account,
  followersCount = 0,
  followingCount = 0,
  palette: served = null,
  proofSlot,
  statsSlot,
}: AccountHeroProps) {
  const { openSurface } = useDockActions();

  const displayName = getAccountDisplayName(account);
  const backdropUrl = resolveAccountBackdropUrl(account);
  const joinDate = formatJoinDate(account?.createdAt) || "—";

  const { palette } = useAmbientTheme({
    image: backdropUrl || account?.avatarUrl || null,
    initialPalette: served,
  });
  useNavigationPayload("palette", palette);

  const openSocial = (tab: "following" | "followers") => {
    if (!account?.id) return;
    openSurface(
      createAccountSocialSurfaceEntry({
        avatarUrl: getUserAvatarUrl(account),
        displayName,
        tab,
        userId: account.id,
        username: account.username,
      }),
    );
  };

  const paddingClass = backdropUrl
    ? "-mt-20 pb-6 sm:-mt-28 sm:pb-8 lg:-mt-36 lg:pb-10"
    : "pt-24 pb-6 sm:pt-28 sm:pb-8 lg:pt-32 lg:pb-10";

  const meta: { key: string; node: ReactNode }[] = [];
  if (account?.username) {
    meta.push({ key: "handle", node: <span>@{account.username}</span> });
  }
  meta.push({ key: "joined", node: <span>Joined {joinDate}</span> });
  if (account?.isPrivate) {
    meta.push({
      key: "private",
      node: (
        <span className="inline-flex items-center gap-1">
          <Icon icon="solar:lock-bold" size={12} />
          Private
        </span>
      ),
    });
  }

  return (
    <>
      {backdropUrl && <AccountBackdropHero image={backdropUrl} />}

      <SceneBody className={`relative z-10 w-full ${paddingClass}`}>
        <div className="relative z-10 flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
            <AvatarStage
              className={AVATAR_CLASSES}
              label={`${displayName} avatar`}
            >
              {account?.avatarUrl ? (
                <AdaptiveImage
                  alt=""
                  className="size-full object-cover"
                  onError={(e) =>
                    applyAvatarFallback(e, getUserAvatarFallbackUrl(account))
                  }
                  src={account.avatarUrl}
                />
              ) : (
                getInitial(displayName || account?.username)
              )}
            </AvatarStage>

            <div className="flex min-w-0 flex-1 flex-col">
              <CinemaTitle
                drift={false}
                className="font-zuume max-w-full text-4xl leading-none font-bold text-white uppercase [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl"
              >
                {displayName}
              </CinemaTitle>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-white/50 sm:text-sm">
                {meta.map((item, index) => (
                  <RowItem
                    as="div"
                    className="inline-flex items-center gap-x-2.5"
                    count={meta.length}
                    index={index}
                    intro={SCENE.stats.delay}
                    key={item.key}
                    total={SCENE.stats.spread}
                  >
                    {index > 0 ? (
                      <span className="text-white/30">•</span>
                    ) : null}
                    {item.node}
                  </RowItem>
                ))}
              </div>

              {proofSlot ? (
                <Reveal className="mt-3 flex" intro={SCENE.bio.delay}>
                  {proofSlot}
                </Reveal>
              ) : null}
            </div>
          </div>

          <Reveal className="shrink-0" intro={SCENE.bio.delay}>
            <ProfileStatRow>
              {statsSlot}
              <ProfileStatButton
                count={followingCount}
                label="Following"
                onClick={() => openSocial("following")}
              />
              <ProfileStatButton
                count={followersCount}
                label="Followers"
                onClick={() => openSocial("followers")}
              />
            </ProfileStatRow>
          </Reveal>
        </div>
      </SceneBody>
    </>
  );
}

interface AccountLayoutProps {
  account?: AccountData | null;
  children?: ReactNode;
  followersCount?: number;
  followingCount?: number;
  isFollower?: boolean;
  isOwner?: boolean;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  statsSlot?: ReactNode;
  tabsSlot?: ReactNode;
}

export function AccountLayout({
  account,
  children,
  followersCount: initialFollowersCount = 0,
  followingCount = 0,
  isFollower: initialIsFollower = false,
  isOwner = false,
  palette = null,
  proofSlot,
  statsSlot,
  tabsSlot,
}: AccountLayoutProps) {
  const { followersCount, isFollower } = useSocialFollowSync(
    account?.id,
    initialFollowersCount,
    initialIsFollower,
  );

  const isPrivateLocked = account?.isPrivate && !isOwner && !isFollower;
  const scope = account?.username ? accountHref(account.username) : undefined;

  return (
    <Scene
      className="min-h-screen pb-[calc(var(--dock-h,6rem)+3rem)]"
      scope={scope}
      score={SCENE}
    >
      <div className="relative z-10 w-full [overflow-anchor:none]">
        {tabsSlot && !isPrivateLocked ? (
          <Reveal
            blurPx={0}
            className="absolute inset-x-0 top-0 z-20"
            intro={SCENE.rule.delay}
            offset={0}
          >
            <div
              data-backdrop={
                resolveAccountBackdropUrl(account) ? "" : undefined
              }
            >
              {tabsSlot}
            </div>
          </Reveal>
        ) : null}

        <div className={CONTAINER}>
          <AccountHero
            account={account}
            followersCount={followersCount}
            followingCount={followingCount}
            palette={palette}
            proofSlot={proofSlot}
            statsSlot={isPrivateLocked ? null : statsSlot}
          />
        </div>

        <SceneBody>
          <div className={CONTAINER}>
            <Reveal
              as="section"
              className="w-full pt-8 sm:pt-10"
              intro={SCENE.firstSection}
            >
              {isPrivateLocked ? <PrivateLockedView /> : children}
            </Reveal>
          </div>
        </SceneBody>
      </div>
    </Scene>
  );
}
