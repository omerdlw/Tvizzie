"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { AdaptiveImage, BackdropHero, Button, Icon } from "@/ui";
import {
  CinemaTitle,
  DrawnRule,
  Drift,
  HeroStage,
  Reveal,
  RowItem,
  Scene,
  SceneBody,
} from "@/motion";
import {
  applyAvatarFallback,
  getInitial,
  getUserAvatarFallbackUrl,
} from "../lib/utils";
import { SOCIAL_EVENTS } from "../lib/constants";
import { SCENE } from "../lib/motion";
import { AvatarStage } from "./account-avatar";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useAmbientTheme } from "@omerdlw/base-framework/modules/ambient";
import { createAccountSocialSurfaceEntry } from "./dock/account-social-surface";
import { createAccountBioSurfaceEntry } from "./dock/account-bio-surface";

const DEFAULT_DISPLAY_NAME = "Account";

const JOIN_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

const AVATAR_CLASSES =
  "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/60 text-4xl font-semibold text-white shadow-2xl ring-2 ring-white/10 select-none sm:size-28 sm:text-5xl lg:size-32";

export interface AccountData {
  id?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  bannerPosition?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  createdAt?: string;
  isPrivate?: boolean;
  [key: string]: unknown;
}

function formatJoinDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : JOIN_DATE_FORMATTER.format(date);
}

function resolveAccountBackdropUrl(
  profile?: AccountData | null,
): string | null {
  const background = String(
    profile?.backgroundUrl || (profile as any)?.background_url || "",
  ).trim();
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

  useGlobalEvent(
    accountId ? SOCIAL_EVENTS.FOLLOW_CHANGE : null,
    (payload: any) => {
      if (payload?.followingId === accountId) {
        setIsFollower(payload.status === "accepted");
      }
    },
  );

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

interface AccountHeroBioProps {
  bio?: string | null;
  onOpenBio: () => void;
}

function AccountHeroBio({ bio, onOpenBio }: AccountHeroBioProps) {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [hasTextOverflow, setHasTextOverflow] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element || !bio) return;

    const checkOverflow = () => {
      setHasTextOverflow(element.scrollWidth > element.clientWidth);
    };

    const frameId = requestAnimationFrame(checkOverflow);
    const resizeObserver = new ResizeObserver(checkOverflow);

    resizeObserver.observe(element);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [bio]);

  if (!bio) return null;

  const isOverflowing = bio.includes("\n") || hasTextOverflow;

  return (
    <Reveal
      blurPx={6}
      className="mt-3 flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-white/70 sm:mt-3.5 sm:text-sm"
      duration={SCENE.bio.duration}
      intro={SCENE.bio.delay}
      offset={10}
    >
      <p
        ref={textRef}
        className={`cine-fade min-w-0 truncate ${isOverflowing ? "cursor-pointer select-none hover:text-white" : ""}`}
        onClick={isOverflowing ? onOpenBio : undefined}
      >
        {bio}
      </p>
      {isOverflowing && (
        <Button
          className="shrink-0 cursor-pointer font-medium text-white underline underline-offset-2 hover:text-white"
          onClick={onOpenBio}
          type="button"
        >
          read more
        </Button>
      )}
    </Reveal>
  );
}

