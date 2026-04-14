# Tvizzie: Technical Analysis Report and Restructuring Implementation Plan

> **Version 3.0 — Final Consolidated Plan**
> Ground truth verified against actual source files.
> Execute phases in order. Run `pnpm build` after each phase. Do not proceed if build fails.

---

## DOCUMENT OVERVIEW

This document serves two purposes:

1. **Part 1: Technical Analysis Report** — Comprehensive audit of the current codebase architecture, naming conventions, structural issues, and code quality metrics.

2. **Part 2: Restructuring Implementation Plan** — Detailed, executable phases to improve structural clarity, naming consistency, and module boundary enforcement without changing runtime behavior.

---

## AGENT/DEVELOPER CONTEXT

**Objective:** Improve structural clarity, naming consistency, and module boundary enforcement without changing any runtime behavior. No feature changes. No logic rewrites.

**What this plan does NOT do:**
- Does not rewrite the Registry system (`core/modules/registry/`)
- Does not merge `registry.js` route files (they contain complex JSX and router hooks — not simple config)
- Does not inline `view.js` files into `client.js` (they are 200–300+ LOC rendering trees)
- Does not change API route handler logic or merge endpoints with action-dispatch patterns
- Does not touch `rollout.config.js` internals (sophisticated env-patching system — leave it)
- Does not touch `useRegistry` hook internals

**What this plan DOES do:**
- Eliminates the confusing `core/` wrapper directory (moves contents to proper top-level dirs)
- Applies consistent, professional file naming to route files
- Resolves confirmed `ui/ → features/` import boundary violations
- Splits `features/account/utils.js` (400+ LOC mixed-concern file) into focused modules
- Consolidates fragmented auth server files
- Consolidates nav hook files
- Renames generic `utils.js` / `client.js` / `view.js` / `registry.js` files to domain-prefixed names
- Moves `components/ui/` leftovers to `ui/`

---

# PART 1: TECHNICAL ANALYSIS REPORT

---

## 1. Executive Summary

Tvizzie is a full-stack movie discovery and social engagement platform built with Next.js 16, React 19, Tailwind CSS 4, and Supabase. The application enables users to search for movies and people (via TMDB API), manage personal watchlists, mark movies as watched, rate and review content, create curated lists, and engage socially through a follow system.

### Current Codebase Metrics

| Metric | Value | Industry Benchmark | Assessment |
|--------|-------|-------------------|------------|
| Total JavaScript Files | 539 | 180-280 | Over-fragmented |
| Route Groups | 5 | 3-6 | Appropriate |
| API Endpoints | 42 | 20-40 | Slightly high |
| Unique Naming Patterns | 14+ | 4-6 | Inconsistent |
| Auth Files | 36 | 10-15 | Over-engineered |
| Lines of Code (estimated) | 28,000-38,000 | — | — |

### Primary Concerns

1. **File count inflation** — 539 files for a medium-complexity application
2. **Inconsistent naming conventions** — 14+ distinct patterns in use
3. **Ambiguous route files** — `client.js`, `view.js`, `registry.js` lack context
4. **Confusing `core/` directory** — conflates multiple concerns
5. **Import boundary violations** — `ui/ → features/`, `services/ → features/`
6. **Mixed-concern utility files** — 400+ LOC dumping grounds

---

## 2. Technology Stack Analysis

### 2.1 Core Framework

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 16.2.1 | App Router, Server Components, Route Handlers |
| UI Library | React | 19.2.4 | Component rendering, Concurrent features |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Animation | Framer Motion | 12.38.0 | Component animations, page transitions |
| Database/Auth | Supabase | 2.100.1 | PostgreSQL, Auth, Realtime, Storage |
| External API | TMDB | v3 | Movie/Person metadata |

### 2.2 Supporting Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `@supabase/ssr` | 0.6.1 | Server-side Supabase client management |
| `class-variance-authority` | 0.7.x | Component variant composition |
| `lenis` | 1.x | Smooth scroll implementation |
| `nodemailer` | 6.x | Email dispatch for verification flows |
| `html-to-image` | 1.x | Screenshot/export functionality |
| `lucide-react` | 0.x | Primary icon system |
| `@iconify-icon/react` | 2.x | Extended icon system |
| `date-fns` | 4.x | Date formatting and manipulation |
| `clsx` | 2.x | Conditional class composition |
| `tailwind-merge` | 2.x | Tailwind class deduplication |

### 2.3 Build Tooling

| Tool | Configuration | Notes |
|------|---------------|-------|
| Turbopack | Enabled (Next.js 16 default) | Development bundler |
| React Compiler | Enabled via babel plugin | Automatic memoization |
| ESLint | v9 flat config | `eslint.config.mjs` |
| Prettier | v3.x | Tailwind plugin enabled |
| PostCSS | v8.x | Tailwind integration |

---

## 3. Architectural Patterns Analysis

### 3.1 Directory Structure Overview

