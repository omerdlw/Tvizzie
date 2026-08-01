# Tvizzie Application Architecture

This repository is organized around product domains while preserving `core/modules/` as an immutable shared foundation.

## Top-level responsibilities

- `app/` contains only Next.js route adapters, layouts, framework special files, and application bootstrap. Product screens and API workflows do not live here.
- `core/modules/` is the shared black-box foundation. It must not be edited, renamed, or restructured.
- `domains/` contains product capabilities. Movies, TV, and people are one `media` domain.
- `infrastructure/` contains Supabase, TMDB, HTTP, realtime, jobs, and runtime integrations.
- `shared/` contains domain-neutral constants, hooks, and pure libraries.
- `ui/primitives/` contains universal controls and interaction primitives only.
- `ui/components/` contains reusable application-level components used by more than one domain.
- `ui/feedback/` contains cross-domain loading, empty, error, and confirmation feedback.
- `assets/` contains build-time assets such as fonts.
- `public/` contains directly served static assets.
- `scripts/` contains development and architecture checks.

## Dependency direction

```text
app -> domains -> infrastructure -> shared
             \-> core/modules
ui -> shared
shared -> no app, domains, or infrastructure
```

Domain-specific UI stays inside its domain. For example, review cards live in
`domains/reviews/components`, media cards and media overlays live in
`domains/media/ui`, and account overlays live in `domains/account/ui`. A file is
not promoted to `ui/` merely because it renders JSX.

The route rule is mechanical: `app/` may contain Next.js special files such as
`page.js`, `loading.js`, `not-found.js`, `error.js`, and `route.js`, but generic
implementation names such as `client.js`, `view.js`, `motion.js`, and
`registry.js` are prohibited there. API workflows belong to a domain or
infrastructure adapter and are imported by a thin route file.

The immutable foundation is allowed to retain compatibility imports for the application-owned contracts it already consumes. Those contracts are redirected through `jsconfig.json` without changing files inside `core/modules/`.

## Naming and consolidation

Application-owned code uses explicit kebab-case names and runtime suffixes such as `.server.js` or `.client.js` only where they describe a real boundary. New generic `utils`, `helpers`, `parts`, and unexplained `index.js` files are prohibited. Files are consolidated when they do not represent an independent responsibility.

Run `npm run check:architecture` to verify the high-level boundaries before linting and building.
