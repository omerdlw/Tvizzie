# Tvizzie: Technical Analysis Report and Restructuring Implementation Plan

---

## PART 1: TECHNICAL ANALYSIS REPORT

---

### 1. Executive Summary

Tvizzie is a full-stack movie discovery and social engagement platform built with Next.js 16, React 19, Tailwind CSS 4, and Supabase. The application enables users to search for movies and people (via TMDB API), manage personal watchlists, mark movies as watched, rate and review content, create curated lists, and engage socially through a follow system.

**Current Codebase Metrics:**
- **Total JavaScript Files:** ~539 files
- **Primary Directories:** `app/`, `core/`, `features/`, `ui/`, `config/`, `fonts/`
- **Route Groups:** 5 (`(account)`, `(admin)`, `(auth)`, `(home)`, `(media)`)
- **API Routes:** 35+ endpoints across auth, account, media, social, and admin domains
- **Lines of Code:** Estimated 25,000-35,000 LOC (excluding dependencies)

The codebase exhibits significant architectural complexity stemming from rapid iterative development with AI assistance. While functional, it demonstrates structural inconsistencies that impede maintainability, onboarding velocity, and portfolio presentation quality.

---

### 2. Technology Stack Analysis

#### 2.1 Core Framework
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 16.2.1 | App Router, Server Components, Route Handlers |
| UI Library | React | 19.2.4 | Component rendering, Concurrent features |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Animation | Framer Motion | 12.38.0 | Component animations, page transitions |
| Database/Auth | Supabase | 2.100.1 | PostgreSQL, Auth, Realtime, Storage |
| External API | TMDB | - | Movie/Person metadata |

#### 2.2 Supporting Libraries
- **@supabase/ssr**: Server-side Supabase client management
- **class-variance-authority**: Component variant composition
- **lenis**: Smooth scroll implementation
- **nodemailer**: Email dispatch for verification flows
- **html-to-image**: Screenshot/export functionality
- **lucide-react / @iconify-icon/react**: Icon systems

#### 2.3 Build Tooling
- **Turbopack**: Default bundler (Next.js 16)
- **React Compiler**: Enabled via babel plugin
- **ESLint 9**: Flat config format
- **Prettier**: Code formatting with Tailwind plugin

---

### 3. Architectural Patterns Analysis

#### 3.1 Directory Structure Overview

```
tvizzie/
├── app/                    # Next.js App Router entrypoints
│   ├── (account)/         # Account route group (profile, lists, watchlist, etc.)
│   ├── (admin)/           # Admin dashboard routes
│   ├── (auth)/            # Sign-in/sign-up routes
│   ├── (home)/            # Landing page
│   ├── (media)/           # Movie and person detail pages
│   └── api/               # API route handlers
├── core/                  # Runtime systems, services, clients
│   ├── auth/              # Auth server/client primitives
│   ├── clients/           # Supabase and TMDB client wrappers
│   ├── constants/         # Shared constants
│   ├── hooks/             # Shared React hooks
│   ├── modules/           # Runtime state providers (auth, nav, modal, registry, etc.)
│   ├── services/          # Data access and business logic
│   └── utils/             # Pure utility functions
├── features/              # Domain-specific UI composition
│   ├── account/           # Account page components and hooks
│   ├── auth/              # Auth UI components
│   ├── home/              # Home page components
│   ├── layout/            # Layout utilities and wrappers
│   ├── modal/             # Product-specific modals
│   ├── movie/             # Movie detail components
│   ├── navigation/        # Nav actions and surfaces
│   ├── person/            # Person detail components
│   ├── reviews/           # Review system components
│   └── shared/            # Cross-feature presentational components
├── ui/                    # Reusable presentational primitives
│   ├── animations/        # Animation wrappers
│   ├── elements/          # Form elements (Button, Input, Select, etc.)
│   ├── icon/              # Icon component
│   ├── loadings/          # Loading spinners
│   ├── skeletons/         # Skeleton loaders
│   └── states/            # Fullscreen state component
├── config/                # Configuration modules
├── fonts/                 # Custom font files
└── components/            # Legacy shadcn components (minimal)
```

