"use client";

import { useEffect, type JSX } from "react";
import Link from "next/link";
import { report } from "@omerdlw/base-framework/utils";
import { Button } from "./button";

export function RouteError({
  error,
  message,
  reset,
  title,
}: {
  error: Error & { digest?: string };
  message: string;
  reset: () => void;
  title: string;
}): JSX.Element {
  useEffect(() => {
    report(title, error);
  }, [error, title]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-white/50">{message}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button
          className="bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
          onClick={reset}
          type="button"
        >
          Try again
        </Button>
        <Link
          className="bg-white/5 px-4 py-2 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10"
          href="/"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
