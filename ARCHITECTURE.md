# Tvizzie Application Architecture

This repository is organized around product domains while preserving `modules/` as a dedicated shared foundation.

## Top-level responsibilities

- `app/` contains only Next.js route adapters, layouts, framework special files, and application bootstrap. Product screens and API workflows do not live here.
- `modules/` is the shared foundation for cross-project runtime capabilities. It is a root-level dependency boundary, not an application domain. Its internal APIs may evolve, but application code must consume them through stable module entrypoints.
- `domains/` contains product capabilities. Movies, TV, and people are one `media` domain.
- `infrastructure/` contains Supabase, TMDB, HTTP, realtime, jobs, and runtime integrations.
- `shared/` contains domain-neutral constants, hooks, and pure libraries.
- `ui/primitives/` contains universal controls, image/visual primitives, and interaction primitives only.
- `ui/layout/` contains domain-neutral layout helpers such as page shells and navigation spacers.
- `ui/feedback/` contains cross-domain loading, empty, error, and confirmation feedback.
- `assets/` contains build-time assets such as fonts.
- `public/` contains directly served static assets.
- `scripts/` contains development and architecture checks.

## Dependency direction

```text
app -> domains -> infrastructure -> shared
             \-> modules
ui -> shared
shared -> no app, domains, or infrastructure
```

Domain-specific UI stays inside its domain. For example, review cards live in
`domains/reviews/components`, media cards and media overlays live in
`domains/media/ui`, and account overlays live in `domains/account/ui`. A file is
not promoted to `ui/` merely because it renders JSX. Domain screen modules live
directly under the domain's `ui/` boundary; a parallel `screens/` directory is
not allowed.

The account domain uses explicit ownership boundaries rather than generic
folders. Its UI route composition lives in named `account-*-factory/state`
modules at the UI root; account presentation primitives such as the layout,
section, media grid, and pagination also live there. Its deeper folders are
reserved for cohesive collections of feeds, filters, hooks, lists, modals, and
overview sections. Account server code is grouped by `profile`, `collections`,
`feed`, `media`, `routes`, and `api`; a flat list of `account-*` implementation
files is not allowed.

The route rule is mechanical: `app/` may contain Next.js special files such as
`page.js`, `loading.js`, `not-found.js`, `error.js`, and `route.js`, but generic
implementation names such as `client.js`, `view.js`, `motion.js`, and
`registry.js` are prohibited there. API workflows belong to a domain or
infrastructure adapter and are imported by a thin route file. Domain page
implementations are named `*-view.js`; `page.js` never appears inside `domains/`.

`loading.js` and `error.js` are segment boundaries, not mandatory directory
decorations. Add them at the smallest route group that benefits from streaming
or error isolation. Do not duplicate them for every leaf route when one group
boundary covers the same behavior.

The foundation may depend on application-owned contracts only through explicit, reviewed adapters. There are no `@/core/*` compatibility aliases; foundation imports use `@/modules/*` and application code must not recreate a second `core` namespace.

## Naming and consolidation

Application-owned code uses explicit kebab-case names. A filename should identify
both the subject and the behavior: `profile-read.server.js`,
`collection-shared.server.js`, and `follow-service.js` are valid; bare names such
as `service.js`, `shared.js`, `context.js`, or `read.server.js` are not. Dots are
reserved for runtime qualifiers (`.server.js` and `.client.js`); concept words
and behavior qualifiers use dashes. `index.js` is allowed only as a deliberate
public barrel entrypoint. Files are consolidated when they do not represent an
independent responsibility.

Run `npm run check:architecture` to verify the high-level boundaries before linting and building.