```
tvizzie/
├── app/                           # Next.js App Router entrypoints
│   ├── (account)/                 # Account route group
│   │   ├── account/
│   │   │   ├── [username]/        # Dynamic user profile routes
│   │   │   │   ├── activity/
│   │   │   │   ├── likes/
│   │   │   │   ├── lists/
│   │   │   │   ├── reviews/
│   │   │   │   ├── watched/
│   │   │   │   └── watchlist/
│   │   │   ├── edit/              # Profile editing
│   │   │   └── lists/new/         # List creation
│   ├── (admin)/                   # Admin dashboard routes
│   │   └── admin/users/
│   ├── (auth)/                    # Authentication routes
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (home)/                    # Landing page
│   ├── (media)/                   # Media detail pages
│   │   ├── movie/[id]/
│   │   └── person/[id]/
│   ├── api/                       # API route handlers (42 endpoints)
│   ├── auth/                      # Auth callback handlers
│   └── search/                    # Search page
├── core/                          # ⚠️ TO BE ELIMINATED - Runtime systems, services, clients
│   ├── auth/                      # Auth primitives (36 files)
│   │   ├── clients/               # Browser-side auth utilities (5 files)
│   │   └── servers/               # Server-side auth operations (27 files)
│   │       ├── account/           # 4 files
│   │       ├── audit/             # 1 file
│   │       ├── notice/            # 1 file
│   │       ├── policy/            # 1 file
│   │       ├── providers/         # 2 files
│   │       ├── security/          # 6 files
│   │       ├── session/           # 5 files
│   │       └── verification/      # 6 files
│   ├── clients/                   # External service clients (7 files)
│   │   ├── supabase/              # Supabase client wrappers
│   │   └── tmdb/                  # TMDB API client
│   ├── constants/                 # Shared constants (2 files)
│   ├── hooks/                     # Shared React hooks (7 files)
│   ├── modules/                   # Runtime state providers (143 files)
│   │   ├── account/               # 6 files
│   │   ├── api/                   # 2 files
│   │   ├── auth/                  # 11 files
│   │   ├── background/            # 2 files
│   │   ├── context-menu/          # 3 files
│   │   ├── countdown/             # 4 files
│   │   ├── error-boundary/        # 5 files
│   │   ├── loading/               # 2 files
│   │   ├── modal/                 # 7 files
│   │   ├── nav/                   # 26 files (14 hooks)
│   │   ├── notification/          # 5 files
│   │   ├── registry/              # 14 files
│   │   └── settings/              # 6 files
│   ├── services/                  # Data access and business logic (55 files)
│   │   ├── account/               # 5 files
│   │   ├── activity/              # 5 files
│   │   ├── admin/                 # 11 files
│   │   ├── browser/               # 3 files
│   │   ├── feedback/              # 1 file
│   │   ├── media/                 # 9 files
│   │   ├── notifications/         # 5 files
│   │   ├── realtime/              # 4 files
│   │   ├── shared/                # 7 files
│   │   ├── social/                # 2 files
│   │   └── tmdb/                  # 3 files
│   ├── utils/                     # Pure utility functions (2 files)
│   └── index.js                   # Barrel re-export
├── features/                      # Domain-specific UI composition (124 files)
│   ├── account/                   # Account page components (34 files)
│   │   ├── feeds/                 # 8 files
│   │   ├── hooks/                 # 3 files
│   │   ├── lists/                 # 5 files
│   │   ├── overview/              # 4 files
│   │   └── shared/                # 8 files
│   ├── auth/                      # Auth UI components (11 files)
│   ├── home/                      # Home page components (2 files)
│   ├── layout/                    # Layout utilities (7 files)
│   ├── modal/                     # Product-specific modals (10 files)
│   ├── movie/                     # Movie detail components (13 files)
│   ├── navigation/                # Navigation components (20 files)
│   │   ├── actions/               # Nav action components
│   │   └── surfaces/              # Nav surface components
│   ├── person/                    # Person detail components (12 files)
│   ├── reviews/                   # Review system (12 files)
│   │   └── parts/                 # ⚠️ Non-standard naming
│   └── shared/                    # Cross-feature components (7 files)
├── ui/                            # Reusable presentational primitives (28 files)
│   ├── animations/                # Animation wrappers
│   ├── elements/                  # Form elements
│   │   ├── button/
│   │   ├── checkbox/
│   │   ├── input/
│   │   ├── popover/
│   │   ├── select/
│   │   ├── switch/
│   │   ├── textarea/
│   │   └── tooltip/
│   ├── icon/                      # Icon component
│   ├── loadings/                  # Loading spinners
│   ├── skeletons/                 # Skeleton loaders
│   │   ├── components/
│   │   └── views/
│   └── states/                    # State components
├── config/                        # Configuration modules (6 files)
│   ├── account.config.js
│   ├── auth.config.js
│   ├── nav.config.js
│   ├── project.config.js
│   ├── provider.config.js
│   └── rollout.config.js          # ⚠️ Complex - do not modify
├── components/                    # ⚠️ Legacy shadcn leftovers (2 files)
│   └── ui/
│       ├── noise-texture.js
│       └── text-animate.js
└── fonts/                         # Custom font files
```

### 3.2 Route File Split Pattern Analysis

The codebase employs a consistent but verbose route file decomposition:

| File | Purpose | Occurrence | LOC Range |
|------|---------|------------|-----------|
| `page.js` | Route entry, SSR data fetching, metadata | 32/32 (100%) | 20-150 |
| `client.js` | Client boundary wrapper, state management | 29/32 (91%) | 30-200 |
| `registry.js` | Route-local registry state injection | 26/32 (81%) | 50-150 |
| `view.js` | Presentational component | 14/32 (44%) | 100-300 |
| `loading.js` | Suspense fallback | 22/32 (69%) | 10-40 |
| `error.js` | Error boundary | 8/32 (25%) | 15-50 |
| `not-found.js` | 404 handler | 5/32 (16%) | 15-40 |