#### 3.2 Route File Split Pattern

The codebase employs a consistent but verbose route file decomposition pattern:

| File | Purpose | Prevalence |
|------|---------|------------|
| `page.js` | Route entry, server-side data fetching | Universal |
| `client.js` | Client boundary wrapper, state management | ~90% of routes |
| `view.js` | Presentational component (optional) | ~40% of routes |
| `registry.js` | Route-local registry state injection | ~80% of routes |
| `loading.js` | Suspense fallback | ~70% of routes |
| `error.js` | Error boundary | ~50% of routes |
| `not-found.js` | 404 handler | ~30% of routes |

**Issue Identified:** The `client.js` → `registry.js` → `view.js` chain creates unnecessary indirection for simple routes. Many `registry.js` files exist solely to call `useRegistry()` with page-specific state, duplicating boilerplate across routes.

#### 3.3 Registry System Architecture

The codebase implements a custom "Registry" pattern (`core/modules/registry/`) that acts as a centralized state bus for:
- Navigation state
- Background overlay state
- Modal state
- Loading state
- Context menu state
- Guard state

Routes inject state via `useRegistry()` hook, and global providers consume this state to render navigation actions, modals, and overlays.

**Architecture Assessment:**
- **Strength:** Decouples route-specific state from global shell components
- **Weakness:** Heavy abstraction overhead; every route requires registry setup even for trivial cases

#### 3.4 Service Layer Architecture

Services are organized under `core/services/` with domain-based grouping:

| Service Domain | Responsibilities |
|----------------|------------------|
| `account/` | Profile CRUD, account bootstrapping, feed assembly |
| `activity/` | Activity event logging and retrieval |
| `browser/` | Browse page data assembly |
| `media/` | Watchlist, watched, likes, favorites, reviews |
| `notifications/` | Notification CRUD and subscriptions |
| `realtime/` | Live update broadcasting |
| `social/` | Follow/unfollow operations |
| `tmdb/` | TMDB API integration |
| `shared/` | Cross-service utilities |

**Pattern Observed:** Services follow a consistent pattern of:
1. Client-side functions for API consumption (`*.service.js`)
2. Server-side functions for route handlers (`*.server.js`)

#### 3.5 Authentication Architecture

Authentication is implemented as a multi-layered system:

```
core/auth/
├── clients/               # Browser-side auth utilities
│   ├── audit.client.js
│   ├── csrf.client.js
│   └── pending-account.client.js
├── servers/               # Server-side auth operations
│   ├── account/          # Account bootstrap, deletion, state
│   ├── audit/            # Auth audit logging
│   ├── notice/           # Auth route notices
│   ├── policy/           # Route access policies
│   ├── providers/        # OAuth provider integrations
│   ├── security/         # CSRF, rate limiting, password hashing
│   ├── session/          # Session management
│   └── verification/     # Email verification, password reset
└── oauth-providers.js    # Provider configuration
```

**Complexity Assessment:** The auth system is comprehensive but over-engineered for a portfolio project. 60+ files handle authentication alone.

---

### 4. Identified Structural Problems

#### 4.1 File Count Inflation

**Problem:** The codebase contains ~539 JavaScript files for a medium-complexity application. Industry benchmarks suggest 150-250 files would be appropriate for this feature set.

**Root Causes:**
1. Mandatory `client.js` + `registry.js` + `view.js` split for every route
2. Over-granular service decomposition
3. Excessive auth subsystem fragmentation
4. Redundant helper modules

**Evidence:**
- `app/(account)/account/[username]/` contains 5 files for a single page
- `core/auth/servers/` contains 18 files across 6 subdirectories
- `core/modules/nav/hooks/` contains 13 separate hook files

#### 4.2 Inconsistent Module Boundaries

