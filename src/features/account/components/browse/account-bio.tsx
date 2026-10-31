"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { createAccountBioSurfaceEntry } from "../surfaces/account-bio-surface";

const CLAMPED =
  "line-clamp-3 [mask-image:linear-gradient(#000,#000),linear-gradient(to_left,transparent_5.5rem,#000_8rem)] [mask-position:top,bottom] [mask-repeat:no-repeat] [mask-size:100%_calc(100%-20px),100%_20px]";

export function AccountBio({
  bio,
  displayName,
  username,
}: {
  bio: string;
  displayName: string;
  username: string;
}): JSX.Element {
  const { openSurface } = useDockActions();
  const text = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const element = text.current;
    if (!element) return;
    const measure = () => {
      element.classList.remove("line-clamp-3");
      const full = element.scrollHeight;
      element.classList.add("line-clamp-3");
      setCut(full > element.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bio]);

  const open = () =>
    openSurface(createAccountBioSurfaceEntry({ bio, displayName, username }));

  return (
    <div className="relative text-[13px] leading-5">
      <p
        className={cn(
          "line-clamp-3 [overflow-wrap:anywhere] whitespace-pre-line text-white/65",
          cut && CLAMPED,
        )}
        ref={text}
      >
        {bio}
      </p>
      {cut ? (
        <button
          className="absolute right-0 bottom-0 cursor-pointer font-medium text-white underline underline-offset-2 hover:text-white/75"
          onClick={open}
          type="button"
        >
          read more
        </button>
      ) : null}
    </div>
  );
}
