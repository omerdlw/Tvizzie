'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const POLICY_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
];

function quickLinkClassName(isActive) {
  return `flex-auto rounded-2xl border px-4 py-3 text-center text-sm font-medium transition-colors ${
    isActive
      ? 'border-black/10 bg-black/5 text-black'
      : 'border-black/5 bg-white/40 text-black/60 hover:border-black/10 hover:bg-white hover:text-black'
  }`;
}

export default function LegalQuickLinks({ variants }) {
  const pathname = usePathname();

  return (
    <motion.section
      variants={variants}
      aria-label="Legal page links"
      className="relative flex flex-col gap-2 py-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {POLICY_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={quickLinkClassName(pathname === link.href)}
          >
            {link.label}
          </Link>
        ))}
        <a
          className="flex-auto rounded-2xl border border-black/5 bg-white/40 px-4 py-3 text-center text-sm font-medium text-black/60 transition-colors hover:border-black/10 hover:bg-white hover:text-black"
          href="mailto:tvizzie.app@gmail.com"
        >
          Contact
        </a>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-black/10"
      />
    </motion.section>
  );
}
