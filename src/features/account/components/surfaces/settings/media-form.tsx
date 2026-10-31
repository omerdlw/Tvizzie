"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { DockCardBanner } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@omerdlw/base-framework/utils";
import { AdaptiveImage, Button, Icon, Input } from "@/ui";
import { useAccount } from "../../../lib/provider";
import { updateAccountAction } from "../../../server/actions";
import { useSubmitClass } from "./shared";

const DEFAULT_BANNER_POSITION = "center 45%";
const PREVIEW_SHADOW = "drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]";

type SaveResult = { success: true } | { error: string; success: false } | null;

const bannerY = (position: string) =>
  Number(/(\d+)%/.exec(position)?.[1] ?? 45);

function Preview({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-[16px] bg-white/[0.06] ring-1 ring-inset ring-white/[0.04]">
      {children}
    </div>
  );
}

function UrlInput({
  disabled,
  onChange,
  placeholder,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="relative flex w-full items-center">
      <Input
        className={cn(
          "h-10 w-full rounded-[16px] bg-white/[0.06] pl-4 text-sm text-white ring-1 ring-inset ring-white/[0.04] placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:ring-white/[0.12] focus:outline-none",
          value ? "pr-9" : "pr-4",
        )}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="url"
        value={value}
      />
      {value ? (
        <Button
          aria-label="Clear input"
          className="center absolute right-1 size-8 cursor-pointer rounded-[12px] p-0 text-white/50 hover:bg-white/10 hover:text-white"
          disabled={disabled}
          onClick={() => onChange("")}
        >
          <Icon icon="solar:close-bold" size={14} />
        </Button>
      ) : null}
    </div>
  );
}

function BannerSlider({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: number) => void;
  value: number;
}) {
  const track = useRef<HTMLDivElement>(null);

  const follow = (clientY: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.height <= 0 || disabled) return;
    const ratio = (clientY - box.top) / box.height;
    onChange(Math.min(100, Math.max(0, Math.round(ratio * 100))));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    follow(event.clientY);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    event.stopPropagation();
    follow(event.clientY);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowDown: Math.min(100, value + 5),
      ArrowUp: Math.max(0, value - 5),
      End: 100,
      Home: 0,
    }[event.key];
    if (disabled || next === undefined) return;
    event.preventDefault();
    onChange(next);
  };

  return (
    <div
      aria-label="Banner vertical alignment"
      aria-orientation="vertical"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn(
        "group/slider flex w-10 shrink-0 cursor-ns-resize flex-col items-center justify-between self-stretch rounded-[16px] bg-white/[0.06] py-3 ring-1 ring-inset ring-white/[0.04] select-none touch-none hover:bg-white/10",
        disabled && "pointer-events-none opacity-50",
      )}
      data-no-surface-drag="true"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      role="slider"
      tabIndex={disabled ? -1 : 0}
    >
      <Icon
        className="shrink-0 text-white/50 group-hover/slider:text-white/80"
        icon="solar:alt-arrow-up-linear"
        size={12}
      />
      <div
        className="relative my-1.5 w-1.5 flex-1 rounded-full bg-white/15"
        ref={track}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-full origin-bottom rounded-full bg-white/40"
          style={{ transform: `scaleY(${value / 100})` }}
        />
        <div
          className="ui-glyph absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm group-hover/slider:scale-110 group-active/slider:scale-125"
          style={{ top: `${value}%` }}
        />
      </div>
      <Icon
        className="shrink-0 text-white/50 group-hover/slider:text-white/80"
        icon="solar:alt-arrow-down-linear"
        size={12}
      />
    </div>
  );
}

