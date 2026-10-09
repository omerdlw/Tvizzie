"use client";

import type { JSX } from "react";
import Link from "next/link";
import { cn } from "@omerdlw/base-framework/utils";
import { useDockLinkClick } from "@/motion";
import { LEGAL_CONTACT_EMAIL, LEGAL_LINKS } from "../lib/constants";

const BASE =
  "cine-fade flex-1 rounded-[16px] px-4 py-3 text-center text-sm font-medium ring-1 ring-inset outline-none focus-visible:ring-white/50";

function LegalLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}): JSX.Element {
  const onClick = useDockLinkClick(href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        BASE,
        active
          ? "bg-white/10 text-white ring-white/10"
          : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
      )}
      href={href}
      onClick={onClick}
      prefetch={false}
    >
      {label}
    </Link>
  );
}

export function LegalLinks({ active }: { active: string | null }): JSX.Element {
  return (
    <nav aria-label="Legal" className="flex flex-col gap-2 sm:flex-row">
      {LEGAL_LINKS.map((link) => (
        <LegalLink
          active={active === link.href}
          href={link.href}
          key={link.href}
          label={link.label}
        />
      ))}
      <a
        className={cn(
          BASE,
          "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
        )}
        href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      >
        Contact
      </a>
    </nav>
  );
}
