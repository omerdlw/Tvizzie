"use client";

import { Fragment, type JSX } from "react";
import Link from "next/link";
import { useDockLinkClick } from "@/motion";

const LINK_CLASS =
  "underline decoration-white/20 underline-offset-4 transition-colors duration-fast hover:text-white hover:decoration-white/50";

function AppLink({
  children,
  href,
}: {
  children: string;
  href: string;
}): JSX.Element {
  const onClick = useDockLinkClick(href);
  return (
    <Link className={LINK_CLASS} href={href} onClick={onClick} prefetch={false}>
      {children}
    </Link>
  );
}

const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

export function LegalText({ text }: { text: string }): JSX.Element {
  return (
    <>
      {text.split(TOKEN).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong className="font-semibold text-white" key={index}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        const link = LINK.exec(part);
        if (link) {
          const [, label, href] = link;
          return href.startsWith("/") ? (
            <AppLink href={href} key={index}>
              {label}
            </AppLink>
          ) : (
            <a className={LINK_CLASS} href={href} key={index}>
              {label}
            </a>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}