**Problem:** Ownership between `core/`, `features/`, `ui/`, and `lib/` (referenced in ARCHITECTURE.md but partially implemented) is unclear.

**Evidence:**
- `features/account/utils.js` contains `isReservedAccountSegment()` which is consumed by `core/services/account/account.service.js` (circular dependency risk)
- `ui/skeletons/views/account.js` imports from `features/account/utils` and `features/layout/` (violates stated ui → features prohibition)
- `components/ui/` exists alongside `ui/` with overlapping purpose

#### 4.3 Abstraction Overhead

**Problem:** Multi-layer abstraction chains increase cognitive load without proportional benefit.

**Example Flow for Account Page:**
```
page.js → Client → AccountClient → Registry → ProfileLayout → 
HeroSection → ProfileHero → MediaGrid → MediaCard → ...
```

Each layer adds indirection but minimal distinct responsibility.

#### 4.4 Configuration Fragmentation

**Problem:** Six separate config files with overlapping concerns:

| Config File | Purpose |
|-------------|---------|
| `config/account.config.js` | Account adapter bindings |
| `config/auth.config.js` | Auth provider configuration |
| `config/nav.config.js` | Navigation item definitions |
| `config/project.config.js` | Feature flags, debug settings |
| `config/provider.config.js` | Auth provider type checks |
| `config/rollout.config.js` | Feature rollout gates |

**Recommendation:** Consolidate into 2-3 files with clearer domain separation.

#### 4.5 Route-Local vs Reusable Code Confusion

**Problem:** `registry.js` files across routes duplicate configuration patterns with minor variations.

**Evidence:** Comparison of `app/(account)/account/[username]/registry.js` vs `app/(account)/account/[username]/lists/registry.js` shows ~80% structural overlap with only prop/state differences.

---

### 5. Dependency Flow Analysis

#### 5.1 Stated Import Boundaries (from ARCHITECTURE.md)

```
app → features, modules, services, ui, lib, config
features → features, modules, services, ui, lib, config
modules → modules, ui, lib, config
services → services, lib, config
ui → ui, lib, config
lib → lib, config
```

#### 5.2 Observed Violations

| Source | Target | Violation Type |
|--------|--------|----------------|
| `ui/skeletons/views/account.js` | `features/account/utils` | ui → features |
| `ui/skeletons/views/account.js` | `features/layout/` | ui → features |
| `core/services/account/account.service.js` | `features/account/utils` | services → features |

#### 5.3 Circular Dependency Risks

The following import patterns create tight coupling:
- `features/account/registry-config.js` ← `features/navigation/surfaces/account-bio-surface.js` ← `features/account/profile/hero.js`
- `core/modules/nav/` ← `features/navigation/actions/` (documented exception, but architectural smell)

---

### 6. Code Quality Metrics

#### 6.1 Duplication Patterns

| Pattern | Occurrences | Impact |
|---------|-------------|--------|
| `useRegistry()` boilerplate | 15+ files | High |
| `loading.js` skeleton rendering | 12+ files | Medium |
| API route auth checks | 35+ files | Medium |
| Supabase query wrappers | 10+ files | Low |

#### 6.2 File Size Distribution

| Range | Count | Examples |
|-------|-------|----------|
| <50 LOC | ~150 files | Index re-exports, simple configs |
| 50-150 LOC | ~250 files | Route files, components |
| 150-300 LOC | ~100 files | Services, complex components |
| >300 LOC | ~40 files | TMDB client, account service |

#### 6.3 Naming Consistency

| Pattern | Consistency | Notes |
|---------|-------------|-------|
| `*.server.js` suffix | Good | Server-only modules |
| `*.client.js` suffix | Good | Client-specific modules |
| `*.service.js` suffix | Good | Service layer |
| `use*.js` hooks | Mixed | Some hooks in non-standard locations |

---

## PART 2: FILE STRUCTURE AND PROJECT ORGANIZATION IMPLEMENTATION PLAN

---