**Critical Finding:** `registry.js` files contain **complex JSX, router hooks (`usePathname`, `useRouter`, `useSearchParams`), state management, and context menu configuration**. They are NOT simple config objects and cannot be trivially merged or extracted to a factory. `view.js` files are **200-300+ LOC rendering trees** with Suspense boundaries and deferred data loading.

### 3.3 Registry System Architecture

The Registry pattern (`core/modules/registry/`) is a centralized state bus with plugin architecture:

| Plugin | Purpose | LOC |
|--------|---------|-----|
| `nav.plugin.js` | Navigation state injection | 45 |
| `modal.plugin.js` | Modal configuration | 35 |
| `background.plugin.js` | Background overlay state | 25 |
| `guard.plugin.js` | Route guard configuration | 30 |
| `loading.plugin.js` | Loading state management | 25 |
| `context-menu.plugin.js` | Context menu configuration | 35 |
| `notification.plugin.js` | Notification state | 25 |
| `title.plugin.js` | Document title management | 20 |

**Assessment:** The Registry system is sophisticated and working correctly. The `useRegistry` hook contains deep comparison engine, React element stabilization, and ref-based function memoization. **Do not modify its internals.**

### 3.4 Service Layer Architecture

| Service Domain | Files | Server | Client | Responsibilities |
|----------------|-------|--------|--------|------------------|
| `account/` | 5 | 4 | 1 | Profile CRUD, bootstrapping, feeds |
| `activity/` | 5 | 1 | 4 | Activity logging and retrieval |
| `admin/` | 11 | 11 | 0 | Admin dashboard operations |
| `browser/` | 3 | 3 | 0 | Browse page data |
| `feedback/` | 1 | 0 | 1 | Feedback submission |
| `media/` | 9 | 1 | 8 | Watchlist, watched, likes, reviews, lists |
| `notifications/` | 5 | 2 | 3 | Notification CRUD |
| `realtime/` | 4 | 2 | 2 | Live updates |
| `shared/` | 7 | 2 | 5 | Cross-service utilities |
| `social/` | 2 | 1 | 1 | Follow/unfollow |
| `tmdb/` | 3 | 2 | 1 | TMDB API integration |

---

## 4. Naming Convention Analysis

### 4.1 Current Patterns Inventory

The codebase exhibits **14 distinct naming patterns**:

| Pattern | Files | Examples | Issue |
|---------|-------|----------|-------|
| Environment suffix `.server.js` / `.client.js` | 62 | `account-bootstrap.server.js` | Good |
| Type suffix `.service.js` / `.constants.js` | 35 | `account.service.js` | Good |
| Bare `index.js` barrels | 45+ | Various directories | Acceptable |
| Kebab-case components | ~200 | `media-card.js`, `hero-spotlight.js` | Good |
| `use-` prefix hooks | 35 | `use-click-outside.js` | Good |
| Plugin suffix `.plugin.js` | 10 | `nav.plugin.js` | Good |
| **Ambiguous `client.js`** | 29 | `app/(home)/client.js` | **Problem** |
| **Ambiguous `registry.js`** | 26 | `app/(media)/movie/[id]/registry.js` | **Problem** |
| **Ambiguous `view.js`** | 14 | `app/(account)/account/[username]/view.js` | **Problem** |
| **Bare `utils.js`** | 5 | `features/account/utils.js` | **Problem** |
| Non-standard `parts/` | 8 | `features/reviews/parts/` | **Problem** |
| Non-standard `shared/` | 8 | `features/account/shared/` | **Minor** |
| Bare noun feeds | 8 | `features/account/feeds/activity.js` | **Minor** |
| Mixed concerns in utils | 4 | `features/account/utils.js` (400+ LOC) | **Problem** |

### 4.2 Naming Problems Matrix

| Problem | Severity | Files | Impact |
|---------|----------|-------|--------|
| Ambiguous route `client.js` | **High** | 29 | Impossible to identify route from filename |
| Ambiguous route `registry.js` | **High** | 26 | Same as above |
| Ambiguous route `view.js` | **High** | 14 | Same as above |
| Generic `utils.js` without domain prefix | **Medium** | 5 | Loss of searchability |
| `parts/` vs `components/` inconsistency | **Low** | 8 | Confusing structure |
| `.client.js` suffix vs `client.js` file | **High** | Mixed | Pattern collision |

### 4.3 Professional Naming Standards

**Target Standard:**

| Category | Pattern | Example |
|----------|---------|---------|
| Route client components | `{route-name}.client.js` | `movie-detail.client.js` |
| Route registry files | `{route-name}.registry.js` | `movie-detail.registry.js` |
| Route view files | `{route-name}.view.js` | `movie-detail.view.js` |
| Server services | `{domain}.server.js` | `account.server.js` |
| Client services | `{domain}.service.js` | `account.service.js` |
| Domain utilities | `{domain}.utils.js` | `account.utils.js` |
| Domain constants | `{domain}.constants.js` | `auth.constants.js` |
| React hooks | `use-{action}.js` | `use-nav-layout.js` |
| Components | `{component-name}.js` (kebab) | `media-card.js` |
| Subcomponent directories | `components/` | NOT `parts/` or `shared/` |

---

## 5. Identified Structural Problems

### 5.1 File Count Inflation

