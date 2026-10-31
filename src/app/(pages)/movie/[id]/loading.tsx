import type { JSX } from "react";
import { MovieSkeleton } from "@/features/movie";
import { Handoff } from "@/motion/handoff";

export default function MovieLoading(): JSX.Element {
  return (
    <Handoff>
      <MovieSkeleton />
    </Handoff>
  );
}