### Phase 1: Pre-Migration Setup

#### Step 1.1: Create Migration Tracking Infrastructure

**Action:** Create a migration manifest file to track changes.

```
migration/
├── manifest.json          # Tracks file moves, deletions, renames
├── dependency-map.json    # Pre-migration import graph
└── validation-checklist.md # Manual QA checkpoints
```

**Execution Instructions:**
1. Generate dependency graph using static analysis
2. Document every file's current imports and exports
3. Create rollback instructions for each phase

#### Step 1.2: Establish Target Directory Structure

**Target Structure:**

```
tvizzie/
├── app/                    # Route entrypoints only
│   ├── (account)/
│   ├── (admin)/
│   ├── (auth)/
│   ├── (home)/
│   ├── (media)/
│   └── api/
├── features/               # Domain UI composition (KEEP)
│   ├── account/
│   ├── auth/
│   ├── home/
│   ├── movie/
│   ├── navigation/
│   ├── person/
│   ├── reviews/
│   └── shared/
├── modules/                # Runtime providers/state (EXTRACTED FROM core/)
│   ├── auth/
│   ├── account/
│   ├── modal/
│   ├── nav/
│   ├── notification/
│   ├── registry/
│   ├── background/
│   └── loading/
├── services/               # Data access (EXTRACTED FROM core/)
│   ├── account/
│   ├── activity/
│   ├── media/
│   ├── notifications/
│   ├── realtime/
│   ├── social/
│   └── tmdb/
├── lib/                    # Pure utilities, constants, helpers
│   ├── auth/              # Auth primitives (from core/auth/)
│   ├── clients/           # Supabase/TMDB clients (from core/clients/)
│   ├── constants/
│   ├── hooks/
│   └── utils/
├── ui/                     # Presentational primitives (KEEP)
├── config/                 # Configuration (CONSOLIDATE)
└── fonts/                  # Font files (KEEP)
```

---

### Phase 2: Eliminate `core/` Directory

The `core/` directory conflates multiple concerns. Its contents should be redistributed.

#### Step 2.1: Extract `core/modules/` → `modules/`

**Files to Move:**
```
core/modules/auth/           → modules/auth/
core/modules/account/        → modules/account/
core/modules/modal/          → modules/modal/
core/modules/nav/            → modules/nav/
core/modules/notification/   → modules/notification/
core/modules/registry/       → modules/registry/
core/modules/background/     → modules/background/
core/modules/loading/        → modules/loading/
core/modules/countdown/      → modules/countdown/
core/modules/context-menu/   → modules/context-menu/
core/modules/error-boundary/ → modules/error-boundary/
core/modules/settings/       → modules/settings/
core/modules/api/            → services/shared/api-cache/ (merge)
```

**Import Update Pattern:**
```javascript
// Before
import { useAuth } from '@/core/modules/auth';

// After
import { useAuth } from '@/modules/auth';
```

**Execution Instructions for AI Agent:**
1. Create `modules/` directory at project root
2. Move each subdirectory of `core/modules/` to `modules/`
3. Update `jsconfig.json` paths alias: `"@/modules/*": ["modules/*"]`
4. Run global find-and-replace: `@/core/modules/` → `@/modules/`
5. Verify no broken imports via `next build`

#### Step 2.2: Extract `core/services/` → `services/`

**Files to Move:**
```
core/services/account/       → services/account/
core/services/activity/      → services/activity/
core/services/browser/       → services/browser/
core/services/media/         → services/media/
core/services/notifications/ → services/notifications/
core/services/realtime/      → services/realtime/
core/services/social/        → services/social/
core/services/tmdb/          → services/tmdb/
core/services/shared/        → services/shared/
```

**Execution Instructions for AI Agent:**
1. Create `services/` directory at project root
2. Move each subdirectory of `core/services/` to `services/`
3. Update `jsconfig.json` paths alias: `"@/services/*": ["services/*"]`
4. Run global find-and-replace: `@/core/services/` → `@/services/`

