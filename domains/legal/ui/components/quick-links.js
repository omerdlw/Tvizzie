import Link from 'next/link';
import { POLICY_LINKS } from '../../utils/constants';

const LINK_BASE_CLASS =
  'flex-auto border px-4 py-3 text-center text-sm font-medium transition-all duration-300 ease-in-out';

function getQuickLinkClass(isActive) {
  return `${LINK_BASE_CLASS} ${
    isActive
      ? 'border-white/10 bg-white/5 text-white'
      : 'border-white/5 bg-black/40 text-white/50 hover:border-white/10 hover:bg-black hover:text-white'
  }`;
}

export default function LegalQuickLinks({ activePath }) {
  return (
    <section aria-label="Legal page links" className="relative flex flex-col gap-2 py-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        {POLICY_LINKS.map((link) => (
          <div className="flex flex-1" key={link.href}>
            <Link href={link.href} className={getQuickLinkClass(activePath === link.href)}>
              {link.label}
            </Link>
          </div>
        ))}
        <div className="flex flex-1">
          <a className={getQuickLinkClass(false)} href="mailto:tvizzie.app@gmail.com">
            Contact
          </a>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10"
      />
    </section>
  );
}

export { LegalQuickLinks };
