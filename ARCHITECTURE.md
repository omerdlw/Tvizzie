# Architecture

This document defines the current developer-facing architecture rules for the repository. It is intentionally conservative and designed to stabilize the codebase before any broader reorganization.

## Root Responsibilities

- `app/`: Next.js App Router entrypoints, route handlers, and page-local route composition.
- `features/`: domain-level UI composition for product flows and route-facing behaviors.
- `modules/`: cross-cutting runtime systems such as auth, account, nav, modal, registry, settings, loading, and notifications.
- `services/`: data access and integration logic.
- `ui/`: reusable presentational primitives, shared visual components, and low-level skeleton/loading surfaces.
- `lib/`: shared constants and framework-agnostic helpers.
- `config/`: project and runtime configuration.

## Ownership Contract

- `app/` owns only route entrypoints and route-local orchestration.
- `app/` may assemble `features`, `modules`, `services`, `ui`, `lib`, and `config`, but must not become a general-purpose home for reusable domain code.
- `features/` owns route-facing domain UI and domain-specific composition.
- `features/` may contain domain hooks and local helpers when they are specific to that feature surface.
- `features/` must not own global providers, adapters, storage clients, registry infrastructure, or framework-wide runtime systems.
- `modules/` owns reusable runtime systems that are not specific to a single route or product surface.
- `modules/` is the right home for providers, contexts, reusable state containers, shell systems, overlay systems, and registry infrastructure.
- `modules/` must not absorb page-specific account sections, media detail sections, or other domain presentation that belongs to `features/`.
- `services/` owns data access, external integrations, cross-request workflows, and backend-facing orchestration.
- `services/` is the right home for TMDB calls, Supabase reads/writes, feed assembly, notification persistence, and similar integration-heavy operations.
- `services/` must not own React components, route shells, context providers, or low-level generic helpers that are not integration-specific.
- `lib/` owns low-level helpers, constants, pure utilities, leaf server helpers, and thin client/server wrappers.
- `lib/` should stay as close to framework-agnostic as practical and should not become a second `services/` or a second `modules/`.
- `ui/` owns reusable presentational primitives and visual building blocks.
- `ui/` must not contain product-domain behavior.
- `config/` owns project wiring, adapter binding, feature flags, and environment-dependent static setup.

## Canonical Ownership By Concern

- Auth UI belongs in `features/auth/`.
- Auth runtime state, guards, adapters, and session context belong in `modules/auth/`.
- Auth server-side primitives and request-safe helpers belong in `lib/auth/servers/` and `lib/auth/clients/`.
  - `lib/auth/servers/account/`: account bootstrap, account state, deletion rules.
  - `lib/auth/servers/audit/`: auth audit logging.
  - `lib/auth/servers/notice/`: auth-route notices.
  - `lib/auth/servers/providers/`: provider-specific auth helpers.
  - `lib/auth/servers/security/`: csrf, rate-limit, password security, reauth, and step-up.
  - `lib/auth/servers/session/`: session parsing, authenticated requests, admin facade, request context.
  - `lib/auth/servers/verification/`: email/login/signup/password-reset verification flows.
- Auth provider/project binding belongs in `config/auth.config.js`.
- Account/profile runtime state for the signed-in user belongs in `modules/account/`.
- Account/profile page composition belongs in `features/account/`.
- Reusable account nav/registry composition belongs in `features/account/registry-config.js`.
- Account feed entrypoints should be organized per account subpage in `features/account/feeds/<subpage>.js`.
- Overview preview sections belong in `features/account/overview/*` and should not host subpage-specific mechanics.
- Account data fetching, persistence, feeds, lists, likes, watchlist, and related backend operations belong in `services/account/`, `services/media/`, `services/social/`, and adjacent service folders.
- Route preload and signed-in account snapshot resolution belong in `services/account/account-route-data.server.js` and `services/account/current-account-snapshot.server.js`, not in `app/`.
- Route-specific account entrypoints belong in `app/(account)/account/**`.
- Navigation shell state and reusable nav mechanics belong in `modules/nav/`.
- Navigation action presentation and route-facing nav surfaces belong in `features/navigation/`.
- Registry infrastructure belongs in `modules/registry/`.
- Modal infrastructure belongs in `modules/modal/`; concrete product modals belong in `features/modal/`.
- Notifications infrastructure belongs in `modules/notification/`; notification persistence and event processing belong in `services/` and `lib/notifications/`.
- Media detail presentation belongs in `features/movie/` and `features/person/`.
- Reusable visual controls belong in `ui/elements/`, `ui/icon/`, `ui/animations/`, and `ui/skeletons/`.
- Service buckets should follow the current grouped structure: `account`, `activity`, `browser`, `core`, `media`, `notifications`, `realtime`, `social`, `tmdb`.

