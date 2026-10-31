"use client";

import { useState, useTransition, type JSX } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@omerdlw/base-framework/utils";
import {
  AccountLink,
  SOCIAL_EVENTS,
  followUserAction,
  unfollowUserAction,
} from "@/features/account";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { Header, Item, Section } from "@/motion/stage";
import { Avatar, Button, TONE } from "@/ui";
import { accountHref } from "@/config/routes";
import { compact } from "../lib/format";
import type { HomeMember } from "../lib/types";

type Status = "accepted" | "pending" | null;

function FollowButton({ member }: { member: HomeMember }): JSX.Element {
  const auth = useAuth();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const [status, setStatus] = useState<Status>(null);
  const [pending, start] = useTransition();

  const toggle = () => {
    if (!auth.isAuthenticated) {
      void openSurface(
        createSignInSurfaceEntry({ next: window.location.pathname }),
      );
      return;
    }
    const was = status;
    setStatus(was ? null : "accepted");
    start(async () => {
      const result = was
        ? await unfollowUserAction(member.id, member.username)
        : await followUserAction(member.id, member.username);
      if (!result.success) {
        setStatus(was);
        toast(result.error);
        return;
      }
      const next: Status = was ? null : (result.data as Status);
      setStatus(next);
      globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
        followingId: member.id,
        status: next,
      });
    });
  };

  return (
    <Button
      aria-pressed={status !== null}
      className={cn(
        "h-8 w-full rounded-full px-4 text-[13px] font-medium",
        status ? TONE.chosen : TONE.surface,
      )}
      disabled={pending}
      onClick={toggle}
    >
      {status === "pending" ? "Requested" : status ? "Following" : "Follow"}
    </Button>
  );
}

function MemberCard({ member }: { member: HomeMember }): JSX.Element {
  const href = accountHref(member.username);
  return (
    <Item
      as="li"
      className="flex min-w-0 flex-col items-center gap-3 text-center"
      from="light"
    >
      <AccountLink className="flex ui-fade hover:opacity-85" href={href}>
        <Avatar
          className="rounded-full"
          name={member.displayName}
          size={72}
          src={member.avatarUrl ?? undefined}
        />
      </AccountLink>
      <div className="flex w-full min-w-0 flex-col gap-0.5">
        <AccountLink
          className="truncate text-[15px] font-semibold text-white underline decoration-transparent hover:decoration-current"
          href={href}
        >
          {member.displayName}
        </AccountLink>
        <span className="truncate text-xs text-white/40">
          @{member.username}
        </span>
      </div>
      <p className="line-clamp-2 min-h-8 text-xs leading-4 text-white/55">
        {member.reason}
      </p>
      <p className="text-xs text-white/40 tabular-nums">
        {compact(member.watched)} films · {compact(member.reviews)} reviews
      </p>
      <div className="mt-auto w-full max-w-36">
        <FollowButton member={member} />
      </div>
    </Item>
  );
}

export function HomeMembers({
  members,
  title,
}: {
  members: HomeMember[];
  title: string;
}): JSX.Element | null {
  if (members.length === 0) return null;
  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:user-plus-bold" title={title} />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </ul>
    </Section>
  );
}
