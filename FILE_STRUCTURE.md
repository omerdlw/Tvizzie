# File Structure

This document is a developer-facing snapshot of the repository as it exists today.
Last updated: 2026-03-29

## Snapshot

- The codebase is a Next.js App Router application with `home`, `auth`, `movie`, `person`, and `account` surfaces.
- Route files are still concentrated in `app/` and commonly use the route-local split `page.js` + `view.js` + `client.js` + `registry.js`.
- The repository currently contains 526 tracked source/static files when common build folders are excluded.
- File distribution across the main source roots is currently: `app` 135, `features` 107, `modules` 95, `lib` 59, `services` 34, `ui` 27.
- The earlier empty TV API stub, empty feature placeholders, and tracked `.DS_Store` files have been removed.

## Current Structural Notes

- `app/(media)` now contains only active `movie/[id]` and `person/[id]` route surfaces.
- The account surface remains the densest area in the repository:
  - `app/(account)/account/` is now limited to `/account`, `/account/edit`, `/account/lists/new`, and route-local UI composition files.
- `app/(account)/account/[username]/*` is the canonical home for profile-addressed sections such as `activity`, `likes`, `lists`, `reviews`, and `watchlist`.
  - Legacy `/account/{section}` access is resolved through username-aware redirect logic instead of duplicate route trees.
- `services/account/account-route-data.server.js` is now the central server preload layer for account overview and section routes.
- `services/account/current-account-snapshot.server.js` owns signed-in account snapshot resolution, and `features/account/account-registry-config.js` owns reusable account registry config.
- `features/account/section-client-hooks.js` now centralizes shared account section client state, seeded-feed logic, and common load guards.
- `features/account/hooks.js` is now a barrel surface; the large hook implementation was split into `features/account/account-hook-utils.js` and `features/account/account-security-hooks.js`.
- `app/(account)/account/*/loading.js` files now call their route registry directly; the old shared `loading-registry` wrapper has been removed.
- Redirect-only likes subroutes no longer keep unused `client/view/registry/loading` files behind them.
- `services/` is no longer flat. It is now grouped by concern: `account`, `activity`, `browser`, `core`, `media`, `notifications`, `realtime`, `social`, and `tmdb`.
- `lib/auth/servers/` is no longer a single crowded directory. It is now grouped into `account`, `audit`, `notice`, `providers`, `security`, `session`, and `verification`.
- The primary structural pressure points are still `app/(account)/account/`, `features/account/`, `modules/nav/`, and `modules/registry/`.

## Root Roles

- `app/`: App Router routes, route handlers, error/loading boundaries, and page-local composition files.
- `features/`: domain-facing UI composition for account, auth, home, movie, navigation, person, modal, reviews, and layout flows.
- `modules/`: reusable runtime systems such as auth, account state, navigation shell, modal, notification, registry, settings, and transition.
- `lib/`: lower-level helpers, auth server/client helpers, constants, hooks, TMDB helpers, and Supabase wrappers.
- `services/`: integration and data access layer, now grouped by domain instead of living as a single flat directory.
- `ui/`: reusable visual primitives, select/input/button controls, icons, animations, skeletons, and loading indicators.
- `config/`: project-wide config for auth, account, navigation, providers, and static project settings.
- `scripts/`: manual smoke-test utilities.
- `supabase/`: SQL migrations for the Supabase backend.
- `fonts/`, `public/`: static assets and bundled font files.

## Source-Focused Tree

Generated from project root with the usual exclusions: `.git`, `node_modules`, `.next`, `dist`, `build`, and `coverage`.

