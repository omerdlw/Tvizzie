"use client";

import { useState } from "react";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@omerdlw/base-framework/utils";
import { requestJson } from "@/infrastructure/http/client";
import { Button, Icon } from "@/ui";
import { describeDevice, describeSession } from "./session-format";
import { useSecurityTask, useSubmitClass } from "./shared";
import type { AuthSession } from "./use-security";

function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1].map((index) => (
        <div
          className="flex h-[52px] w-full items-center justify-between gap-3 rounded-[16px] bg-white/[0.06] p-1.5 pl-4"
          key={index}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="size-5 shrink-0 rounded-full bg-white/10" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-32 rounded-full bg-white/10" />
              <div className="h-2.5 w-44 rounded-full bg-white/[0.07]" />
            </div>
          </div>
          <div className="h-10 w-20 shrink-0 rounded-[10px] bg-white/[0.07]" />
        </div>
      ))}
    </div>
  );
}

export function SessionsPanel({
  loading,
  reload,
  sessions,
}: {
  loading: boolean;
  reload: () => Promise<void>;
  sessions: AuthSession[];
}) {
  const submitClass = useSubmitClass();
  const run = useSecurityTask(reload);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  if (loading && sessions.length === 0) return <SessionsSkeleton />;

  const revoke = (sessionId: string) =>
    run(
      () =>
        requestJson(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
        }),
      (busy) => setBusyId(busy ? sessionId : null),
      "Device signed out",
      "Couldn't sign out that device",
    );

  const revokeOthers = () =>
    run(
      () => requestJson("/api/auth/sessions/others", { method: "POST" }),
      setRevokingOthers,
      "Signed out of your other devices",
      "Couldn't sign out your other devices",
    );

  return (
    <div className="flex flex-col gap-2.5">
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[16px] bg-white/[0.06] p-6 text-center">
          <Icon className="text-white/50" icon="solar:devices-bold" size={22} />
          <span className="text-xs font-medium text-white/50">
            No active sessions found
          </span>
        </div>
      ) : (
        sessions.map((session) => {
          const device = describeDevice(session.user_agent);
          return (
            <div
              className={cn(
                "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[16px] p-1.5 pl-4 ring-1 ring-inset",
                session.is_current
                  ? "bg-primary/10 ring-primary/15"
                  : "bg-white/[0.06] ring-white/[0.04] hover:bg-white/10",
              )}
              key={session.session_id}
              title={session.user_agent ?? undefined}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon
                  className={cn(
                    "shrink-0",
                    session.is_current ? "text-primary" : "text-white/70",
                  )}
                  icon={device.icon}
                  size={20}
                />
                <div className="flex min-w-0 flex-col justify-center gap-0.5">
                  <span className="truncate text-sm leading-snug font-semibold text-white">
                    {device.title}
                  </span>
                  <span className="truncate text-xs leading-snug text-white/50">
                    {describeSession(session)}
                  </span>
                </div>
              </div>
              {session.is_current ? (
                <span
                  className={cn(
                    "center h-10 shrink-0 rounded-[10px] px-4 text-xs font-medium",
                    ACTION_TONE_CLASS,
                  )}
                >
                  Current
                </span>
              ) : (
                <Button
                  className={cn(
                    "center h-10 shrink-0 cursor-pointer rounded-[10px] px-4 text-xs font-medium",
                    ACTION_TONE_CLASS,
                  )}
                  disabled={busyId === session.session_id}
                  loading={busyId === session.session_id}
                  onClick={() => revoke(session.session_id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          );
        })
      )}

      {sessions.some((session) => !session.is_current) ? (
        <Button
          className={cn(
            submitClass,
            "mt-0.5 flex items-center justify-center gap-2",
          )}
          disabled={revokingOthers}
          loading={revokingOthers}
          onClick={revokeOthers}
        >
          <Icon icon="solar:logout-2-bold" size={16} />
          <span>Sign out other sessions</span>
        </Button>
      ) : null}
    </div>
  );
}
