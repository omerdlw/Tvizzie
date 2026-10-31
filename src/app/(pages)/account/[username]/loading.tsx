import type { JSX } from "react";
import { Spinner } from "@/ui";

export default function AccountSectionLoading(): JSX.Element {
  return (
    <div className="center min-h-[40vh] w-full">
      <Spinner size={30} />
    </div>
  );
}
