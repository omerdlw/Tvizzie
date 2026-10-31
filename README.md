# Guffin

Discover movies, cast and crew. Next.js 16, React 19, Tailwind v4, TMDB, Supabase.

## Structure

```
src/
  app/             routes, route handlers, providers, fonts, global styles
  features/        one folder per domain: components/, lib/, server/ (account also has views/)
  ui/              primitives and shared components
  motion/          cinema, film, scroll, flow, handoff
  config/          routes, project metadata, theme/
  infrastructure/  env, http, redis, security, supabase, tmdb
  proxy.ts         request proxy (session refresh)
```

Features: `account`, `artwork`, `auth`, `awards`, `home`, `legal`, `movie`, `person`, `reviews`, `search`, `social`.

Imports go downward only: `app` → `features` → `ui` / `motion` → `infrastructure`.

Each feature has two public entry points. `@/features/<name>` is safe to import from client and server code, and it also re-exports the feature's server actions. `@/features/<name>/server` holds server-only queries and server-rendered views. Inside a feature, files import each other with relative paths.

`npm run lint` enforces both the layer order and the entry points.

## Getting started

Requirements: Node.js 22+, npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Scripts

| Command             | Purpose                  |
| :------------------ | :----------------------- |
| `npm run dev`       | Development server       |
| `npm run build`     | Production build         |
| `npm run lint`      | ESLint                   |
| `npm run typecheck` | TypeScript               |
| `npm run format`    | Prettier                 |
| `npm run start`     | Run the production build |
