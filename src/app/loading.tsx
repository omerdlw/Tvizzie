import type { JSX } from "react";
import { Spinner } from "@/ui";

export default function Loading(): JSX.Element {
  return <Spinner size={30} />;
}