#### Step 2.3: Extract `core/clients/` → `lib/clients/`

**Files to Move:**
```
core/clients/supabase/ → lib/clients/supabase/
core/clients/tmdb/     → lib/clients/tmdb/
```

**Execution Instructions for AI Agent:**
1. Create `lib/clients/` directory
2. Move client directories
3. Update import alias: `@/core/clients/` → `@/lib/clients/`

#### Step 2.4: Extract `core/auth/` → `lib/auth/`

**Files to Move:**
```
core/auth/clients/     → lib/auth/clients/
core/auth/servers/     → lib/auth/servers/
core/auth/capabilities.js → lib/auth/capabilities.js
core/auth/oauth-callback.js → lib/auth/oauth-callback.js
core/auth/oauth-providers.js → lib/auth/oauth-providers.js
core/auth/route-notice.js → lib/auth/route-notice.js
```

**Execution Instructions for AI Agent:**
1. Create `lib/auth/` directory structure
2. Move files preserving subdirectory structure
3. Update import alias: `@/core/auth/` → `@/lib/auth/`

#### Step 2.5: Extract Remaining `core/` Contents

**Files to Move:**
```
core/constants/  → lib/constants/
core/hooks/      → lib/hooks/
core/utils/      → lib/utils/
core/index.js    → lib/index.js
```

#### Step 2.6: Delete Empty `core/` Directory

**Validation Before Deletion:**
1. Confirm `core/` is empty
2. Run `next build` to verify no broken imports
3. Run `next dev` and test critical paths

---

### Phase 3: Consolidate Route File Patterns

#### Step 3.1: Define Simplified Route Conventions

**New Convention:**
- `page.js` - Server component, data fetching, metadata
- `client.js` - Required ONLY if client interactivity needed
- ELIMINATE `view.js` files (merge into `client.js` or page components)
- ELIMINATE route-local `registry.js` (use shared registry configs)

#### Step 3.2: Consolidate Registry Configurations

**Create Centralized Registry Factory:**

**File:** `features/registry/route-configs.js`

**Execution Instructions for AI Agent:**
1. Analyze all `registry.js` files in `app/` routes
2. Extract common patterns into factory functions:
   ```javascript
   export function createAccountPageRegistry(options) { ... }
   export function createMediaPageRegistry(options) { ... }
   export function createAuthPageRegistry(options) { ... }
   ```
3. Replace route-local `registry.js` files with imports from centralized factory
4. Delete redundant `registry.js` files

#### Step 3.3: Merge `view.js` into Parent Components

**For Each Route with `view.js`:**
1. If `view.js` is <100 LOC, inline into `client.js`
2. If `view.js` is >100 LOC, rename to `{domain}-view.js` and keep in `features/{domain}/`
3. Update imports accordingly

**Target Files for Consolidation:**
```
app/(account)/account/[username]/view.js → INLINE to client.js
app/(account)/account/edit/view.js → INLINE to client.js
app/(media)/movie/[id]/view.js → features/movie/movie-detail-view.js
app/(media)/person/[id]/view.js → features/person/person-detail-view.js
app/(home)/view.js → features/home/home-view.js
```

---

### Phase 4: Fix Dependency Violations

#### Step 4.1: Resolve `ui/` → `features/` Violations

**File:** `ui/skeletons/views/account.js`

**Problem:** Imports `@/features/account/utils` and `@/features/layout/`

**Resolution:**
1. Extract `ACCOUNT_ROUTE_SHELL_CLASS` and `ACCOUNT_SECTION_SHELL_CLASS` to `lib/constants/layout.js`
2. Move `PageGradientShell` to `ui/layout/page-gradient-shell.js`
3. Update all imports

**Execution Instructions for AI Agent:**
1. Create `lib/constants/layout.js`:
   ```javascript
   export const ACCOUNT_ROUTE_SHELL_CLASS = '...';
   export const ACCOUNT_SECTION_SHELL_CLASS = '...';
   ```