```text
.
├── app/
│   ├── (home)/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (media)/
│   │   ├── movie/[id]/
│   │   └── person/[id]/
│   ├── (account)/
│   │   └── account/
│   │       ├── edit/
│   │       ├── lists/
│   │       │   ├── new/
│   │       ├── [username]/
│   │       │   ├── activity/
│   │       │   ├── likes/
│   │       │   │   ├── lists/
│   │       │   │   ├── page/[page]/page.js
│   │       │   │   └── reviews/
│   │       │   ├── lists/
│   │       │   │   ├── [slug]/
│   │       │   │   └── page/[page]/page.js
│   │       │   ├── reviews/
│   │       │   ├── watchlist/
│   │       │   │   └── page/[page]/page.js
│   │       │   ├── client.js
│   │       │   ├── error.js
│   │       │   ├── loading.js
│   │       │   ├── not-found.js
│   │       │   ├── page.js
│   │       │   └── registry.js
│   │       ├── client.js
│   │       ├── error.js
│   │       ├── loading.js
│   │       ├── not-found.js
│   │       ├── page.js
│   │       ├── registry.js
│   │       └── view.js
│   ├── api/
│   │   ├── account/
│   │   ├── activity/events/route.js
│   │   ├── auth/
│   │   │   ├── account/
│   │   │   ├── audit/route.js
│   │   │   ├── password-reset/complete/route.js
│   │   │   ├── session/route.js
│   │   │   ├── sign-up/complete/route.js
│   │   │   └── verification/
│   │   ├── collections/route.js
│   │   ├── follows/route.js
│   │   ├── live-updates/
│   │   ├── notifications/
│   │   ├── person/[id]/awards/route.js
│   │   ├── reviews/route.js
│   │   ├── social-proof/route.js
│   │   └── tmdb/
│   │       ├── discover/route.js
│   │       ├── genres/route.js
│   │       ├── movie-images/[id]/route.js
│   │       └── search/route.js
│   ├── error.js
│   ├── global-error.js
│   ├── globals.css
│   ├── layout.js
│   ├── manifest.js
│   ├── not-found.js
│   ├── providers.js
│   ├── sign-in-template/page.js
│   └── template.js
├── features/
│   ├── account/
│   │   ├── account-registry-config.js
│   │   ├── account-hook-utils.js
│   │   ├── account-security-hooks.js
│   │   ├── activity-feed.js
│   │   ├── favorite-showcase-manager.js
│   │   ├── favorites-section.js
│   │   ├── feedback.js
│   │   ├── hero.js
│   │   ├── hooks.js
│   │   ├── list-card.js
│   │   ├── list-creator-utils.js
│   │   ├── media-grid-page.js
│   │   ├── page-shell.js
│   │   ├── profile-layout.js
│   │   ├── review-feed.js
│   │   ├── section-client-hooks.js
│   │   ├── section-nav.js
│   │   ├── section-state.js
│   │   ├── utils.js
│   │   └── watchlist-section.js
│   ├── auth/
│   ├── home/
│   ├── layout/
│   ├── modal/
│   ├── movie/
│   ├── navigation/
│   │   ├── actions/
│   │   │   └── search-action/
│   │   │       ├── parts/item.js
│   │   │       ├── constants.js
│   │   │       ├── index.js
│   │   │       └── utils.js
│   │   ├── masks/
│   │   └── surfaces/
│   ├── person/
│   ├── reviews/
│   │   └── parts/
│   ├── shared/
│   └── README.md
├── modules/
│   ├── account/
│   ├── api/
│   ├── auth/
│   │   └── adapters/
│   ├── background/
│   ├── context-menu/
│   ├── countdown/
│   ├── error-boundary/
│   ├── loading/
│   ├── modal/
│   ├── nav/
│   │   └── hooks/
│   ├── notification/
│   ├── registry/
│   │   └── plugins/
│   ├── settings/
│   └── transition/
├── lib/
│   ├── activity/
│   ├── auth/
│   │   ├── clients/
│   │   └── servers/
│   │       ├── account/
│   │       ├── audit/
│   │       ├── notice/
│   │       ├── providers/
│   │       ├── security/
│   │       ├── session/
│   │       └── verification/
│   ├── constants/
│   ├── data/
│   ├── events/
│   ├── hooks/
│   ├── live-updates/
│   ├── notifications/
│   ├── supabase/
│   ├── tmdb/
│   ├── utils/
│   ├── index.js
│   └── media.js
├── services/
│   ├── account/
│   │   ├── account-feed.server.js
│   │   ├── account-route-data.server.js
│   │   ├── account.server.js
│   │   ├── account.service.js
│   │   └── current-account-snapshot.server.js
│   ├── activity/
│   ├── browser/
│   ├── core/
│   ├── media/
│   ├── notifications/
│   ├── realtime/
│   ├── social/
│   └── tmdb/
├── ui/
│   ├── animations/
│   ├── elements/
│   │   ├── button/
│   │   ├── checkbox/
│   │   ├── input/
│   │   ├── popover/
│   │   ├── select/
│   │   ├── switch/
│   │   ├── textarea/
│   │   ├── tooltip/
│   │   ├── index.js
│   │   └── utils.js
│   ├── icon/
│   ├── loadings/spinner/
│   ├── skeletons/
│   │   ├── components/nav.js
│   │   └── views/
│   └── spinner/
├── config/
│   ├── account.config.js
│   ├── auth.config.js
│   ├── nav.config.js
│   ├── project.config.js
│   └── provider.config.js
├── scripts/
│   ├── auth-signup-complete-smoke.mjs
│   └── supabase-auth-smoke.mjs
├── supabase/
│   └── migrations/
│       ├── 20260327_tvizzie_init_supabase.sql
│       ├── 20260327_auth_support_tables.sql
│       ├── 20260327_fix_claim_username_user_id_conflict.sql
│       ├── 20260328_add_signup_completed_at_to_auth_challenges.sql
│       ├── 20260329_harden_auth_support_rls_and_functions.sql
│       └── 20260329_reduce_disk_io_hot_path_indexes.sql
├── fonts/
│   ├── index.js
│   └── zuume/
├── public/
│   ├── apple-icon.svg
│   ├── icon.svg
│   └── images/
├── ARCHITECTURE.md
├── FILE_STRUCTURE.md
├── eslint.config.mjs
├── jsconfig.json
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── proxy.js
├── react-doctor.config.json
├── tailwind.config.js
└── vercel.json
```

## Hotspots To Keep In Mind

- `app/(account)/account/` is still the densest route area, but the duplicate current-user section routes have been removed and the next simplification target is the remaining `[username]` subtree split.
- `features/account/` remains the largest product feature domain.
- `modules/nav/` and `modules/registry/` still behave like framework-level subsystems and should stay tightly scoped.
- `services/` and `lib/auth/servers/` are now grouped, and account preload/snapshot helpers have also been pulled out of `app/`; future additions should continue following those domain buckets instead of reintroducing flat files or route-adjacent service files.