| Directory | Current | Expected | Excess |
|-----------|---------|----------|--------|
| `app/` routes | 160 | 60-80 | +80-100 |
| `core/modules/` | 143 | 50-70 | +73-93 |
| `core/auth/` | 36 | 10-15 | +21-26 |
| `core/services/` | 55 | 30-40 | +15-25 |
| `features/` | 124 | 80-100 | +24-44 |
| `ui/` | 28 | 25-35 | OK |
| **Total** | **539** | **180-280** | **+259-359** |

### 5.2 Import Boundary Violations

**Confirmed Violations:**

| Source | Target | Type |
|--------|--------|------|
| `ui/skeletons/views/account.js` | `@/features/account/utils` | `ui/ → features/` |
| `ui/skeletons/views/account.js` | `@/features/layout/page-gradient-backdrop` | `ui/ → features/` |
| `services/account/account.service.js` | `@/features/account/utils` | `services/ → features/` |

**Required Dependency Rules:**

| Layer | May Import From | Must NOT Import From |
|-------|-----------------|---------------------|
| `ui/` | `ui/`, `lib/` | `features/`, `modules/`, `services/` |
| `lib/` | `lib/` | `modules/`, `services/`, `features/`, `app/` |
| `services/` | `services/`, `lib/` | `features/`, `modules/`, `app/` |
| `modules/` | `modules/`, `lib/`, `ui/` | `features/`, `services/`, `app/` |
| `features/` | `features/`, `modules/`, `services/`, `lib/`, `ui/` | `app/` |
| `app/` | Everything | — |

### 5.3 The `core/` Directory Problem

The `core/` directory conflates multiple distinct concerns:

| Current | Should Be | Semantics |
|---------|-----------|-----------|
| `core/modules/` | `modules/` | Runtime React state providers |
| `core/services/` | `services/` | Data access layer |
| `core/auth/` | `lib/auth/` | Auth infrastructure (library) |
| `core/clients/` | `lib/clients/` | External API clients |
| `core/hooks/` | `lib/hooks/` | Shared React hooks |
| `core/utils/` | `lib/utils/` | Pure utility functions |
| `core/constants/` | `lib/constants/` | Shared constants |

### 5.4 Mixed-Concern Utility Files

**`features/account/utils.js` (400+ LOC) contains:**
- Constants (`EDIT_TABS`, `AUTH_PURPOSE`, `EMAIL_PATTERN`, etc.)
- URL builders (`buildListCreatorHref`, `buildAccountCollectionPageHref`)
- API fetch functions (`deleteAccountRequest`, `completeEmailChangeRequest`)
- Data formatters (`sortAccountItems`, `formatPaginationSummaryLabel`)
- Validation functions (`validatePassword`)
- Event emitters (`emitAccountFeedback`, `clearAccountFeedback`)
- Error resolvers (`resolveSecurityErrorMessage`)

This is a dumping ground that violates single-responsibility.

### 5.5 Code Quality Metrics

**Duplication Patterns:**

| Pattern | Files | Duplicated LOC |
|---------|-------|----------------|
| `useRegistry()` boilerplate | 26 | ~520 |
| `loading.js` skeleton rendering | 22 | ~330 |
| API route auth checks | 42 | ~420 |
| Registry config objects | 26 | ~780 |

**File Size Distribution:**

| Range | Count | % |
|-------|-------|---|
| 1-25 LOC | 85 | 16% |
| 26-50 LOC | 110 | 20% |
| 51-100 LOC | 145 | 27% |
| 101-200 LOC | 120 | 22% |
| 201-400 LOC | 55 | 10% |
| 400+ LOC | 24 | 4% |

**195 files (36%) are under 50 LOC** — consolidation opportunity.

---

# PART 2: RESTRUCTURING IMPLEMENTATION PLAN

---

## Pre-Flight Verification

Before starting, establish baseline:

```bash
pnpm build 2>&1 | tail -20
# Must succeed with zero errors before proceeding
```

Verify current `jsconfig.json` paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## PHASE 1 — Eliminate `core/` Directory

**Risk:** Medium. Highest impact. Touches ~250+ import statements.
**Duration:** 2-3 hours.

### Step 1.1 — Move `core/modules/` → `modules/`

```bash
cp -r core/modules modules
find core/modules -name "*.js" | wc -l
find modules -name "*.js" | wc -l
# Counts must match
```

Global find-replace in all `.js` files:
```
@/core/modules/ → @/modules/
```

Verify:
```bash
grep -r "@/core/modules/" app features ui config --include="*.js" | wc -l
# Must be 0
pnpm build
```

Delete original:
```bash
rm -rf core/modules
```

### Step 1.2 — Move `core/services/` → `services/`

```bash
cp -r core/services services
```

Global find-replace:
```
@/core/services/ → @/services/
```

Verify:
```bash
grep -r "@/core/services/" . --include="*.js" --exclude-dir=node_modules --exclude-dir=.next | wc -l
# Must be 0
pnpm build
```

Delete original:
```bash
rm -rf core/services
```

### Step 1.3 — Move `core/auth/` → `lib/auth/`

```bash
mkdir -p lib
cp -r core/auth lib/auth
```

Global find-replace:
```
@/core/auth/ → @/lib/auth/
```

Verify and delete original.

### Step 1.4 — Move `core/clients/` → `lib/clients/`

```bash
cp -r core/clients lib/clients
```

Global find-replace:
```
@/core/clients/ → @/lib/clients/
```

Verify and delete original.

### Step 1.5 — Move `core/hooks/`, `core/utils/`, `core/constants/`, `core/index.js`

