import Link from 'next/link';

import LegalNavRegistry from '@/features/legal/registry';
import { LegalPageShell, LegalSection } from '@/features/legal/page-shell';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Tvizzie collects, uses, and protects personal data.',
  alternates: {
    canonical: '/privacy',
  },
};

const LAST_UPDATED = 'April 20, 2026';

export default function PrivacyPage() {
  return (
    <>
      <LegalNavRegistry
        title="Privacy Policy"
        description="How Tvizzie processes account, profile, and usage data"
        icon="solar:shield-user-bold"
      />
      <LegalPageShell
        title="Privacy Policy"
        description="This policy explains what information Tvizzie processes, why it is processed, and what choices you have. It is written to reflect the current product and infrastructure used by the app today."
        lastUpdated={LAST_UPDATED}
      >
        <LegalSection title="Overview">
          <p>
            Tvizzie is a movie and TV discovery app that lets people sign in, manage a profile, track what they watch,
            build lists, publish reviews, and interact with other public content. We only try to collect the information
            needed to operate those features, secure accounts, and improve reliability.
          </p>
          <p>
            If you have privacy questions, you can contact{' '}
            <a className="underline decoration-white/20 underline-offset-4" href="mailto:omerdeliavci@outlook.com">
              omerdeliavci@outlook.com
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection title="Information we collect">
          <p>Depending on how you use Tvizzie, we may process the following categories of information:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Account information, such as your email address, username, display name, authentication provider, and
              basic profile details.
            </li>
            <li>
              Profile content you choose to add, such as an avatar, banner image, biography, profile description, and
              account privacy setting.
            </li>
            <li>
              Content you create inside the app, such as watched titles, watchlist items, favorites, ratings, reviews,
              liked reviews, liked lists, custom lists, and comments on lists.
            </li>
            <li>
              Messages you send through the product feedback flow, along with limited request metadata such as referrer
              and user agent when feedback is submitted.
            </li>
            <li>
              Security and session data used to sign you in and protect your account, including authentication cookies,
              CSRF tokens, short-lived verification state, trusted-device markers, and account-security audit events.
            </li>
            <li>
              Performance and diagnostics data, including Web Vitals measurements such as CLS, FCP, INP, LCP, TTFB, the
              current pathname, and a generated metric identifier.
            </li>
            <li>
              Local browser storage used for app preferences and temporary client-side state, such as poster/background
              preferences, movie image cache entries, settings storage, and short-lived auth helper state.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Information we receive from third parties">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              If you sign in with Google or GitHub, Tvizzie may receive basic account details made available by that
              provider, such as your email address, name, and profile image.
            </li>
            <li>
              Movie, TV, person, genre, and artwork data shown in the product is fetched from third-party media sources,
              primarily TMDB. That content is used to power discovery and browsing features, not to identify you.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="How we use information">
          <ul className="list-disc space-y-2 pl-5">
            <li>To create and maintain your account and sign you in securely.</li>
            <li>To let you edit your profile and publish the content you choose to share.</li>
            <li>To operate social features such as reviews, likes, lists, activity feeds, and profile pages.</li>
            <li>
              To send verification and account-security emails, including sign-in, sign-up, password reset, and
              account-change codes.
            </li>
            <li>To respond to product feedback, investigate bugs, and improve performance and reliability.</li>
            <li>To detect abuse, protect the service, and enforce the rules described in our Terms of Service.</li>
          </ul>
        </LegalSection>

        <LegalSection title="When information is visible to other people">
          <p>
            Tvizzie includes public-facing profile and content features. If your profile is public, other users may be
            able to view information such as your username, display name, avatar, biography, watched titles, watchlist,
            favorites, lists, reviews, likes, and activity history, depending on the feature.
          </p>
          <p>
            If you switch your profile to private, the app restricts access to profile sections for other users. Private
            mode is an app-level control, not an absolute guarantee against every possible exposure or cached copy.
          </p>
        </LegalSection>

        <LegalSection title="How information is shared">
          <p>
            Tvizzie does not sell your personal information. We may share or process information with service providers
            that help run the app:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Supabase</strong> for authentication, database storage, file storage, realtime features, and
              server-side functions.
            </li>
            <li>
              <strong>Google</strong> or <strong>GitHub</strong> when you choose those OAuth sign-in methods.
            </li>
            <li>
              <strong>SMTP or Brevo</strong> for transactional email delivery, including verification codes and account
              security emails.
            </li>
            <li>
              <strong>Hosting and infrastructure providers</strong> that deliver the web app and may process standard
              request metadata and logs.
            </li>
            <li>
              <strong>TMDB and related image endpoints</strong> to load movie and TV metadata, posters, backdrops, and
              related media assets.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Cookies and local storage">
          <p>
            Tvizzie uses cookies and similar browser storage to keep you signed in, maintain security state, remember
            app preferences, and support parts of the UI. Some storage is necessary for the app to function, including
            authentication cookies and CSRF protection. Some storage is used for convenience, such as visual preferences
            and temporary cached media data.
          </p>
        </LegalSection>

        <LegalSection title="Retention">
          <p>
            We keep account and content data for as long as it is needed to operate the service, comply with legitimate
            security needs, and preserve the content you choose to keep in your account. If you delete content, it may
            disappear from active views before it disappears from backups or logs. If you delete your account, we aim to
            remove or deactivate associated account data within the normal operation of the product, subject to limited
            retention for security, abuse prevention, and system integrity.
          </p>
        </LegalSection>

        <LegalSection title="Your choices">
          <ul className="list-disc space-y-2 pl-5">
            <li>You can edit your profile information inside the app.</li>
            <li>You can change your profile privacy setting inside your account settings.</li>
            <li>
              You can remove reviews, list content, watched items, watchlist items, and other profile content that you
              created.
            </li>
            <li>
              You can request account deletion through the account settings flow if that option is available on your
              account.
            </li>
            <li>
              You can stop using OAuth sign-in methods and use password-based access where supported by your account
              configuration.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Children">
          <p>
            Tvizzie is not intended for children under the age required by the laws that apply to them to create an
            account on their own. Do not use the service if you are not legally allowed to do so.
          </p>
        </LegalSection>

        <LegalSection title="Changes to this policy">
          <p>
            We may update this policy as the product changes. When we do, we will update the date at the top of this
            page. Material changes should be reviewed before the service is promoted broadly or submitted for formal
            platform verification.
          </p>
        </LegalSection>

        <LegalSection title="Related document">
          <p>
            Please also review the{' '}
            <Link className="underline decoration-white/20 underline-offset-4" href="/terms">
              Terms of Service
            </Link>
            .
          </p>
        </LegalSection>
      </LegalPageShell>
    </>
  );
}
