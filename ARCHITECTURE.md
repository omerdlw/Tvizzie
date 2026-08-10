# Tvizzie Application Architecture

This repository is organized around product domains while preserving `core/` as a dedicated shared foundation.

## Top-level responsibilities

- `app/` contains only Next.js route adapters, layouts, framework special files, and application bootstrap. Product screens and API workflows do not live here.
- `core/` is the shared foundation for cross-project runtime capabilities, reusable visual elements, and common utilities:
  - `core/modules/` provides headless state engines, protocols, and adapters (Auth, Nav, Modal, Registry, etc.). Its internal APIs may evolve, but application code must consume them through stable module entrypoints.
  - `core/ui/` contains universal controls, visual/primitive components (Button, Icon, Checkbox, etc.), and motion animations.
  - `core/shared/` contains domain-neutral utils, custom hooks, and pure helper libraries.
- `domains/` contains product capabilities. Movies, TV, and people are one `media` domain.
- `infrastructure/` contains Supabase, TMDB, HTTP, realtime, jobs, and runtime integrations.
- `assets/` contains build-time assets such as fonts.
- `public/` contains directly served static assets.

## Dependency direction

```text
app -> domains -> infrastructure -> shared
             \-> core/modules
core/ui -> core/shared
core/shared -> no app, domains, or infrastructure
```

Domain-specific UI stays inside its domain. For example, review cards live in
`domains/reviews/components`, media cards and media overlays live in
`domains/media/ui`, and account overlays live in `domains/account/ui`. A file is
not promoted to `core/ui/` merely because it renders JSX. Domain screen modules live
directly under the domain's `ui/` boundary; a parallel `screens/` directory is
not allowed.

### Domain Layers (api/ vs server/ vs services/)

To maintain a clean separation of concerns and maintain a scalable structure, code inside a domain is organized across three potential layers. A domain is not required to implement all layers; it should only contain folders for the concerns it actually has:

1. **`api/` (Client Interface / Server Actions)**:
   - Serves as the public interface exposed to the client.
   - All files in this directory are Next.js **Server Actions** beginning with the `"use server"` directive.
   - They handle input validation, parameter sanitization, session checking, and error mapping before delegating to the `server/` layer.
   - _Naming Convention:_ When a Server Action file coordinates a concern that has a matching backend server module (e.g., `profile`), they share the same base name: `api/profile.server.js` (Server Action entry point) and `server/profile.server.js` (backend resolver).

2. **`server/` (Backend Logic & Data Access)**:
   - Contains database queries, transactions, Supabase interactions, mutation logic, access control policies, and server-side events.
   - Files in this directory must remain strictly server-only and should never expose `"use server"` actions directly to the client.

3. **`services/` (Business Rules, Mappings & Third-Party Integration)**:
   - Contains data conversion, transformation, model adaptation, and business rules.
   - Responsible for wrapping external APIs (such as TMDB queries).
   - If a domain does not interact with external systems or perform complex data mapping, the `services/` directory should be omitted.

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

The foundation may depend on application-owned contracts only through explicit, reviewed adapters. Foundation imports use `@/modules/*`, `@/ui/*`, and `@/shared/*` which are mapped cleanly to the `core/` namespace.

## Naming and consolidation

Application-owned code uses explicit kebab-case names. A filename should identify
both the subject and the behavior: `profile-read.server.js`,
`collection-shared.server.js`, and `follow-service.js` are valid; bare names such
as `service.js`, `shared.js`, `context.js`, or `read.server.js` are not. Dots are
reserved for runtime qualifiers (`.server.js` and `.client.js`); concept words
and behavior qualifiers use dashes. `index.js` is allowed only as a deliberate
public barrel entrypoint. Files are consolidated when they do not represent an
`core` namespace.

Run `npm run check:architecture` to verify the high-level boundaries before linting and building.
