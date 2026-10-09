import type { JSX } from "react";
import { Spinner } from "@/ui";

export default function MovieReviewsLoading(): JSX.Element {
  return (
    <div className="center min-h-screen w-full">
      <Spinner size={30} />
    </div>
  );
}