## Route File Split Policy

- Default route shape is `page.js` only.
- Add `view.js` only when server-side page composition becomes large enough to deserve a dedicated route-local surface.
- Add `client.js` only when a real client boundary is needed for interactivity, browser hooks, or client-only providers.
- Add `registry.js` only when the route has route-local registry composition that is not reusable elsewhere.
- Do not create `view.js`, `client.js`, or `registry.js` preemptively.
- If a route-local file becomes reusable across routes, move it out of `app/` into `features/`, `modules/`, `ui/`, `services/`, or `lib/` based on ownership.

## Placement Rules

- If code renders domain UI for a specific product surface, prefer `features/`.
- If code exposes a reusable provider, overlay, shell, or state machine, prefer `modules/`.
- If code talks to Supabase, TMDB, or another backend/integration boundary, prefer `services/`.
- If code is a pure helper, constant, formatter, or thin server/client wrapper, prefer `lib/`.
- If code is a reusable button, input, select, icon, animation, skeleton, or low-level presentational primitive, prefer `ui/`.
- If code only exists to compose a route, keep it in `app/`.

## Transitional Anti-Rules

- Do not add new empty placeholder directories.
- Do not add route-local helpers under `lib/` just to avoid choosing a feature owner.
- Do not add reusable runtime state into `features/`.
- Do not add domain-specific presentation into `modules/`.
- Do not add integration-heavy business logic into `app/`.
- Do not add generic helpers into `services/` unless they are directly tied to integration/data workflows.

## Import Boundaries

The allowed dependency direction for Sprint 1 is:

- `app -> features, modules, services, ui, lib, config`
- `features -> features, modules, services, ui, lib, config`
- `modules -> modules, ui, lib, config`
- `services -> services, lib, config`
- `ui -> ui, lib, config`
- `lib -> lib, config`

Anything outside those edges is considered an architecture violation.

## Canonical Shared Surfaces

- `@/modules/registry`: canonical home for `useRegistry` and registry actions/state hooks.
- `@/modules/account`: canonical home for current-account state, account bootstrap, and reusable account adapter contracts.
- `@/modules/settings`: canonical home for settings providers/hooks and `SettingsModal`.
- `@/features/navigation/actions/styles`: canonical nav action primitive styles.
- `@/lib/constants`: canonical home for shared shell/layout constants.
- `config/auth.config.js`: project binding point for auth adapters, providers, endpoints, and profile lookup integrations.
- `config/account.config.js`: project binding point for account adapters, account bootstrap payload resolution, and current-account subscription wiring.
- `config/project.config.js`: project binding point for static feature flags and registry debug controls.
- project services must bind into modules through config or adapter options, not direct module imports
- `modules/nav` currently consumes `features/navigation/actions` for action presentation primitives; this is a deliberate local exception to the generic module boundary.

## Auth Boundary

- `modules/auth` owns authentication, session state, provider linking, and auth guards.
- account/profile lifecycle does not belong inside `modules/auth`; it should compose on top of auth through `modules/account`.

## Account Boundary

- `modules/account` owns reusable account bootstrap, current-account state, and account adapter contracts.
- `modules/account` may depend on `modules/auth`, but `modules/auth` must not depend on `modules/account`.
- Tvizzie-specific account storage and profile rules belong in `config/account.config.js` and `services/account/account.service.js`, not in `modules/account`.
- route-level account experiences such as watchlist, likes, reviews, lists, and profile page composition remain feature-owned.
- `/account` is the signed-in entry route, but section pages should prefer the canonical `/account/[username]/*` surface; do not reintroduce duplicate current-user section trees under `app/(account)/account/`.
- `app/(account)/account/*/loading.js` should call the route registry directly with explicit loading props; do not reintroduce a shared loading-registry wrapper.

## Sprint 1 Goals

- remove existing `modules -> features`, `ui -> features`, and `lib -> modules` violations
- enforce the boundary matrix with ESLint
- keep the current top-level taxonomy intact while restoring predictable dependency flow