```bash
cp -r core/hooks lib/hooks
cp -r core/utils lib/utils
cp -r core/constants lib/constants
cp core/index.js lib/index.js
```

Global find-replace:
```
@/core/hooks/ → @/lib/hooks/
@/core/utils/ → @/lib/utils/
@/core/constants/ → @/lib/constants/
@/core/utils' → @/lib/utils'
@/core/constants' → @/lib/constants'
```

Verify no remaining `@/core/` references:
```bash
grep -r "@/core/" . --include="*.js" --exclude-dir=node_modules --exclude-dir=.next | grep -v "^./core/"
# Must return 0 lines
pnpm build
```

Delete remaining:
```bash
rm -rf core/hooks core/utils core/constants core/index.js
rmdir core 2>/dev/null || echo "core/ has remaining files — inspect before deleting"
```

### Step 1.6 — Update jsconfig.json

Remove the `@/core/*` alias if present:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Phase 1 Validation

```bash
pnpm build
grep -r "@/core/" . --include="*.js" --exclude-dir=node_modules --exclude-dir=.next | wc -l
# Must be 0
```

Test routes: `/`, `/movie/[id]`, `/person/[id]`, `/account/[username]`, `/sign-in`, `/sign-up`, `/search`

---

## PHASE 2 — Fix Import Boundary Violations

**Risk:** Low. 3 targeted file changes.
**Duration:** 30-45 minutes.

### Step 2.1 — Fix `ui/skeletons/views/account.js`

**Current imports (violations):**
```js
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/features/account/utils';
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop';
```

**Resolution:**

1. The constants `ACCOUNT_ROUTE_SHELL_CLASS` and `ACCOUNT_SECTION_SHELL_CLASS` are re-exported from `@/lib/constants` in `features/account/utils.js`. Update to import directly:

```js
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/lib/constants';
```

2. Move `PageGradientShell` to `ui/layout/`:

```bash
mkdir -p ui/layout
cp features/layout/page-gradient-backdrop.js ui/layout/page-gradient-backdrop.js
```

Update import:
```js
import { PageGradientShell } from '@/ui/layout/page-gradient-backdrop';
```

Update all other files that import from `@/features/layout/page-gradient-backdrop` to use `@/ui/layout/page-gradient-backdrop`.

### Step 2.2 — Fix `services/account/account.service.js`

**Current import (violation):**
```js
import { isReservedAccountSegment } from '@/features/account/utils';
```

**Resolution:**

Create `lib/utils/account.utils.js`:
```js
// lib/utils/account.utils.js
export const RESERVED_ACCOUNT_SEGMENTS = new Set([
  'activity', 'likes', 'watched', 'watchlist', 'reviews', 'lists', 'edit'
]);

export function isReservedAccountSegment(value) {
  return RESERVED_ACCOUNT_SEGMENTS.has(
    String(value || '').trim().toLowerCase()
  );
}
```

Update `services/account/account.service.js`:
```js
import { isReservedAccountSegment } from '@/lib/utils/account.utils';
```

Update `features/account/utils.js` to re-export:
```js
export { RESERVED_ACCOUNT_SEGMENTS, isReservedAccountSegment } from '@/lib/utils/account.utils';
```

### Phase 2 Validation

```bash
grep -r "from '@/features" ui/ --include="*.js"
grep -r "from '@/features" services/ --include="*.js"
# Both must return 0 matches
pnpm build
```

---

## PHASE 3 — Route File Naming

**Risk:** Low. Pure renames, no logic changes.
**Duration:** 1-2 hours.

### Rename Pattern

For each route, rename ambiguous files to domain-prefixed names:

```
client.js   → {route-name}.client.js
registry.js → {route-name}.registry.js
view.js     → {route-name}.view.js
```

**Important:** Do NOT merge or eliminate `registry.js` or `view.js` files. They contain complex logic. Only rename them.

### Complete Rename List

#### `app/(media)/movie/[id]/`
```
client.js   → movie-detail.client.js
registry.js → movie-detail.registry.js
view.js     → movie-detail.view.js
```

Update `page.js`:
```js
import Client from './movie-detail.client';
```

Update internal imports in the renamed files.

#### `app/(media)/movie/[id]/reviews/`
```
client.js → movie-reviews.client.js
view.js   → movie-reviews.view.js
```

#### `app/(media)/person/[id]/`
```
client.js   → person-detail.client.js
registry.js → person-detail.registry.js
view.js     → person-detail.view.js
```

#### `app/(home)/`
```
client.js   → home.client.js
registry.js → home.registry.js (if exists)
view.js     → home.view.js (if exists)
```

#### `app/(auth)/sign-in/`
```
client.js   → sign-in.client.js
registry.js → sign-in.registry.js (if exists)
view.js     → sign-in.view.js (if exists)
```

#### `app/(auth)/sign-up/`
```
client.js   → sign-up.client.js
registry.js → sign-up.registry.js (if exists)
view.js     → sign-up.view.js (if exists)
```

#### `app/(account)/account/[username]/`
```
client.js   → account-profile.client.js
registry.js → account-profile.registry.js
```

#### `app/(account)/account/[username]/activity/`
```
client.js   → account-activity.client.js
registry.js → account-activity.registry.js
view.js     → account-activity.view.js
```

#### `app/(account)/account/[username]/likes/`
```
client.js   → account-likes.client.js
registry.js → account-likes.registry.js
view.js     → account-likes.view.js
```

