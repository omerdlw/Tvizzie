"use client";

import { useEffect, useState, type JSX } from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn, report } from "@omerdlw/base-framework/utils";
import { useAuth } from "@/features/auth";
import { Icon } from "@/ui";
import { Fade, Item, trackSpotlight } from "@/motion/stage";
import { getMovieSocialProofAction } from "../server/actions";
import type { MovieSocialProof as Proof } from "../lib/types";
import { describeProof } from "../lib/utils";
import { AvatarStack } from "./avatar-stack";
import { createSocialProofSurfaceEntry } from "./social-proof-surface";

export function MovieSocialProof({
  movieId,
  timing,
  title,
}: {
  movieId: number;
  timing: { content: number; run: number };
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
          <Item exit={false} from="light">
            <button
              className="cine-card cine-fade cine-spot group relative flex h-14 w-full cursor-pointer items-center overflow-hidden rounded-full bg-white/[0.06] px-3.5 text-left ring-1 ring-white/[0.04] ring-inset hover:bg-white/10 hover:ring-white/[0.08]"
              onClick={() =>
                void openSurface(
                  createSocialProofSurfaceEntry({ movieId, proof, title }),
                )
              }
              onPointerMove={trackSpotlight}
              type="button"
            >
              <Fade
                as="span"
                className="flex min-w-0 flex-1 items-center gap-3"
                run={timing.run}
                since={timing.content}
              >
                <AvatarStack people={proof.friends} round />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs leading-4 font-semibold text-white">
                    {summary.headline}
                  </span>
                  {summary.details ? (
                    <span className="truncate text-[11px] leading-4 text-white/70">
                      {summary.details}
                    </span>
                  ) : null}
                </span>
                <Icon
                  className="shrink-0 text-white/40 transition-colors duration-fast group-hover:text-white"
                  icon="solar:alt-arrow-right-linear"
                  size={16}
                />
              </Fade>
            </button>
          </Item>
        ) : null}
      </div>
    </div>
  );
}
