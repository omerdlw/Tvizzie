# Tvizzie — Modernization & Development Roadmap

> **Platform:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase SSR, Motion v13  
> **Chassis:** Base Framework v1.0.0 (Immutable Core Architecture)  
> **Reference Legacy Codebase:** `/Users/omerdlw/Documents/Tvizzie Codes`  
> **Target Project Directory:** `/Users/omerdlw/Documents/Tvizzie`

---

## 1. Project Vision & Identity

Tvizzie is a high-performance, modern media streaming, discovery, and social review platform.
It combines fluid motion, cinematic layouts, passwordless security, and responsive media players with a community-driven review and watchlist experience.

---

## 2. Inviolable Architectural Rules

1. **Immutable Core Rule:**
   - Do NOT edit files under `src/core/`.
   - All Tvizzie code lives in `src/features/` and `src/app/`.
   - Core updates are pulled from upstream Base Framework via `npm run framework:sync`.

2. **The 4-Layer Dependency Hierarchy:**
   ```
   src/app (Routes & App-level composition)
     ↓ imports
   src/features (Domain capabilities: media, reviews, search, social, account, auth)
     ↓ imports
   src/infrastructure (Supabase SSR, Redis, HTTP, Security, Rate Limiter)
     ↓ imports
   src/core (Microkernel Engine, Dock, Modals, UI Primitives, Tokens, Result Pattern)
   ```

3. **Safe Server Actions & Result Pattern:**
   - Server Actions must start with `"use server";` and return `Result<T, E>` (`ok()` / `err()`).
   - Never throw raw errors to the client.

4. **100% Passwordless Authentication:**
   - Local sign-in uses Email OTP (delivered to Inbucket at `http://127.0.0.1:54324`) or Passkeys.

---

## 3. Migration & Modernization Phases

### Phase 1: Shell & Navigation Setup (Current)
- [ ] Configure `src/app/registry.tsx` for Tvizzie's Dock entries (Home, Explore/Media, Search, Reviews, Account).
- [ ] Customize ambient colors and brand tokens in `src/app/globals.css`.
- [ ] Connect custom Dock task surfaces for quick-actions (e.g. Quick Search, Watchlist dock card).

### Phase 2: Media Domain (`src/features/media`)
- Reference: `/Users/omerdlw/Documents/Tvizzie Codes/domains/media`
- [ ] Scaffold feature: `npm run generate feature media`
- [ ] Port media data models and Supabase queries to TypeScript (`database.types.ts`).
- [ ] Implement Video Player with dual-engine (YouTube proxy + direct video stream).
- [ ] Build Media Detail Surface (Movie/Show banner, cast, episodes list, metadata).
- [ ] Port Adaptive Image & Backdrop Hero primitives to media cards.

### Phase 3: Reviews & Ratings Domain (`src/features/reviews`)
- Reference: `/Users/omerdlw/Documents/Tvizzie Codes/domains/reviews`
- [ ] Scaffold feature: `npm run generate feature reviews`
- [ ] Port review submission actions with `createSafeAction()` and Zod schema validation.
- [ ] Implement interactive rating UI, review cards, and score aggregates.

### Phase 4: Search & Discovery Domain (`src/features/search`)
- Reference: `/Users/omerdlw/Documents/Tvizzie Codes/domains/search`
- [ ] Scaffold feature: `npm run generate feature search`
- [ ] Build instant debounced search with filter chips (Genre, Year, Rating, Type).
- [ ] Connect search shortcut (`Cmd+K` / `Ctrl+K`) to dock or modal surface.

### Phase 5: Social, Watchlists & Activity (`src/features/social`)
- Reference: `/Users/omerdlw/Documents/Tvizzie Codes/domains/social`
- [ ] Augment existing Base Framework social module (`follows`, `profile`) with:
  - User Watchlists (Want to Watch, Watching, Completed).
  - Activity Feed (Friends' recent ratings and reviews).

### Phase 6: Cloudflare Edge Optimization & Production Release
- [ ] Verify Cloudflare Workers runtime build: `npm run build:cloudflare`.
- [ ] Run automated boundary tests: `npm test`.
- [ ] Run full TypeScript validation: `npm run type-check`.

---

## 4. Quick Developer Reference & Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start Next.js development server with Turbopack |
| `npm test` | Run architecture boundary & feature tests |
| `npm run type-check` | Validate TypeScript compiler types (`tsc --noEmit`) |
| `npm run lint` | ESLint rules check |
| `npm run generate feature <name>` | Scaffold new feature structure (`client`, `server`, `ui`, `index.ts`) |
| `npm run generate page <path>` | Scaffold new route page |
| `npm run framework:sync` | Safely pull upstream engine improvements from Base Framework |

---

## 5. Antigravity Prompting Shortcut

Whenever starting a new session in Tvizzie, you can simply instruct Antigravity:
> *"TVIZZIE_ROADMAP.md dosyasını oku ve sıradaki aşamadan devam et. Eski referans kodlar `/Users/omerdlw/Documents/Tvizzie Codes` altında."*