#### `app/(account)/account/[username]/watched/`
```
client.js   → account-watched.client.js
registry.js → account-watched.registry.js
view.js     → account-watched.view.js
```

#### `app/(account)/account/[username]/watchlist/`
```
client.js   → account-watchlist.client.js
registry.js → account-watchlist.registry.js
view.js     → account-watchlist.view.js
```

#### `app/(account)/account/[username]/reviews/`
```
client.js   → account-reviews.client.js
registry.js → account-reviews.registry.js
view.js     → account-reviews.view.js
```

#### `app/(account)/account/[username]/lists/`
```
client.js   → account-lists.client.js
registry.js → account-lists.registry.js
view.js     → account-lists.view.js
```

#### `app/(account)/account/[username]/lists/[slug]/`
```
client.js   → account-list-detail.client.js
registry.js → account-list-detail.registry.js
view.js     → account-list-detail.view.js
```

#### `app/(account)/account/edit/`
```
client.js   → account-edit.client.js
registry.js → account-edit.registry.js (if exists)
view.js     → account-edit.view.js (if exists)
```

#### `app/(admin)/admin/users/`
```
client.js → admin-users.client.js
```

#### `app/search/`
```
client.js → search.client.js
```

### Phase 3 Validation

```bash
find app -name "client.js" | wc -l
# Should be 0
find app -name "registry.js" | wc -l
# Should be 0
find app -name "view.js" | wc -l
# Should be 0
pnpm build
```

---

## PHASE 4 — Split `features/account/utils.js`

**Risk:** Medium. This file is imported by many consumers.
**Duration:** 1.5-2 hours.

### Target Split

| New File | Contents |
|----------|----------|
| `features/account/account.constants.js` | `EDIT_TABS`, `AUTH_PURPOSE`, `EMAIL_PATTERN`, `PROFILE_TABS`, `ACCOUNT_SECTION_KEYS`, `ACCOUNT_LIST_CREATOR_PATH`, `INITIAL_EMAIL_FLOW`, `INITIAL_PASSWORD_FLOW`, `INITIAL_DELETE_FLOW` |
| `features/account/account.api.js` | `deleteAccountRequest`, `completeEmailChangeRequest`, `completePasswordChangeRequest`, `completePasswordSetRequest` |
| `features/account/account.validators.js` | `validatePassword`, email pattern validation |
| `features/account/account.formatters.js` | `sortAccountItems`, `formatPaginationSummaryLabel`, `buildListCreatorHref`, `buildAccountCollectionPageHref`, `getMediaTitle`, `getFollowState`, `getNavDescription`, `getIsFullScreenEmpty`, `getAvatarFallback` |
| `features/account/account.feedback.js` | `emitAccountFeedback`, `clearAccountFeedback`, `ACCOUNT_FEEDBACK_CONFIG` |
| `features/account/account.security.js` | `resolveSecurityErrorMessage`, `normalizeProviderIds`, `normalizeProviderDescriptors`, `normalizeEmail`, `normalizeOptionalText` |

### Keep Barrel Re-export

Keep `features/account/utils.js` as a **re-export barrel** to avoid breaking consumers:

```js
// features/account/utils.js — RE-EXPORT BARREL
export * from './account.constants';
export * from './account.api';
export * from './account.validators';
export * from './account.formatters';
export * from './account.feedback';
export * from './account.security';

// Re-exports from lib/constants (keep existing)
export { ACCOUNT_ROUTE_MAX_WIDTH_CLASS, ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/lib/constants';

// Re-export from lib/utils (keep existing)
export { RESERVED_ACCOUNT_SEGMENTS, isReservedAccountSegment } from '@/lib/utils/account.utils';
```

### Phase 4 Validation

```bash
pnpm build
# All account routes must load correctly
```

---

## PHASE 5 — Rename Generic Utility Files

**Risk:** Low. Simple renames + import updates.
**Duration:** 30-45 minutes.

### File Renames

| Current | New |
|---------|-----|
| `features/auth/utils.js` | `features/auth/auth.utils.js` |
| `features/movie/utils.js` | `features/movie/movie.utils.js` |
| `features/person/utils.js` | `features/person/person.utils.js` |
| `features/reviews/utils.js` | `features/reviews/reviews.utils.js` |

**Note:** `features/account/utils.js` stays as the barrel (handled in Phase 4).

For each rename:
1. Rename the file
2. Find all imports and update them

### Directory Renames

```bash
# Rename parts/ → components/
mv features/reviews/parts features/reviews/components

# Update all imports
grep -r "features/reviews/parts" . --include="*.js" --exclude-dir=node_modules
# Update each found import to features/reviews/components
```

```bash
# Rename shared/ → components/
mv features/account/shared features/account/components

# Update all imports
grep -r "features/account/shared" . --include="*.js" --exclude-dir=node_modules
# Update each found import to features/account/components
```

### Phase 5 Validation

```bash
pnpm build
```

---

## PHASE 6 — Consolidate Auth Server Files

**Risk:** Medium. Do not change function signatures.
**Duration:** 2-3 hours.

### Consolidation Map

**Merge `lib/auth/servers/account/` (4 files) → `lib/auth/servers/account.server.js`**

Files to merge:
- `account/account-bootstrap.server.js`
- `account/account-deletion.server.js`
- `account/account-lifecycle.server.js`
- `account/account-state.server.js`

**Merge `lib/auth/servers/session/` (5 files) → `lib/auth/servers/session.server.js`**