function DockPreview({
  avatarUrl,
  bannerUrl,
  displayName,
  position,
  username,
}: {
  avatarUrl: string;
  bannerUrl: string;
  displayName?: string;
  position: number;
  username?: string;
}) {
  return (
    <div className="relative flex h-[60px] w-full items-center justify-between overflow-hidden rounded-[16px] bg-black/70 p-1.5 pr-2.5 ring-1 ring-inset ring-white/[0.08] inset-shadow-[0_1px_0_rgb(255_255_255/0.07)] shadow-xl backdrop-blur-lg select-none">
      {bannerUrl ? (
        <DockCardBanner
          bannerPosition={`center ${position}%`}
          bannerUrl={bannerUrl}
          isActive
        />
      ) : null}
      <div className="pointer-events-none relative z-10 flex w-full items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="center relative size-12 shrink-0 overflow-hidden rounded-[10px] bg-white/[0.06] text-white shadow-sm">
            {avatarUrl ? (
              <AdaptiveImage
                alt="Preview avatar"
                className="size-full object-cover"
                src={avatarUrl}
              />
            ) : (
              <Icon icon="solar:user-circle-bold" size={26} />
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <span
              className={`truncate text-[15px] leading-tight font-semibold tracking-[-0.01em] text-white ${PREVIEW_SHADOW}`}
            >
              {displayName || "Your Name"}
            </span>
            <span className="truncate text-sm leading-tight text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              @{username || "username"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {[
            "solar:logout-2-bold",
            "solar:settings-bold",
            "solar:bell-bold",
          ].map((icon) => (
            <div
              className={`center size-9 rounded-full text-white/60 ${PREVIEW_SHADOW}`}
              key={icon}
            >
              <Icon icon={icon} size={16} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MediaForm({ onSaved }: { onSaved: () => void }) {
  const { account: current, refresh } = useAccount();
  const router = useRouter();
  const toast = useToast();
  const submitClass = useSubmitClass();

  const [avatarUrl, setAvatarUrl] = useState(current?.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(current?.bannerUrl ?? "");
  const [backgroundUrl, setBackgroundUrl] = useState(
    current?.backgroundUrl ?? "",
  );
  const [bannerPosition, setBannerPosition] = useState(
    current?.bannerPosition ?? DEFAULT_BANNER_POSITION,
  );
  const position = bannerY(bannerPosition);

  const [result, submit, pending] = useActionState<SaveResult, FormData>(
    async () => {
      const update = await updateAccountAction({
        avatarUrl: avatarUrl.trim() || null,
        backgroundUrl: backgroundUrl.trim() || null,
        bannerPosition: bannerPosition.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
      });
      if (!update.success) {
        return {
          error:
            update.error || "Your images couldn't be updated. Please try again",
          success: false,
        };
      }
      await refresh();
      return { success: true };
    },
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (!result.success) {
      toast(result.error);
      return;
    }
    toast("Images updated");
    router.refresh();
    onSaved();
  }, [result]);

  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <Preview>
            <div className="center relative size-20 shrink-0 overflow-hidden rounded-full bg-black/60 text-white/50">
              {avatarUrl ? (
                <AdaptiveImage
                  alt="Avatar preview"
                  className="size-full object-cover"
                  src={avatarUrl}
                />
              ) : (
                <Icon icon="solar:user-circle-bold" size={24} />
              )}
            </div>
          </Preview>
          <UrlInput
            disabled={pending}
            onChange={setAvatarUrl}
            placeholder="Avatar image URL"
            value={avatarUrl}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Preview>
            {backgroundUrl ? (
              <AdaptiveImage
                alt="Page background preview"
                className="size-full object-cover"
                src={backgroundUrl}
              />
            ) : (
              <Icon
                className="text-white/50"
                icon="solar:wallpaper-bold"
                size={24}
              />
            )}
          </Preview>
          <UrlInput
            disabled={pending}
            onChange={setBackgroundUrl}
            placeholder="Page background URL"
            value={backgroundUrl}
          />
        </div>
      </div>

      <div className="flex w-full items-stretch gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <DockPreview
            avatarUrl={avatarUrl}
            bannerUrl={bannerUrl}
            displayName={current?.displayName}
            position={position}
            username={current?.username}
          />
          <UrlInput
            disabled={pending}
            onChange={setBannerUrl}
            placeholder="Dock banner image URL"
            value={bannerUrl}
          />
        </div>
        {bannerUrl ? (
          <BannerSlider
            disabled={pending}
            onChange={(y) => setBannerPosition(`center ${y}%`)}
            value={position}
          />
        ) : null}
      </div>

      <Button
        className={submitClass}
        disabled={pending}
        loading={pending}
        type="submit"
      >
        Save changes
      </Button>
    </form>
  );
}
