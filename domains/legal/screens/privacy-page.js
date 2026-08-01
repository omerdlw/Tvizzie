'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import LegalNavRegistry from '@/domains/legal/screens/legal-registry';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { PageGradientShell } from '@/ui/components/page-gradient-shell';
import {
  articleContainerVariants,
  asideVariants,
  headerContainerVariants,
  listItemVariants,
  pageContainerVariants,
  sectionItemVariants,
  titleVariants,
} from '@/domains/legal/screens/legal-animation';

const LAST_UPDATED = 'April 20, 2026';

function AnimatedLegalSection({ children, title }) {
  return (
    <motion.section variants={sectionItemVariants} className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-black sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-black/72 sm:text-[15px]">{children}</div>
    </motion.section>
  );
}

export default function PrivacyView() {
  return (
    <>
      <LegalNavRegistry
        title="Privacy Policy"
        description="How Tvizzie processes account, profile, and usage data"
        icon="solar:shield-user-bold"
      />
      <PageGradientShell className="overflow-hidden">
        <motion.div
          className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-10 px-4 pt-24 pb-20 sm:px-6 sm:pt-28`}
          variants={pageContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.header variants={headerContainerVariants} className="max-w-3xl space-y-4">
            <motion.p variants={titleVariants} className="text-[11px] font-semibold tracking-[0.22em] text-black/48 uppercase">
              Legal
            </motion.p>
            <div className="space-y-3">
              <motion.h1 variants={titleVariants} className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                Privacy Policy
              </motion.h1>
              <motion.p variants={titleVariants} className="max-w-2xl text-sm leading-7 text-black/68 sm:text-[15px]">
                This policy explains what information Tvizzie processes, why it is processed, and what choices you have. It is written to reflect the current product and infrastructure used by the app today.
              </motion.p>
            </div>
            <motion.p variants={titleVariants} className="text-xs tracking-wide text-black/44 uppercase">
              Last updated {LAST_UPDATED}
            </motion.p>
          </motion.header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <motion.article variants={articleContainerVariants} className="bg-primary space-y-8 border border-black/5 p-6 sm:p-8">
              <AnimatedLegalSection title="Overview">
                <p>
                  Tvizzie is a movie and TV discovery app that lets people sign in, manage a profile,
                  track what they watch, build lists, publish reviews, and interact with other public
                  content. We only try to collect the information needed to operate those features, secure
                  accounts, and improve reliability.
                </p>
                <p>
                  If you have privacy questions, you can contact{' '}
                  <a
                    className="underline decoration-black/20 underline-offset-4 hover:text-black transition-colors"
                    href="mailto:omerdeliavci@outlook.com"
                  >
                    omerdeliavci@outlook.com
                  </a>
                  .
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Information we collect">
                <p>
                  Depending on how you use Tvizzie, we may process the following categories of
                  information:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <motion.li variants={listItemVariants}>
                    Account information, such as your email address, username, display name,
                    authentication provider, and basic profile details.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    Profile content you choose to add, such as an avatar, banner image, biography, profile
                    description, and account privacy setting.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    Content you create inside the app, such as watched titles, watchlist items, favorites,
                    ratings, reviews, liked reviews, liked lists, custom lists, and comments on lists.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    Messages you send through the product feedback flow, along with limited request
                    metadata such as referrer and user agent when feedback is submitted.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    Security and session data used to sign you in and protect your account, including
                    authentication cookies, CSRF tokens, short-lived verification state, trusted-device
                    markers, and account-security audit events.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    Performance and diagnostics data, including Web Vitals measurements such as CLS, FCP,
                    INP, LCP, TTFB, the current pathname, and a generated metric identifier.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    Local browser storage used for app preferences and temporary client-side state, such
                    as poster/background preferences, movie image cache entries, settings storage, and
                    short-lived auth helper state.
                  </motion.li>
                </ul>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Information we receive from third parties">
                <ul className="list-disc space-y-2 pl-5">
                  <motion.li variants={listItemVariants}>
                    If you sign in with Google or GitHub, Tvizzie may receive basic account details made
                    available by that provider, such as your email address, name, and profile image.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    Movie, TV, person, genre, and artwork data shown in the product is fetched from
                    third-party media sources, primarily TMDB. That content is used to power discovery and
                    browsing features, not to identify you.
                  </motion.li>
                </ul>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="How we use information">
                <ul className="list-disc space-y-2 pl-5">
                  <motion.li variants={listItemVariants}>To create and maintain your account and sign you in securely.</motion.li>
                  <motion.li variants={listItemVariants}>To let you edit your profile and publish the content you choose to share.</motion.li>
                  <motion.li variants={listItemVariants}>
                    To operate social features such as reviews, likes, lists, activity feeds, and profile
                    pages.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    To send verification and account-security emails, including sign-in, sign-up, password
                    reset, and account-change codes.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    To respond to product feedback, investigate bugs, and improve performance and
                    reliability.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    To detect abuse, protect the service, and enforce the rules described in our Terms of
                    Service.
                  </motion.li>
                </ul>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="When information is visible to other people">
                <p>
                  Tvizzie includes public-facing profile and content features. If your profile is public,
                  other users may be able to view information such as your username, display name, avatar,
                  biography, watched titles, watchlist, favorites, lists, reviews, likes, and activity
                  history, depending on the feature.
                </p>
                <p>
                  If you switch your profile to private, the app restricts access to profile sections for
                  other users. Private mode is an app-level control, not an absolute guarantee against
                  every possible exposure or cached copy.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="How information is shared">
                <p>
                  Tvizzie does not sell your personal information. We may share or process information
                  with service providers that help run the app:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <motion.li variants={listItemVariants}>
                    <strong>Supabase</strong> for authentication, database storage, file storage, realtime
                    features, and server-side functions.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    <strong>Google</strong> or <strong>GitHub</strong> when you choose those OAuth sign-in
                    methods.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    <strong>SMTP or Brevo</strong> for transactional email delivery, including
                    verification codes and account security emails.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    <strong>Hosting and infrastructure providers</strong> that deliver the web app and may
                    process standard request metadata and logs.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    <strong>TMDB and related image endpoints</strong> to load movie and TV metadata,
                    posters, backdrops, and related media assets.
                  </motion.li>
                </ul>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Cookies and local storage">
                <p>
                  Tvizzie uses cookies and similar browser storage to keep you signed in, maintain
                  security state, remember app preferences, and support parts of the UI. Some storage is
                  necessary for the app to function, including authentication cookies and CSRF protection.
                  Some storage is used for convenience, such as visual preferences and temporary cached
                  media data.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Retention">
                <p>
                  We keep account and content data for as long as it is needed to operate the service,
                  comply with legitimate security needs, and preserve the content you choose to keep in
                  your account. If you delete content, it may disappear from active views before it
                  disappears from backups or logs. If you delete your account, we aim to remove or
                  deactivate associated account data within the normal operation of the product, subject
                  to limited retention for security, abuse prevention, and system integrity.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Your choices">
                <ul className="list-disc space-y-2 pl-5">
                  <motion.li variants={listItemVariants}>You can edit your profile information inside the app.</motion.li>
                  <motion.li variants={listItemVariants}>You can change your profile privacy setting inside your account settings.</motion.li>
                  <motion.li variants={listItemVariants}>
                    You can remove reviews, list content, watched items, watchlist items, and other
                    profile content that you created.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    You can request account deletion through the account settings flow if that option is
                    available on your account.
                  </motion.li>
                  <motion.li variants={listItemVariants}>
                    You can stop using OAuth sign-in methods and use password-based access where supported
                    by your account configuration.
                  </motion.li>
                </ul>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Children">
                <p>
                  Tvizzie is not intended for children under the age required by the laws that apply to
                  them to create an account on their own. Do not use the service if you are not legally
                  allowed to do so.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Changes to this policy">
                <p>
                  We may update this policy as the product changes. When we do, we will update the date at
                  the top of this page. Material changes should be reviewed before the service is promoted
                  broadly or submitted for formal platform verification.
                </p>
              </AnimatedLegalSection>

              <AnimatedLegalSection title="Related document">
                <p>
                  Please also review the{' '}
                  <Link className="underline decoration-black/20 underline-offset-4 hover:text-black transition-colors" href="/terms">
                    Terms of Service
                  </Link>
                  .
                </p>
              </AnimatedLegalSection>
            </motion.article>

            <motion.aside variants={asideVariants} className="p-5 text-sm leading-7 text-black/70">
              <p className="font-semibold text-black">Quick links</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link className="hover:text-black transition-colors" href="/privacy">
                  Privacy Policy
                </Link>
                <Link className="hover:text-black transition-colors" href="/terms">
                  Terms of Service
                </Link>
                <a className="hover:text-black transition-colors" href="mailto:tvizzie.app@gmail.com">
                  tvizzie.app@gmail.com
                </a>
              </div>
            </motion.aside>
          </div>
        </motion.div>
      </PageGradientShell>
    </>
  );
}
