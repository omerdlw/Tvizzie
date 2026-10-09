import { LEGAL_CONTACT_EMAIL } from "./constants";
import type { LegalDocument } from "./types";

const para = (text: string) => ({ kind: "paragraph", text }) as const;
const list = (...items: string[]) => ({ items, kind: "list" }) as const;

const contact = `[${LEGAL_CONTACT_EMAIL}](mailto:${LEGAL_CONTACT_EMAIL})`;

export const TERMS: LegalDocument = {
  description: "Rules and conditions for using the Tvizzie service",
  icon: "solar:document-text-bold",
  intro:
    "These terms govern access to and use of Tvizzie, a movie discovery service with accounts, profiles, a watch library, diary, reviews, likes and lists.",
  path: "/terms",
  sections: [
    {
      blocks: [
        para(
          "By accessing or using Tvizzie you agree to these Terms of Service and to the [Privacy Policy](/privacy). If you do not agree, do not use the service.",
        ),
      ],
      title: "Acceptance of these terms",
    },
    {
      blocks: [
        para(
          "Tvizzie is a web product for discovering movies and the people who make them, signing in, keeping a profile, tracking what you watch, building lists, writing reviews and following other people. Parts of the service rely on third-party data sources and providers.",
        ),
      ],
      title: "What Tvizzie provides",
    },
    {
      blocks: [
        list(
          "You are responsible for the accuracy of the information you add to your account.",
          "You are responsible for everything that happens under your account.",
          "You must keep your sign-in methods, passkeys and verification codes secure.",
          "You may not try to gain access to other accounts or to restricted parts of the service.",
          "Tvizzie may suspend or restrict access when activity looks abusive, fraudulent, harmfully automated or otherwise unsafe for the service or its users.",
        ),
      ],
      title: "Accounts and access",
    },
    {
      blocks: [
        para(
          "You keep ownership of what you submit to Tvizzie: profile text, ratings, reviews, lists, comments and other content.",
        ),
        para(
          "By posting it, you give Tvizzie a non-exclusive licence to host, store, reproduce, adapt for formatting and display that content as needed to run the service and to make it available according to your account settings and the feature you used.",
        ),
        para(
          "You are responsible for making sure what you publish is lawful and that you have the right to share it.",
        ),
      ],
      title: "Your content",
    },
    {
      blocks: [
        para("You agree not to use Tvizzie to:"),
        list(
          "break the law or violate another person's rights;",
          "harass, abuse, threaten, impersonate or expose other people;",
          "upload malicious code, interfere with the service or try to bypass its security controls;",
          "spam the service with automated or repetitive content;",
          "scrape or extract data in a way that harms the service, its users or its infrastructure;",
          "post content you do not have the right to publish.",
        ),
      ],
      title: "Acceptable use",
    },
    {
      blocks: [
        para(
          "Tvizzie depends on outside providers: Supabase for authentication, the database and file storage, Google or GitHub for optional sign-in, an email provider for account emails, and TMDB for movie and people data, images and watch-provider availability. They operate under their own terms and privacy policies.",
        ),
        para(
          "That data may change, be incomplete or be removed by those providers. Tvizzie is not responsible for third-party outages or inaccuracies outside its control. This product uses the TMDB API but is not endorsed or certified by TMDB.",
        ),
      ],
      title: "Third-party services and content",
    },
    {
      blocks: [
        para(
          "Tvizzie is provided on an evolving basis. Features may be added, changed, limited or removed without notice, and the service may be modified or discontinued, in whole or in part, for technical, security, operational or product reasons.",
        ),
      ],
      title: "Availability and changes",
    },
    {
      blocks: [
        para(
          "You may stop using Tvizzie at any time, and delete your account from its settings. Tvizzie may suspend or end access if you violate these terms, put the service or other users at risk, or use it in an abusive or technically harmful way.",
        ),
      ],
      title: "Termination",
    },
    {
      blocks: [
        para(
          "Tvizzie is provided “as is” and “as available”. We do not guarantee uninterrupted access, or that every feature, profile, review or piece of third-party data will always be accurate, complete or current.",
        ),
      ],
      title: "Disclaimers",
    },
    {
      blocks: [
        para(
          "To the maximum extent permitted by law, Tvizzie and its operators are not liable for indirect, incidental, special, consequential, exemplary or punitive damages arising from your use of the service. Where liability cannot be excluded, it is limited to the minimum the law allows.",
        ),
      ],
      title: "Limitation of liability",
    },
    {
      blocks: [
        para(
          "These terms may be revised as the product changes. When they are, the date at the top of this page changes with them. Using Tvizzie after an update means you accept the revised terms.",
        ),
      ],
      title: "Changes to these terms",
    },
    {
      blocks: [para(`Questions about these terms can be sent to ${contact}.`)],
      title: "Contact",
    },
  ],
  title: "Terms of Service",
};