Files to merge:
- `session/authenticated-request.server.js`
- `session/request-context.server.js`
- `session/revocation.server.js`
- `session/session.server.js`
- `session/supabase-admin-auth.server.js`

**Merge `lib/auth/servers/verification/` (6 files) → `lib/auth/servers/verification.server.js`**

Files to merge:
- `verification/email-sender.server.js`
- `verification/email-verification.server.js`
- `verification/login-verification.server.js`
- `verification/password-account.server.js`
- `verification/password-reset-proof.server.js`
- `verification/signup-proof.server.js`

**Merge `lib/auth/servers/providers/` (2 files) → `lib/auth/servers/providers.server.js`**

Files to merge:
- `providers/google-auth-intent.server.js`
- `providers/google-provider.server.js`

**Flatten single-file directories:**
- `lib/auth/servers/audit/audit-log.server.js` → `lib/auth/servers/audit.server.js`
- `lib/auth/servers/notice/auth-route-notice.server.js` → `lib/auth/servers/notice.server.js`
- `lib/auth/servers/policy/auth-route-policy.server.js` → `lib/auth/servers/policy.server.js`

**Keep as-is:**
- `lib/auth/servers/security/` (6 files) — genuinely complex, directory structure appropriate

### Merge Strategy

Concatenate all exports into one file with section comments:

```js
// lib/auth/servers/account.server.js

// ── Bootstrap ─────────────────────────────────────────────────
// [contents of account-bootstrap.server.js]

// ── Deletion ──────────────────────────────────────────────────
// [contents of account-deletion.server.js]

// ── Lifecycle ─────────────────────────────────────────────────
// [contents of account-lifecycle.server.js]

// ── State ─────────────────────────────────────────────────────
// [contents of account-state.server.js]
```

### Import Update Strategy

After creating each merged file, update all imports:

```bash
# Example for account merger:
grep -r "lib/auth/servers/account/account-bootstrap" . --include="*.js" --exclude-dir=node_modules
# Replace with: @/lib/auth/servers/account.server
```

Delete old subdirectories only after all imports updated and build succeeds.

### Final Auth Structure

```
lib/auth/servers/
├── account.server.js       # merged 4 files
├── audit.server.js         # flattened
├── notice.server.js        # flattened
├── policy.server.js        # flattened
├── providers.server.js     # merged 2 files
├── security/               # kept (6 files, genuinely complex)
│   ├── csrf.server.js
│   ├── password-security.server.js
│   ├── rate-limit-policies.server.js
│   ├── rate-limit.server.js
│   ├── recent-reauth.server.js
│   └── step-up.server.js
├── session.server.js       # merged 5 files
└── verification.server.js  # merged 6 files
```

---

## PHASE 7 — Consolidate Navigation Hooks

**Risk:** Low. Only internal module consumers.
**Duration:** 1 hour.

`modules/nav/hooks/` contains 14 files. Group by concern:

### Consolidation Map

| New File | Merges |
|----------|--------|
| `use-nav-layout.js` | `use-element-height.js`, `use-nav-height.js`, `use-navigation-layout.js`, `use-action-height.js` |
| `use-nav-display.js` | `use-navigation-display.js`, `use-navigation-status.js`, `use-navigation-expanded.js`, `use-navigation-countdown.js` |
| `use-nav-core.js` | `use-navigation-core.js`, `use-navigation-items.js`, `use-navigation-effects.js` |
| `use-nav-actions.js` | `use-action-component.js`, `use-nav-badge.js` |

**Keep unchanged:**
- `use-navigation.js` (primary consumer-facing hook)
- `index.js` (update re-exports)

### Execution

1. Create new merged files with section comments
2. Update `modules/nav/hooks/index.js` to export from new files
3. Check for external direct imports and update them
4. Delete old files

---

## PHASE 8 — Move `components/ui/` to `ui/`

**Risk:** Low. Only 2 files.
**Duration:** 15 minutes.

```bash
cp components/ui/noise-texture.js ui/effects/noise-texture.js
cp components/ui/text-animate.js ui/animations/text-animate.js
```

Update all imports:
```bash
grep -r "components/ui/noise-texture" . --include="*.js" --exclude-dir=node_modules
# Update to @/ui/effects/noise-texture

grep -r "components/ui/text-animate" . --include="*.js" --exclude-dir=node_modules
# Update to @/ui/animations/text-animate
```

Delete:
```bash
rm -rf components/ui
rmdir components 2>/dev/null || true
rm components.json  # if it only configured shadcn output paths
```

---

## PHASE 9 — Create Documentation

**Risk:** None. New files only.
**Duration:** 30 minutes.

### Create `NAMING_CONVENTIONS.md`

