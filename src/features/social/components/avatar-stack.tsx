import type { JSX } from "react";
import { Avatar } from "@/ui";
import type { SocialPerson } from "../lib/types";

export function AvatarStack({
  max = 4,
  people,
  size = 28,
}: {
  max?: number;
  people: readonly SocialPerson[];
  size?: number;
}): JSX.Element {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      {people.slice(0, max).map((person, index) => (
        <Avatar
          className="rounded-full ring-2 ring-black"
          key={person.id}
          name={person.displayName}
          size={size}
          src={person.avatarUrl}
          style={{
            marginLeft: index === 0 ? 0 : -size * 0.3,
            zIndex: max - index,
          }}
        />
      ))}
    </span>
  );
}
