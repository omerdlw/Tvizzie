import type { JSX } from "react";
import type { MutualFollowers } from "../lib/types";
import { formatNames } from "../lib/utils";
import { AvatarStack } from "./avatar-stack";

export function FollowedBy({
  mutual,
}: {
  mutual: MutualFollowers;
}): JSX.Element | null {
  if (mutual.people.length === 0) return null;

  const names = mutual.people.map((person) => person.displayName);
  const hidden = Math.max(0, mutual.total - names.length);
  const text =
    hidden > 0
      ? `${names.join(", ")} and ${hidden} ${hidden === 1 ? "other" : "others"}`
      : formatNames(names, names.length);

  return (
    <p className="flex min-w-0 items-center gap-2.5 text-xs text-white/70">
      <AvatarStack people={mutual.people} size={22} />
      <span className="min-w-0 truncate">
        Followed by <span className="font-semibold text-white">{text}</span> you
        follow
      </span>
    </p>
  );
}