```markdown
# Tvizzie — Naming Conventions

## File Naming

### Route Files (in `app/`)
- `page.js` — Route entry point (Next.js convention)
- `{route-name}.client.js` — Client boundary component
- `{route-name}.registry.js` — Registry/nav state configuration
- `{route-name}.view.js` — Presentational view component
- `loading.js` — Suspense fallback (Next.js convention)
- `error.js` — Error boundary (Next.js convention)
- `not-found.js` — 404 handler (Next.js convention)

### Service Files (in `services/`)
- `{domain}.server.js` — Server-only operations
- `{domain}.service.js` — Client-side API calls

### Feature Files (in `features/`)
- `{domain}.utils.js` — Domain-scoped utilities
- `{domain}.constants.js` — Domain-scoped constants
- `{domain}.api.js` — Domain-scoped fetch wrappers
- `{domain}.validators.js` — Validation logic
- `{domain}.formatters.js` — Data transformation

### Hook Files
- `use-{action}.js` — Single-purpose hooks
- `use-{domain}-{action}.js` — Domain-scoped hooks

## Directory Structure

```
app/          Next.js routes only — no shared logic
features/     Domain-specific UI composition and orchestration
modules/      Runtime React state providers (context, hooks)
services/     Data access layer — server and client
lib/          Infrastructure: auth, clients, hooks, utils, constants
ui/           Reusable presentational primitives — no business logic
config/       Application configuration files
```

## Import Boundary Rules

| Layer | May import from | Must NOT import from |
|-------|----------------|---------------------|
| `ui/` | `ui/`, `lib/` | `features/`, `modules/`, `services/` |
| `lib/` | `lib/` | `modules/`, `services/`, `features/`, `app/` |
| `services/` | `services/`, `lib/` | `features/`, `modules/`, `app/` |
| `modules/` | `modules/`, `lib/`, `ui/` | `features/`, `services/`, `app/` |
| `features/` | `features/`, `modules/`, `services/`, `lib/`, `ui/` | `app/` |
| `app/` | Everything | — |
```

### Update `ARCHITECTURE.md`

Update to reflect new directory structure after all phases complete.

---

## FINAL VALIDATION

Run after all phases complete:

```bash
# 1. Clean build
rm -rf .next
pnpm build
# Must complete with zero errors

# 2. Import boundary checks
echo "=== ui/ → features/ violations ==="
grep -r "from '@/features" ui/ --include="*.js" | wc -l
# Expected: 0

echo "=== lib/ → modules/services/features violations ==="
grep -r "from '@/modules\|from '@/services\|from '@/features" lib/ --include="*.js" | wc -l
# Expected: 0

echo "=== services/ → features/ violations ==="
grep -r "from '@/features" services/ --include="*.js" | wc -l
# Expected: 0

echo "=== Remaining @/core/ references ==="
grep -r "from '@/core/" . --include="*.js" --exclude-dir=node_modules --exclude-dir=.next | wc -l
# Expected: 0

echo "=== Remaining generic client.js in routes ==="
find app -name "client.js" | wc -l
# Expected: 0

echo "=== Remaining generic registry.js in routes ==="
find app -name "registry.js" | wc -l
# Expected: 0

echo "=== Remaining generic view.js in routes ==="
find app -name "view.js" | wc -l
# Expected: 0

# 3. Route verification
# Test: /, /movie/[id], /person/[id], /account/[username], /sign-in, /sign-up, /search
```

---

## WHAT WAS NOT CHANGED (AND WHY)

| Component | Reason Left Unchanged |
|-----------|----------------------|
| `modules/registry/use-registry.js` | Highly sophisticated: deep comparison engine, React element stabilization, ref-based function memoization. Correct and complex by design. |
| `{route}.registry.js` files | Contain route-specific JSX rendering, `useRouter`/`usePathname`/`useSearchParams` hooks, state machines, context menu configurations. Not simple config — cannot be extracted to a factory. |
| `{route}.view.js` files | 200–300+ LOC rendering trees with Suspense boundaries and deferred data loading. Renaming them is the right action, not merging. |
| `config/rollout.config.js` | Sophisticated env-patching system with `deepMerge`, `parseMode`, `parsePercent`, env variable overrides. Leave intact. |
| API route handlers (`app/api/`) | Existing `fetch` call contracts throughout the codebase depend on these URLs and HTTP methods. Merging endpoints would break all consumers. |
| `lib/auth/servers/security/` | 6 files with genuinely distinct security concerns (CSRF, rate limiting, step-up auth, reauth). Directory structure is appropriate. |
| `features/account/registry-config.js` | Large shared factory (`buildAccountPageState`) used by all account route registry files. Already well-structured. |

---

## EXPECTED OUTCOME

| Metric | Before | After |
|--------|--------|-------|
| Top-level directories with unclear purpose | `core/` | Eliminated |
| Ambiguous route file names | ~80 files | 0 |
| `ui/ → features/` import violations | 2 | 0 |
| `services/ → features/` import violations | 1 | 0 |
| Auth server subdirectories | 8 | 2 |
| Auth server files | 27 | 8 |
| Nav hook files | 14 | 5 |
| Mixed-concern `utils.js` in account | 1 (400+ LOC) | 6 focused modules |
| Naming patterns (distinct) | 14+ | 6 (standardized) |
| Total JS files (estimated) | 539 | ~480 |

---

## PHASE SUMMARY

| Phase | Description | Risk | Duration |
|-------|-------------|------|----------|
| 1 | Eliminate `core/` directory | Medium | 2-3 hours |
| 2 | Fix import boundary violations | Low | 30-45 min |
| 3 | Route file naming | Low | 1-2 hours |
| 4 | Split `features/account/utils.js` | Medium | 1.5-2 hours |
| 5 | Rename generic utility files | Low | 30-45 min |
| 6 | Consolidate auth server files | Medium | 2-3 hours |
| 7 | Consolidate navigation hooks | Low | 1 hour |
| 8 | Move `components/ui/` to `ui/` | Low | 15 min |
| 9 | Create documentation | None | 30 min |
| **Total** | | | **10-14 hours** |

---

*Document version: 3.0 — Consolidated from v0 analysis and Claude Code ground truth verification.*
