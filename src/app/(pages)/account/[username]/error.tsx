"use client";

import type { JSX } from "react";
import { USER_MESSAGES } from "@omerdlw/base-framework/utils";
import { RouteError } from "@/ui";

export default function AccountError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <RouteError
      {...props}
      message={USER_MESSAGES.generic}
      title="Profile unavailable"
    />
  );
}
