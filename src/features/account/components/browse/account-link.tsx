"use client";

import type { ComponentProps, JSX } from "react";
import Link from "next/link";
import { useDockLinkClick } from "@/motion";

export function AccountLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "onClick" | "prefetch"> & {
  href: string;
}): JSX.Element {
  const onClick = useDockLinkClick(href);
  return <Link {...props} href={href} onClick={onClick} prefetch={false} />;
}