export const PRIVACY: LegalDocument = {
  description: "How Tvizzie processes account, profile and usage data",
  icon: "solar:shield-user-bold",
  intro:
    "This policy explains what information Tvizzie processes, why, and what choices you have. It describes the product and the infrastructure it runs on today.",
  path: "/privacy",
  sections: [
    {
      blocks: [
        para(
          "Tvizzie is a movie discovery app: you can sign in, keep a profile, track what you watch, build lists, write reviews and follow other people. We only collect what is needed to run those features, keep accounts secure and keep the service reliable.",
        ),
        para(`Privacy questions can be sent to ${contact}.`),
      ],
      title: "Overview",
    },
    {
      blocks: [
        para("Depending on how you use Tvizzie, we process:"),
        list(
          "**Account information:** your email address, username, display name, how you sign in and basic profile details.",
          "**Profile content you add:** avatar, banner and background images, biography, and whether your account is private.",
          "**What you do in the app:** watched movies, your diary, watchlist, likes and favorites, lists and the movies in them, ratings, reviews and comments, the reviews and lists you like, and who you follow and who follows you. Each stores a small copy of the movie's title and poster so your pages load without asking TMDB again.",
          "**Notifications and activity:** the events your actions produce, such as a new follower or a like on your review, and the activity feed built from what you do.",
          "**Security and session data:** a record of each signed-in device (browser, approximate address and when it was last used), a log of security events such as sign-ins and passkey changes, and the cookies that keep you signed in.",
          "**Local browser storage:** preferences such as the poster or background you picked for a movie or person, and short-lived state of the sign-in flow. It stays in your browser.",
        ),
      ],
      title: "Information we collect",
    },
    {
      blocks: [
        list(
          "If you sign in with Google or GitHub, we may receive the basic details that provider shares: your email address, name and profile image.",
          "Movie and people data, images and where a movie can be watched come from TMDB. They are used to power browsing and are not used to identify you.",
        ),
      ],
      title: "Information we receive from third parties",
    },
    {
      blocks: [
        list(
          "To create your account and sign you in securely.",
          "To let you edit your profile and publish the content you choose to share.",
          "To run the social features: reviews, likes, lists, follows, notifications, the activity feed, search and profile pages.",
          "To send verification and account-security emails.",
          "To detect abuse, limit request rates, protect the service and enforce the Terms of Service.",
          "To investigate bugs and improve performance and reliability.",
        ),
      ],
      title: "How we use information",
    },
    {
      blocks: [
        para(
          "A public profile can be seen by anyone: your username, display name, avatar, biography, library, favorites, lists, reviews, likes and activity, depending on the feature. Public content can also be found through search.",
        ),
        para(
          "If you make your profile private, only people whose follow request you accepted can see those sections, and your lists, reviews and activity stop appearing to everyone else, search included. Private mode is a control inside the app, not an absolute guarantee against every possible exposure or cached copy.",
        ),
      ],
      title: "When information is visible to other people",
    },
    {
      blocks: [
        para(
          "Tvizzie does not sell your personal information. It is processed by providers that help run the service:",
        ),
        list(
          "**Supabase** for authentication, database and file storage, and realtime features.",
          "**Google** or **GitHub** when you choose those sign-in methods.",
          "**An email delivery provider** for verification and account-security emails.",
          "**Upstash** for short-lived rate-limiting counters tied to your address.",
          "**Hosting and infrastructure providers** that deliver the app and may process standard request metadata and logs.",
          "**TMDB and its image servers**, which receive the requests your browser makes to load movie data and artwork.",
        ),
      ],
      title: "How information is shared",
    },
    {
      blocks: [
        para(
          "Tvizzie uses cookies and similar browser storage to keep you signed in, protect your session, remember preferences and support parts of the interface. Some of it is necessary for the app to work, such as the sign-in cookies. Some is for convenience, such as your artwork choices.",
        ),
      ],
      title: "Cookies and local storage",
    },
    {
      blocks: [
        para(
          "We keep account and content data as long as it is needed to run the service and keep what you chose to store. Session records and the security log are pruned regularly. Deleting something removes it from the app straight away, though copies may remain in backups or logs for a while. Deleting your account removes your profile and everything tied to it, including your follows, which also corrects the other side's counts.",
        ),
      ],
      title: "Retention",
    },
    {
      blocks: [
        list(
          "You can edit your profile in the app, and switch your account between public and private in its settings.",
          "You can remove your reviews, lists, library entries and other content.",
          "You can end any of your signed-in devices from your account's security settings.",
          "You can delete your account from its settings.",
        ),
      ],
      title: "Your choices",
    },
    {
      blocks: [
        para(
          "Tvizzie is not meant for children below the age at which the law lets them create an account on their own. Do not use the service if you are not legally allowed to.",
        ),
      ],
      title: "Children",
    },
    {
      blocks: [
        para(
          "This policy may be updated as the product changes. When it is, the date at the top of this page changes with it.",
        ),
        para("Please also read the [Terms of Service](/terms)."),
      ],
      title: "Changes to this policy",
    },
  ],
  title: "Privacy Policy",
};