2. Move values from `features/account/utils.js`
3. Update imports in `ui/skeletons/views/account.js`
4. Move `PageGradientShell` component to `ui/layout/`
5. Update all consumers

#### Step 4.2: Resolve `services/` → `features/` Violations

**File:** `core/services/account/account.service.js`

**Problem:** Imports `isReservedAccountSegment` from `@/features/account/utils`

**Resolution:**
1. Move `isReservedAccountSegment()` to `lib/utils/account.js`
2. Update imports in both service and feature files

#### Step 4.3: Resolve `components/ui/` Duplication

**Current State:**
- `components/ui/noise-texture.js`
- `components/ui/text-animate.js`

**Resolution:**
1. Move `noise-texture.js` → `ui/effects/noise-texture.js`
2. Move `text-animate.js` → `ui/animations/text-animate.js`
3. Delete `components/` directory if empty
4. Delete `components.json` (shadcn config) or update paths

---

### Phase 5: Consolidate Configuration Files

#### Step 5.1: Merge Related Configs

**New Structure:**
```
config/
├── app.config.js           # Merged: project.config + rollout.config
├── auth.config.js          # Keep: provider bindings
├── features.config.js      # Merged: account.config + provider.config
└── navigation.config.js    # Renamed from nav.config
```

**Execution Instructions for AI Agent:**
1. Merge `project.config.js` and `rollout.config.js` into `app.config.js`
2. Merge `account.config.js` and `provider.config.js` into `features.config.js`
3. Rename `nav.config.js` to `navigation.config.js`
4. Update all import paths
5. Delete redundant files

---

### Phase 6: Reduce Auth System Complexity

#### Step 6.1: Flatten Auth Server Structure

**Current:** 18 files across 6 subdirectories in `lib/auth/servers/`

**Target Structure:**
```
lib/auth/servers/
├── account.server.js       # Merged: account/*.server.js
├── audit.server.js         # Keep
├── providers.server.js     # Merged: providers/*.server.js
├── security.server.js      # Merged: security/*.server.js (keep rate-limit separate)
├── rate-limit.server.js    # Keep separate (complex)
├── session.server.js       # Merged: session/*.server.js
└── verification.server.js  # Merged: verification/*.server.js
```

**Execution Instructions for AI Agent:**
1. Consolidate `lib/auth/servers/account/*.server.js` into single file
2. Export all functions from consolidated file
3. Update imports across codebase
4. Repeat for each subdirectory
5. Target: Reduce from 18 files to 7 files

---

### Phase 7: Reduce Navigation Hook Fragmentation

#### Step 7.1: Consolidate Navigation Hooks

**Current:** `core/modules/nav/hooks/` contains 13 files

**Target:**
```
modules/nav/hooks/
├── use-navigation.js       # Primary navigation hook (keep)
├── use-nav-layout.js       # Merged: layout, height, element hooks
└── use-nav-actions.js      # Merged: action, component, badge hooks
```

**Execution Instructions for AI Agent:**
1. Merge `use-action-component.js`, `use-action-height.js`, `use-nav-badge.js` into `use-nav-actions.js`
2. Merge `use-element-height.js`, `use-nav-height.js`, `use-navigation-layout.js` into `use-nav-layout.js`
3. Update index re-exports
4. Update all consumers
5. Delete redundant files

---

### Phase 8: API Route Handler Consolidation

#### Step 8.1: Standardize Auth Route Handlers

**Current:** 10 files under `app/api/auth/`

**Consolidation Opportunities:**
- Merge `account/change-email`, `account/change-password`, `account/set-password` into single `account/credentials/route.js` with action parameter
- Merge `verification/send-code`, `verification/verify-code` into `verification/route.js` with action parameter

**Execution Instructions for AI Agent:**
1. Create unified route handlers with action-based dispatch
2. Update client-side API calls to include action parameter
3. Delete redundant route files
4. Target: Reduce from 10 auth API routes to 6