interface SocialStatButtonProps {
  count: number;
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

function SocialStatButton({ count, label, onClick }: SocialStatButtonProps) {
  return (
    <Button
      className="cine-fade inline-flex cursor-pointer items-center gap-1.5 hover:text-white"
      onClick={onClick}
      type="button"
    >
      <span className="font-semibold text-white">{count}</span>
      <span>{label}</span>
    </Button>
  );
}

function PrivateLockedView() {
  return (
    <Reveal
      className="flex min-h-[14rem] w-full flex-col items-center justify-center gap-3 py-12 text-center"
      intro={SCENE.firstSection}
    >
      <div className="center size-12 rounded-2xl bg-white/5 text-white/50 ring-1 ring-white/10 ring-inset">
        <Icon icon="solar:lock-bold" size={24} />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <h3 className="text-sm font-semibold text-white">
          This account is private
        </h3>
        <p className="text-xs text-white/50">
          Follow this account to see their activity
        </p>
      </div>
    </Reveal>
  );
}

interface AccountHeroProps {
  account?: AccountData | null;
  profile?: AccountData | null;
  followersCount?: number;
  followingCount?: number;
  enableSocial?: boolean;
}

function AccountHero({
  account: accountProp,
  profile,
  followersCount = 0,
  followingCount = 0,
  enableSocial = true,
}: AccountHeroProps) {
  const account = accountProp || profile;
  const { openSurface } = useDockActions();

  const displayName = getAccountDisplayName(account);
  const backdropUrl = resolveAccountBackdropUrl(account);
  const joinDate = formatJoinDate(account?.createdAt) || "—";

  useAmbientTheme({
    image: backdropUrl || account?.avatarUrl || null,
  });

  const openSocial = (tab: "following" | "followers") => {
    if (!account?.id) return;
    openSurface(
      createAccountSocialSurfaceEntry({
        account,
        displayName,
        tab,
        userId: account.id,
        username: account.username,
      }),
    );
  };

  const openBio = () => {
    if (!account?.bio) return;
    openSurface(
      createAccountBioSurfaceEntry({
        account,
        bio: account.bio,
        displayName,
        username: account.username,
      }),
    );
  };

  const paddingClass = backdropUrl
    ? "-mt-20 pb-6 sm:-mt-28 sm:pb-8 lg:-mt-36 lg:pb-10"
    : "py-14 sm:py-20 lg:py-24";

  const stats: { key: string; node: ReactNode }[] = [];
  if (enableSocial) {
    stats.push(
      {
        key: "following",
        node: (
          <SocialStatButton
            count={followingCount}
            label="Following"
            onClick={() => openSocial("following")}
          />
        ),
      },
      {
        key: "followers",
        node: (
          <SocialStatButton
            count={followersCount}
            label="Followers"
            onClick={() => openSocial("followers")}
          />
        ),
      },
    );
  }
  stats.push({ key: "joined", node: <span>Joined {joinDate}</span> });
  if (account?.isPrivate) {
    stats.push({ key: "private", node: <span>Private</span> });
  }

  return (
    <>
      {backdropUrl && <AccountBackdropHero image={backdropUrl} />}

      <SceneBody className={`relative z-10 w-full ${paddingClass}`}>
        <div className="relative z-10 flex min-w-0 items-center gap-4 sm:gap-6 lg:gap-8">
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

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <CinemaTitle className="font-zuume max-w-full text-4xl leading-none font-bold text-white uppercase [overflow-wrap:anywhere] sm:text-6xl lg:text-7xl">
              {displayName}
            </CinemaTitle>

            <Drift>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/50 sm:mt-2 sm:text-base">
                {stats.map((stat, index) => (
                  <RowItem
                    as="div"
                    className="inline-flex items-center gap-x-3"
                    count={stats.length}
                    index={index}
                    intro={SCENE.stats.delay}
                    key={stat.key}
                    total={SCENE.stats.spread}
                  >
                    {index > 0 ? (
                      <span className="text-white/50">•</span>
                    ) : null}
                    {stat.node}
                  </RowItem>
                ))}
              </div>
            </Drift>

            <Drift>
              <AccountHeroBio bio={account?.bio} onOpenBio={openBio} />
            </Drift>
          </div>
        </div>
      </SceneBody>
    </>
  );
}

interface AccountLayoutProps {
  account?: AccountData | null;
  profile?: AccountData | null;
  followersCount?: number;
  followingCount?: number;
  isFollower?: boolean;
  isOwner?: boolean;
  enableSocial?: boolean;
  proofSlot?: ReactNode;
  tabsSlot?: ReactNode;
  children?: ReactNode;
}

export function AccountLayout({
  account,
  profile,
  followersCount: initialFollowersCount = 0,
  followingCount = 0,
  isFollower: initialIsFollower = false,
  isOwner = false,
  enableSocial = true,
  proofSlot,
  tabsSlot,
  children,
}: AccountLayoutProps) {
  const accountData = account || profile;
  const { followersCount, isFollower } = useSocialFollowSync(
    accountData?.id,
    initialFollowersCount,
    initialIsFollower,
  );

  const isPrivateLocked =
    enableSocial && accountData?.isPrivate && !isOwner && !isFollower;

  return (
    <Scene className="min-h-screen" score={SCENE}>
      <div className="relative z-10 w-full [overflow-anchor:none]">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
          <AccountHero
            account={accountData}
            enableSocial={enableSocial}
            followersCount={followersCount}
            followingCount={followingCount}
          />
          {proofSlot ? (
            <Reveal className="pb-4" intro={SCENE.bio.delay}>
              {proofSlot}
            </Reveal>
          ) : null}
        </div>

        <SceneBody>
          {tabsSlot ? (
            <Reveal
              className="w-full border-b border-white/10"
              intro={SCENE.rule.delay}
            >
              {tabsSlot}
            </Reveal>
          ) : (
            <DrawnRule className="bg-white/10" />
          )}

          <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 sm:px-6 lg:px-8">
            {isPrivateLocked ? (
              <PrivateLockedView />
            ) : (
              <Reveal
                as="section"
                className="w-full pt-6 sm:pt-8"
                intro={SCENE.firstSection}
              >
                {children}
              </Reveal>
            )}
          </div>
        </SceneBody>
      </div>
    </Scene>
  );
}
