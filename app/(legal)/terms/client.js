'use client';

import { Children } from 'react';
import Link from 'next/link';
import LegalNavRegistry from '@/app/(legal)/registry';
import LegalQuickLinks from '@/domains/legal/ui/components/legal-quick-links';
import LegalPageShell, {
  LEGAL_PAGE_CONTENT_CLASS,
} from '@/domains/legal/ui/layouts/legal-page-shell';
import { LegalReveal } from '@/app/(legal)/motion';

const LAST_UPDATED = 'April 20, 2026';

function AnimatedLegalSection({ children, title }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-black sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-black/72 sm:text-[15px]">{children}</div>
    </section>
  );
}

function LegalDocument({ children }) {
  return (
    <article className="bg-primary space-y-8 border border-black/5 p-6 sm:p-8">
      {Children.toArray(children).map((section, index) => (
        <LegalReveal key={section.key || index} inView itemIndex={index} stage="section">
          {section}
        </LegalReveal>
      ))}
    </article>
  );
}

function TermsView() {
  return (
    <>
      <LegalNavRegistry
        title="Terms of Service"
        description="Rules and conditions for using the Tvizzie service"
        icon="solar:document-text-bold"
      />
      <LegalPageShell>
        <div
          className={LEGAL_PAGE_CONTENT_CLASS}
        >
          <header className="mx-auto max-w-3xl space-y-4 py-24 text-center sm:py-28">
            <div className="space-y-3">
              <LegalReveal stage="title">
                <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                  Terms of Service
                </h1>
              </LegalReveal>
              <LegalReveal stage="lead">
                <p className="mx-auto max-w-2xl text-sm leading-7 text-black/68 sm:text-[15px]">
                  These terms govern access to and use of Tvizzie. They are written to match the
                  current product: a movie and TV discovery service with accounts, profile pages,
                  watch tracking, reviews, likes, and lists.
                </p>
              </LegalReveal>
            </div>
            <LegalReveal stage="meta">
              <p className="text-xs tracking-wide text-black/44 uppercase">
                Last updated {LAST_UPDATED}
              </p>
            </LegalReveal>
          </header>

          <div
            aria-hidden="true"
            className="relative left-1/2 h-px w-screen -translate-x-1/2 bg-black/10"
          />

          <LegalQuickLinks />

          <div className="mt-6 w-full">
            <LegalDocument>
              <AnimatedLegalSection title="Acceptance of these terms">
                <p>
                  By accessing or using Tvizzie, you agree to these Terms of Service and to the{' '}
                  <Link
                    className="underline decoration-black/20 underline-offset-4 transition-[color,text-decoration-color] duration-300 ease-out hover:text-black"
                    href="/privacy"
                  >
                    Privacy Policy
                  </Link>
                  . If you do not agree, do not use the service.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="What Tvizzie provides">
                <p>
                  Tvizzie is a web product for discovering films and TV content, signing in,
                  maintaining a profile, tracking what you watch, building lists, writing reviews,
                  and interacting with other user-created content. Some parts of the service rely on
                  third-party providers and data sources.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Accounts and access">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    You are responsible for the accuracy of information you add to your account.
                  </li>
                  <li>
                    You are responsible for activity that happens under your account.
                  </li>
                  <li>
                    You must keep your login credentials and verification codes secure.
                  </li>
                  <li>
                    You may not attempt to gain unauthorized access to other accounts or restricted
                    parts of the service.
                  </li>
                  <li>
                    Tvizzie may suspend or restrict access if account activity appears abusive,
                    fraudulent, automated in a harmful way, or otherwise unsafe for the service or
                    its users.
                  </li>
                </ul>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Your content">
                <p>
                  You retain ownership of content you submit to Tvizzie, such as profile text,
                  ratings, reviews, lists, comments, and other user-generated content.
                </p>
                <p>
                  By posting that content, you give Tvizzie a non-exclusive license to host, store,
                  reproduce, adapt for formatting, and display that content as needed to operate the
                  service and make your content available according to your account settings and the
                  feature you used.
                </p>
                <p>
                  You are responsible for ensuring that the content you publish is lawful and that
                  you have the right to share it.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Acceptable use">
                <p>You agree not to use Tvizzie to:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Break the law or violate another person&apos;s rights.
                  </li>
                  <li>
                    Harass, abuse, threaten, impersonate, or dox other people.
                  </li>
                  <li>
                    Upload malicious code, interfere with the service, or attempt to bypass security
                    controls.
                  </li>
                  <li>
                    Spam the product with automated or repetitive content.
                  </li>
                  <li>
                    Scrape or extract data from the service in a way that harms the product, its
                    users, or its infrastructure.
                  </li>
                  <li>
                    Post content that you do not have the right to publish.
                  </li>
                </ul>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Third-party services and content">
                <p>
                  Tvizzie depends on external providers, including Supabase for core backend
                  services, Google or GitHub for optional sign-in, email delivery providers for
                  account emails, and TMDB or related media sources for movie and TV data. Those
                  services operate under their own terms and privacy policies.
                </p>
                <p>
                  Media metadata, images, and availability information may change, be incomplete, or
                  be removed by those providers. Tvizzie is not responsible for third-party outages
                  or inaccuracies outside its control.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Availability and changes">
                <p>
                  Tvizzie is provided on an evolving basis. Features may be added, changed, limited,
                  or removed without prior notice. We may also modify or discontinue the service, in
                  whole or in part, when needed for technical, security, operational, or product
                  reasons.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Termination">
                <p>
                  You may stop using Tvizzie at any time. Tvizzie may suspend or terminate access to
                  the service if you violate these terms, create risk for the service or other
                  users, or use the product in a way that is abusive or technically harmful.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Disclaimers">
                <p>
                  Tvizzie is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We
                  do not guarantee uninterrupted access, perfect availability, or that every
                  feature, recommendation, profile page, review, or third-party media data point
                  will always be accurate, complete, or current.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Limitation of liability">
                <p>
                  To the maximum extent permitted by applicable law, Tvizzie and its operators will
                  not be liable for indirect, incidental, special, consequential, exemplary, or
                  punitive damages arising out of or related to your use of the service. If
                  liability cannot be excluded, it will be limited to the minimum amount permitted
                  by law.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Changes to these terms">
                <p>
                  We may revise these terms as the product changes. When we do, we will update the
                  date shown at the top of this page. Continued use of Tvizzie after an update means
                  you accept the revised terms.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Contact">
                <p>
                  Questions about these terms can be sent to{' '}
                  <a
                    className="underline decoration-black/20 underline-offset-4 transition-[color,text-decoration-color] duration-300 ease-out hover:text-black"
                    href="mailto:omerdeliavci@outlook.com"
                  >
                    omerdeliavci@outlook.com
                  </a>
                  .
                </p>
              </AnimatedLegalSection>
            </LegalDocument>
          </div>
        </div>
      </LegalPageShell>
    </>
  );
}

export default TermsView;
