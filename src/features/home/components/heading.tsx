import type { JSX, ReactNode } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { SectionPart } from "@/motion";

export function Heading({
  children,
  className,
  kicker,
}: {
  children: ReactNode;
  className?: string;
  kicker: string;
}): JSX.Element {
  return (
    <SectionPart className={cn("flex flex-col gap-3", className)}>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">
        {kicker}
      </p>
      <h2 className="font-zuume text-5xl leading-[0.9] font-bold text-white uppercase sm:text-6xl lg:text-7xl">
        {children}
      </h2>
    </SectionPart>
  );
}
