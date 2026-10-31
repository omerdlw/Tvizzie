"use client";

import type { JSX } from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { Item, Section } from "@/motion/stage";
import { Button, HEADLINE_BOX, Icon } from "@/ui";
import { whole } from "../lib/format";

const POINTS = [
  {
    icon: "solar:notebook-bookmark-bold",
    text: "Log every film you watch, with a rating and a date",
  },
  {
    icon: "solar:pen-new-square-bold",
    text: "Write reviews and read what others thought",
  },
  {
    icon: "solar:users-group-rounded-bold",
    text: "Follow friends and see what they’re watching",
  },
  {
    icon: "solar:widget-bold",
    text: "Make lists worth sharing, ranked or not",
  },
];

// The page's last word for a visitor who isn't signed in yet.
export function HomeJoin({ members }: { members: number }): JSX.Element | null {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  if (auth.isAuthenticated) return null;

  return (
    <Section className="flex w-full flex-col">
      <Item
        className="grid grid-cols-1 gap-10 border-t border-white/[0.06] pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
        from="light"
      >
        <div className="flex flex-col items-start gap-6">
          <h2
            className={`${HEADLINE_BOX} font-zuume text-6xl leading-none font-bold text-balance uppercase sm:text-7xl`}
          >
            Your next film is waiting
          </h2>
          <p className="max-w-[46ch] text-base leading-7 text-white/60">
            {members > 0
              ? `Join ${whole(members)} members keeping a diary of what they watch.`
              : "Keep a diary of what you watch."}{" "}
            It’s free, and it takes a minute.
          </p>
          <Button
            className="h-11 rounded-full bg-white px-6 text-sm font-medium text-black hover:bg-white/85"
            onClick={() =>
              void openSurface(
                createSignInSurfaceEntry({ next: window.location.pathname }),
              )
            }
          >
            Create your account
          </Button>
        </div>
        <ul className="grid grid-cols-1 gap-5 self-center sm:grid-cols-2">
          {POINTS.map((point) => (
            <li className="flex items-start gap-3" key={point.text}>
              <span className="center mt-0.5 size-8 shrink-0 rounded-full bg-white/[0.06] text-white/70">
                <Icon icon={point.icon} size={16} />
              </span>
              <span className="text-[15px] leading-6 text-white/70">
                {point.text}
              </span>
            </li>
          ))}
        </ul>
      </Item>
    </Section>
  );
}
