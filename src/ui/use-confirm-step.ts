"use client";

import { useEffect, useState } from "react";

export function useConfirmStep(
  resetMs = 3000,
): [confirming: boolean, setConfirming: (value: boolean) => void] {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), resetMs);
    return () => window.clearTimeout(timer);
  }, [confirming, resetMs]);

  return [confirming, setConfirming];
}
