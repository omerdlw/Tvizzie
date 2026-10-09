"use client";

import { useEffect, useState, type JSX } from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn, report } from "@omerdlw/base-framework/utils";
import { useAuth } from "@/features/auth";
import { Icon } from "@/ui";
import { getMovieSocialProofAction } from "../server/actions";
import type { MovieSocialProof as Proof } from "../lib/types";
import { describeProof } from "../lib/utils";
import { AvatarStack } from "./avatar-stack";
import { createSocialProofSurfaceEntry } from "./social-proof-surface";

export function MovieSocialProof({
  movieId,
  title,
}: {
  movieId: number;
  title: string;
}): JSX.Element {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = userId ? `${userId}:${movieId}` : null;

  const [loaded, setLoaded] = useState<{ key: string; proof: Proof } | null>(
    null,
  );

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    getMovieSocialProofAction(movieId)
      .then((result) => {
        if (cancelled) return;
        if (!result.success)
          return report("MovieSocialProof load", result.error);
        if (result.proof) setLoaded({ key, proof: result.proof });
      })
      .catch((error) => report("MovieSocialProof load", error));

    return () => {
      cancelled = true;
    };
  }, [key, movieId]);

  const proof = loaded?.key === key ? loaded.proof : null;
  const open = Boolean(proof && proof.friends.length > 0);
  const summary = proof && open ? describeProof(proof) : null;

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin] duration-slow ease-out-expo",
        open
          ? "mt-0 grid-rows-[1fr] opacity-100"
          : "-mt-3 grid-rows-[0fr] opacity-0",
      )}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">
        {proof && summary ? (
          <button
            className="group flex w-full cursor-pointer items-center gap-3 rounded-[20px] bg-white/5 p-3 text-left ring-1 ring-white/5 transition-colors duration-slow ease-out-expo outline-none ring-inset hover:bg-white/10 focus-visible:ring-white/50"
            onClick={() =>
              void openSurface(
                createSocialProofSurfaceEntry({ movieId, proof, title }),
              )
            }
            type="button"
          >
            <AvatarStack people={proof.friends} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-xs font-semibold text-white">
                {summary.headline}
              </span>
              {summary.details ? (
                <span className="truncate text-[11px] text-white/70">
                  {summary.details}
                </span>
              ) : null}
            </span>
            <Icon
              className="shrink-0 text-white/40 transition-colors duration-fast group-hover:text-white"
              icon="solar:alt-arrow-right-linear"
              size={14}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
