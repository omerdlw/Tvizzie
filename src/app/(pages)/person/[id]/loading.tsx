import type { JSX } from "react";
import { PersonSkeleton } from "@/features/person";
import { Handoff } from "@/motion/handoff";

export default function PersonLoading(): JSX.Element {
  return (
    <Handoff>
      <PersonSkeleton />
    </Handoff>
  );
}
