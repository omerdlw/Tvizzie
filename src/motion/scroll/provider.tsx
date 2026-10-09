"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { motionValue, type MotionValue } from "motion/react";
import { SmoothScroll, type SmoothScrollOptions } from "./engine";

const SmoothScrollContext = createContext<SmoothScroll | null>(null);

function useOptionalPathname(): string | null {
  try {
    return usePathname();
  } catch {
    return null;
  }
}

export function SmoothScrollProvider({
  children,
  options,
}: {
  children: ReactNode;
  options?: SmoothScrollOptions;
}) {
  const [engine] = useState(() => new SmoothScroll(options));
  const pathname = useOptionalPathname();
  const isFirstMount = useRef(true);

  useEffect(() => {
    engine.start();
    return () => engine.destroy();
  }, [engine]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    engine.scrollTo(0, { immediate: true });
  }, [engine, pathname]);

  return (
    <SmoothScrollContext.Provider value={engine}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

export function useSmoothScroll(): SmoothScroll | null {
  return useContext(SmoothScrollContext);
}

let native: MotionValue<number> | null = null;

function nativeScrollY(): MotionValue<number> {
  if (!native) {
    const value = motionValue(0);
    native = value;
    if (typeof window !== "undefined") {
      const sync = () => value.set(window.scrollY);
      sync();
      window.addEventListener("scroll", sync, { passive: true });
    }
  }
  return native;
}

export function useScrollY(): MotionValue<number> {
  return useContext(SmoothScrollContext)?.scrollY ?? nativeScrollY();
}
