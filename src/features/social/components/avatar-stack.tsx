import type { CSSProperties, JSX } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { Avatar } from "@/ui";
import type { SocialPerson } from "../lib/types";

const OVERLAP = 0.3;
const GAP = 2;

function cutout(size: number, round: boolean): CSSProperties {
  const overlap = Math.round(size * OVERLAP);
  const mask = round
    ? `radial-gradient(circle at ${overlap - size / 2}px 50%, transparent ${size / 2 + GAP}px, #000 ${size / 2 + GAP + 0.5}px)`
    : `linear-gradient(to right, transparent ${overlap + GAP}px, #000 ${overlap + GAP}px)`;
  return { WebkitMaskImage: mask, maskImage: mask };
}

export function AvatarStack({
  max = 4,
  people,
  round = false,
  size = 28,
}: {
  max?: number;
  people: readonly SocialPerson[];
  round?: boolean;
  size?: number;
}): JSX.Element {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      {people.slice(0, max).map((person, index) => (
        <Avatar
          className={cn(round && "rounded-full")}
          key={person.id}
          name={person.displayName}
          size={size}
          src={person.avatarUrl}
          style={{
            marginLeft: index === 0 ? 0 : -Math.round(size * OVERLAP),
            zIndex: max - index,
            ...(index === 0 ? null : cutout(size, round)),
          }}
        />
      ))}
    </span>
  );
}