---

### Phase 9: Feature Module Cleanup

#### Step 9.1: Flatten `features/account/hooks/`

**Current:** 8 separate hook files

**Target:** Consolidate into 3 files:
```
features/account/hooks/
├── use-account-data.js     # Merged: page-data, edit-data, collections
├── use-account-actions.js  # Merged: page-actions, security-actions
└── use-account-social.js   # Merged: relationships, security-credentials
```

#### Step 9.2: Flatten `features/reviews/parts/`

**Current:** 7 component files in `parts/` subdirectory

**Target:** Move to flat structure:
```
features/reviews/
├── index.js
├── review-card.js
├── review-composer.js
├── review-header.js
├── review-list.js
├── rating-selector.js
├── rating-stars.js
├── review-auth-fallback.js
├── use-media-reviews.js
├── use-review-nav-state.js
└── utils.js
```

---

### Phase 10: Final Validation

#### Step 10.1: Build Verification

**Execution Instructions for AI Agent:**
1. Run `pnpm build` and capture output
2. Verify zero TypeScript/build errors
3. Verify no missing module warnings

#### Step 10.2: Runtime Verification

**Test Paths:**
1. Home page loads (`/`)
2. Movie detail loads (`/movie/123`)
3. Person detail loads (`/person/123`)
4. Account page loads (`/account/[username]`)
5. Sign in flow works (`/sign-in`)
6. Search functionality works (`/search`)

#### Step 10.3: Import Boundary Verification

**Execution Instructions for AI Agent:**
1. Run static analysis to verify import boundaries:
   - `ui/` does NOT import from `features/`
   - `services/` does NOT import from `features/`
   - `lib/` does NOT import from `modules/`, `services/`, `features/`
2. Document any remaining violations for future cleanup

---

### Migration Summary

#### Before Migration
| Metric | Value |
|--------|-------|
| Total JS Files | ~539 |
| Top-Level Directories | 8 |
| Route Files per Page | 4-7 |
| Auth System Files | 60+ |
| Config Files | 6 |
| Import Alias Prefixes | 3 (`@/core/`, `@/features/`, `@/ui/`) |

#### After Migration (Target)
| Metric | Value |
|--------|-------|
| Total JS Files | ~280-320 |
| Top-Level Directories | 8 (cleaner separation) |
| Route Files per Page | 1-3 |
| Auth System Files | ~25 |
| Config Files | 4 |
| Import Alias Prefixes | 6 (`@/app/`, `@/modules/`, `@/services/`, `@/features/`, `@/ui/`, `@/lib/`) |

---

### Execution Order for AI Agent

Execute phases in this exact order to minimize broken states:

1. **Phase 1** - Create migration infrastructure
2. **Phase 2** - Extract `core/` contents (highest impact, do first)
3. **Phase 4** - Fix dependency violations (required before further consolidation)
4. **Phase 3** - Consolidate route patterns
5. **Phase 5** - Consolidate configs
6. **Phase 6** - Reduce auth complexity
7. **Phase 7** - Consolidate nav hooks
8. **Phase 8** - Consolidate API routes
9. **Phase 9** - Feature module cleanup
10. **Phase 10** - Final validation

---

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking imports during migration | Run `next build` after each phase |
| Runtime regressions | Manual testing of critical paths between phases |
| Merge conflicts | Work on feature branch, rebase frequently |
| Lost functionality | Git history preserves all changes |

---

### Post-Migration Recommendations

1. **Add ESLint Import Boundaries Plugin** - Enforce `@typescript-eslint/no-restricted-imports` rules
2. **Add Architecture Tests** - Automated tests verifying import boundaries
3. **Document Module Ownership** - README in each top-level directory
4. **Remove Unused Exports** - Tree-shake unused functions after migration

---

*Document Version: 1.0*
*Generated: Analysis of Tvizzie codebase at commit HEAD*
*Target Audience: Advanced AI coding agents, senior engineers*
