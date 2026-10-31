"use client";

import type { JSX } from "react";
import { RouteError } from "@/ui";

export default function MovieError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <RouteError
      {...props}
      message="We couldn’t load this movie right now. Please try again in a moment"
      title="Movie unavailable"
    />
  );
}
