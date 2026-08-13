'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LegalReveal } from '@/app/(legal)/motion';

const POLICY_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
];

function quickLinkClassName(isActive) {
  return `flex-auto  border px-4 py-3 text-center text-sm font-medium transition-[background-color,border-color,color,transform] duration-300 ease-out hover:scale-[1.015] active:scale-[0.985] ${
    isActive
      ? 'border-black/10 bg-black/5 text-black'
      : 'border-black/5 bg-white/40 text-black/60 hover:border-black/10 hover:bg-white hover:text-black'
  }`;
}

export default function LegalQuickLinks() {
  const pathname = usePathname();

  return (
    <section
      aria-label="Legal page links"
      className="relative flex flex-col gap-2 py-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {POLICY_LINKS.map((link, index) => (
          <LegalReveal className="flex flex-1" key={link.href} itemIndex={index} stage="quickLink">
            <Link href={link.href} className={quickLinkClassName(pathname === link.href)}>
              {link.label}
            </Link>
          </LegalReveal>
        ))}
        <LegalReveal className="flex flex-1" itemIndex={2} stage="quickLink">
          <a
            className="flex-auto  border border-black/5 bg-white/40 px-4 py-3 text-center text-sm font-medium text-black/60 transition-[background-color,border-color,color,transform] duration-300 ease-out hover:scale-[1.015] hover:border-black/10 hover:bg-white hover:text-black active:scale-[0.985]"
            href="mailto:tvizzie.app@gmail.com"
          >
            Contact
          </a>
        </LegalReveal>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-black/10"
      />
    </section>
  );
}
