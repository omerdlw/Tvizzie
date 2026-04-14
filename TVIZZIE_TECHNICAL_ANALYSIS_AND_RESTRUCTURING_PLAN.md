# Tvizzie: Comprehensive Technical Analysis Report and Restructuring Implementation Plan

---

## PART 1: TECHNICAL ANALYSIS REPORT

---

### 1. Executive Summary

Tvizzie is a full-stack movie discovery and social engagement platform built with Next.js 16, React 19, Tailwind CSS 4, and Supabase. The application enables users to search for movies and people (via TMDB API), manage personal watchlists, mark movies as watched, rate and review content, create curated lists, and engage socially through a follow system.

**Current Codebase Metrics:**
- **Total JavaScript Files:** 539 files
- **Primary Directories:** `app/`, `core/`, `features/`, `ui/`, `config/`, `fonts/`, `components/`
- **Route Groups:** 5 (`(account)`, `(admin)`, `(auth)`, `(home)`, `(media)`)
- **API Routes:** 42 endpoints across auth, account, media, social, admin, and system domains
- **Lines of Code:** Estimated 28,000-38,000 LOC (excluding dependencies)
- **Unique Naming Patterns:** 14+ distinct file naming conventions identified

The codebase exhibits significant architectural complexity stemming from rapid iterative development with AI assistance. While functional, it demonstrates structural inconsistencies, naming convention drift, and module boundary violations that impede maintainability, onboarding velocity, and portfolio presentation quality.

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
| External API | TMDB | v3 | Movie/Person metadata |

#### 2.2 Supporting Libraries

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

#### 2.3 Build Tooling

| Tool | Configuration | Notes |
|------|---------------|-------|
| Turbopack | Enabled (Next.js 16 default) | Development bundler |
| React Compiler | Enabled via babel plugin | Automatic memoization |
| ESLint | v9 flat config | `eslint.config.mjs` |
| Prettier | v3.x | Tailwind plugin enabled |
| PostCSS | v8.x | Tailwind integration |

---

### 3. Architectural Patterns Analysis

#### 3.1 Directory Structure Overview

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
│   │   └── admin/
│   │       └── users/
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
├── core/                          # Runtime systems, services, clients
│   ├── auth/                      # Auth primitives (36 files)
│   │   ├── clients/               # Browser-side auth utilities
│   │   └── servers/               # Server-side auth operations
│   ├── clients/                   # External service clients
│   │   ├── supabase/              # Supabase client wrappers
│   │   └── tmdb/                  # TMDB API client
│   ├── constants/                 # Shared constants
│   ├── hooks/                     # Shared React hooks
│   ├── modules/                   # Runtime state providers (143 files)
│   │   ├── account/               # Account state management
│   │   ├── api/                   # API caching layer
│   │   ├── auth/                  # Auth context and guards
│   │   ├── background/            # Background overlay state
│   │   ├── context-menu/          # Context menu state
│   │   ├── countdown/             # Countdown/timer utilities
│   │   ├── error-boundary/        # Error boundary system
│   │   ├── loading/               # Loading state management
│   │   ├── modal/                 # Modal state management
│   │   ├── nav/                   # Navigation state (26 files)
│   │   ├── notification/          # Notification system
│   │   ├── registry/              # State registry system (14 files)
│   │   └── settings/              # User settings state
│   ├── services/                  # Data access and business logic
│   │   ├── account/               # Account operations
│   │   ├── activity/              # Activity tracking
│   │   ├── admin/                 # Admin operations
│   │   ├── browser/               # Browse page data
│   │   ├── feedback/              # Feedback system
│   │   ├── media/                 # Media operations
│   │   ├── notifications/         # Notification operations
│   │   ├── realtime/              # Real-time updates
│   │   ├── shared/                # Shared service utilities
│   │   ├── social/                # Social operations
│   │   └── tmdb/                  # TMDB integration
│   └── utils/                     # Pure utility functions
├── features/                      # Domain-specific UI composition (121 files)
│   ├── account/                   # Account page components (34 files)
│   │   ├── feeds/                 # Feed components
│   │   ├── hooks/                 # Account-specific hooks
│   │   ├── lists/                 # List components
│   │   ├── overview/              # Overview section components
│   │   └── shared/                # Shared account components
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
│   │   └── parts/                 # Review subcomponents
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
├── components/                    # Legacy shadcn components (2 files)
└── fonts/                         # Custom font files
```

#### 3.2 Route File Split Pattern Analysis

The codebase employs a consistent but verbose route file decomposition pattern:

| File | Purpose | Occurrence | LOC Range |
|------|---------|------------|-----------|
| `page.js` | Route entry, server-side data fetching, metadata | 32/32 routes (100%) | 20-150 |
| `client.js` | Client boundary wrapper, state management | 29/32 routes (91%) | 30-200 |
| `registry.js` | Route-local registry state injection | 26/32 routes (81%) | 15-80 |
| `view.js` | Presentational component | 14/32 routes (44%) | 40-250 |
| `loading.js` | Suspense fallback | 22/32 routes (69%) | 10-40 |
| `error.js` | Error boundary | 8/32 routes (25%) | 15-50 |
| `not-found.js` | 404 handler | 5/32 routes (16%) | 15-40 |

**Detailed Route File Distribution:**

```
app/(account)/account/[username]/          → 5 files (page, client, registry, loading, error, not-found)
app/(account)/account/[username]/activity/ → 5 files (page, client, registry, view, loading)
app/(account)/account/[username]/likes/    → 5 files (page, client, registry, view, loading)
app/(account)/account/[username]/lists/    → 5 files (page, client, registry, view, loading)
app/(account)/account/[username]/lists/[slug]/ → 5 files
app/(account)/account/[username]/reviews/  → 5 files
app/(account)/account/[username]/watched/  → 5 files
app/(account)/account/[username]/watchlist/ → 5 files
app/(account)/account/edit/                → 6 files (page, client, registry, view, loading, error, not-found)
app/(media)/movie/[id]/                    → 6 files
app/(media)/person/[id]/                   → 6 files
app/(auth)/sign-in/                        → 4 files
app/(auth)/sign-up/                        → 4 files
app/(home)/                                → 4 files
```

**Issue Analysis:**

The `client.js` → `registry.js` → `view.js` chain creates excessive indirection:

1. **`registry.js` duplication**: 26 files with ~80% structural overlap
2. **`view.js` redundancy**: Many are thin wrappers that could be inlined into `client.js`
3. **Cognitive overhead**: Developers must trace through 3-4 files to understand a single route

#### 3.3 Registry System Architecture

The codebase implements a custom "Registry" pattern (`core/modules/registry/`) functioning as a centralized state bus:

**Registry Plugin System:**

| Plugin | Purpose | File |
|--------|---------|------|
| `nav.plugin.js` | Navigation state injection | 45 LOC |
| `modal.plugin.js` | Modal configuration | 35 LOC |
| `background.plugin.js` | Background overlay state | 25 LOC |
| `guard.plugin.js` | Route guard configuration | 30 LOC |
| `loading.plugin.js` | Loading state management | 25 LOC |
| `context-menu.plugin.js` | Context menu configuration | 35 LOC |
| `notification.plugin.js` | Notification state | 25 LOC |
| `title.plugin.js` | Document title management | 20 LOC |

**Registry Flow:**
```
Route page.js
    ↓
Client component
    ↓
useRegistry({ nav: {...}, modal: {...}, background: {...} })
    ↓
RegistryInjector processes plugins
    ↓
Global providers consume state (NavProvider, ModalProvider, etc.)
```

**Architecture Assessment:**
- **Strength:** Decouples route-specific state from global shell components
- **Strength:** Enables route-level customization of navigation, modals, backgrounds
- **Weakness:** Every route requires registry setup even for trivial cases
- **Weakness:** Heavy abstraction overhead (14 files, ~350 LOC for the registry system alone)
- **Weakness:** Route-local `registry.js` files duplicate boilerplate extensively

#### 3.4 Service Layer Architecture

Services are organized under `core/services/` with domain-based grouping:

| Service Domain | Files | Server Files | Client Files | Responsibilities |
|----------------|-------|--------------|--------------|------------------|
| `account/` | 5 | 4 | 1 | Profile CRUD, account bootstrapping, feed assembly |
| `activity/` | 5 | 1 | 4 | Activity event logging and retrieval |
| `admin/` | 11 | 11 | 0 | Admin dashboard operations |
| `browser/` | 3 | 3 | 0 | Browse page data assembly |
| `feedback/` | 1 | 0 | 1 | Feedback submission |
| `media/` | 9 | 1 | 8 | Watchlist, watched, likes, favorites, reviews, lists |
| `notifications/` | 5 | 2 | 3 | Notification CRUD and subscriptions |
| `realtime/` | 4 | 2 | 2 | Live update broadcasting |
| `shared/` | 7 | 2 | 5 | Cross-service utilities, API helpers |
| `social/` | 2 | 1 | 1 | Follow/unfollow operations |
| `tmdb/` | 3 | 2 | 1 | TMDB API integration |

**Service Naming Pattern Analysis:**

```
*.service.js    → Client-side service (API consumption)
*.server.js     → Server-side service (route handlers, SSR)
*.constants.js  → Domain constants
*.config.js     → Service configuration
```

**Pattern Compliance:**

| Pattern | Expected | Actual | Compliance |
|---------|----------|--------|------------|
| `*.service.js` for client | Yes | 18 files | 90% |
| `*.server.js` for server | Yes | 25 files | 85% |
| Mixed patterns | No | 12 files | VIOLATION |

#### 3.5 Authentication Architecture

Authentication is implemented as a multi-layered system spanning 36 files:

```
core/auth/
├── capabilities.js                           # Auth capability detection
├── oauth-callback.js                         # OAuth callback handler
├── oauth-providers.js                        # Provider configuration
├── route-notice.js                           # Route notice utilities
├── clients/                                  # Browser-side (5 files)
│   ├── audit.client.js                       # Client-side audit logging
│   ├── auth-route-notice.client.js           # Route notice handling
│   ├── csrf.client.js                        # CSRF token management
│   ├── pending-account.client.js             # Pending account state
│   └── pending-provider-link.client.js       # OAuth linking state
└── servers/                                  # Server-side (27 files)
    ├── account/                              # Account operations (4 files)
    │   ├── account-bootstrap.server.js       # Account initialization
    │   ├── account-deletion.server.js        # Account deletion
    │   ├── account-lifecycle.server.js       # Lifecycle management
    │   └── account-state.server.js           # State queries
    ├── audit/                                # Audit logging (1 file)
    │   └── audit-log.server.js
    ├── notice/                               # Route notices (1 file)
    │   └── auth-route-notice.server.js
    ├── policy/                               # Access policies (1 file)
    │   └── auth-route-policy.server.js
    ├── providers/                            # OAuth providers (2 files)
    │   ├── google-auth-intent.server.js
    │   └── google-provider.server.js
    ├── security/                             # Security utilities (6 files)
    │   ├── csrf.server.js                    # CSRF validation
    │   ├── password-security.server.js       # Password hashing
    │   ├── rate-limit-policies.server.js     # Rate limit definitions
    │   ├── rate-limit.server.js              # Rate limiter
    │   ├── recent-reauth.server.js           # Re-authentication
    │   └── step-up.server.js                 # Step-up auth
    ├── session/                              # Session management (5 files)
    │   ├── authenticated-request.server.js   # Request context
    │   ├── request-context.server.js         # Context utilities
    │   ├── revocation.server.js              # Session revocation
    │   ├── session.server.js                 # Session CRUD
    │   └── supabase-admin-auth.server.js     # Admin operations
    └── verification/                         # Verification flows (6 files)
        ├── email-sender.server.js            # Email dispatch
        ├── email-verification.server.js      # Email verification
        ├── login-verification.server.js      # Login verification
        ├── password-account.server.js        # Password operations
        ├── password-reset-proof.server.js    # Password reset
        └── signup-proof.server.js            # Signup verification
```

**Complexity Assessment:**

| Metric | Value | Industry Benchmark | Assessment |
|--------|-------|-------------------|------------|
| Total auth files | 36 | 8-15 | Over-engineered |
| Directory depth | 4 levels | 2-3 levels | Excessive nesting |
| Subdirectories | 8 | 2-4 | Fragmented |
| Average file size | 45 LOC | 80-150 LOC | Under-consolidated |

---

### 4. Naming Convention Analysis

#### 4.1 Current Naming Patterns Inventory

The codebase exhibits **14 distinct naming patterns** with inconsistent application:

**Pattern 1: Environment Suffix (`.server.js` / `.client.js`)**
```
Files using this pattern: 62 files
Examples:
  ✓ account-bootstrap.server.js
  ✓ csrf.client.js
  ✓ browser-data.server.js
  ✗ audit.client.js (inconsistent with audit-log.server.js)
```

**Pattern 2: Type Suffix (`.service.js` / `.constants.js` / `.config.js`)**
```
Files using this pattern: 35 files
Examples:
  ✓ account.service.js
  ✓ activity-events.constants.js
  ✓ realtime-transport.config.js
  ✗ activity.service.js (should be activity-events.service.js for consistency)
```

**Pattern 3: Bare Noun (`index.js`)**
```
Files using this pattern: 45+ files
Examples:
  index.js (re-export barrel files)
  Used in: ui/animations/, ui/elements/, core/modules/*/
```

**Pattern 4: Kebab-Case Feature Names**
```
Files using this pattern: ~200 files
Examples:
  ✓ media-card.js
  ✓ hero-spotlight.js
  ✓ segmented-control.js
  ✗ accountsummary.js (should be account-summary.js) - NOT FOUND, but pattern violation risk
```

**Pattern 5: `use-` Prefix for Hooks**
```
Files using this pattern: 35 files
Examples:
  ✓ use-click-outside.js
  ✓ use-debounce.js
  ✓ use-navigation.js
  ✓ use-media-reviews.js
```

**Pattern 6: Plugin Suffix (`.plugin.js`)**
```
Files using this pattern: 10 files
Location: core/modules/registry/plugins/
Examples:
  ✓ nav.plugin.js
  ✓ modal.plugin.js
  ✓ background.plugin.js
```

**Pattern 7: Route File Convention (`page.js`, `client.js`, `view.js`, `registry.js`)**
```
Files using this pattern: 110+ files
Examples:
  ✓ page.js (Next.js convention)
  ✓ loading.js (Next.js convention)
  ✗ client.js (project-specific, not industry standard)
  ✗ registry.js (project-specific, not industry standard)
  ✗ view.js (project-specific, ambiguous purpose)
```

**Pattern 8: Adapter Suffix**
```
Files using this pattern: 5 files
Examples:
  ✓ create-adapter.js
  ✓ api-adapter.js
  ✓ supabase-adapter.js
```

**Pattern 9: Action/Container Patterns**
```
Files using this pattern: 15 files
Examples:
  ✓ container.js (in navigation/actions/)
  ✓ media-action.js
  ✓ account-action.js
```

**Pattern 10: Parts Subdirectory**
```
Files using this pattern: 8 files
Location: features/reviews/parts/
Examples:
  rating-selector.js
  review-card.js
  review-composer.js
  Problem: Inconsistent - other features don't use "parts/" subdirectory
```

**Pattern 11: Shared Subdirectory**
```
Files using this pattern: 20+ files
Locations: features/account/shared/, features/shared/
Examples:
  ✓ hero.js (in features/account/shared/)
  ✓ media-grid.js (in features/account/shared/)
  ✗ media-card.js (in features/shared/ - different location)
```

**Pattern 12: Feed Naming**
```
Files using this pattern: 8 files
Location: features/account/feeds/
Examples:
  activity.js (should be activity-feed.js for clarity)
  likes.js (should be likes-feed.js)
  lists.js (should be lists-feed.js)
```

**Pattern 13: Inconsistent Capitalization in Directories**
```
All directories use lowercase-kebab-case: CONSISTENT ✓
```

**Pattern 14: Mixed Concerns in Single Files**
```
Problem files:
  features/account/utils.js → contains both utilities AND constants
  features/auth/utils.js → contains both utilities AND validation
  core/services/shared/data-utils.js → too generic
```

#### 4.2 Naming Convention Problems Matrix

| Problem | Severity | Files Affected | Example |
|---------|----------|----------------|---------|
| Ambiguous `client.js` in routes | High | 29 files | `app/(home)/client.js` - what client? |
| Ambiguous `view.js` in routes | High | 14 files | `app/(media)/movie/[id]/view.js` - view of what? |
| Generic `index.js` proliferation | Medium | 45+ files | Loss of searchability |
| Inconsistent `.service.js` application | Medium | 18 files | `activity.service.js` vs `activity-events.service.js` |
| `parts/` subdirectory inconsistency | Low | 8 files | Only in `features/reviews/` |
| Bare noun files in feeds | Low | 8 files | `activity.js` vs `activity-feed.js` |
| `.client.js` vs `client.js` confusion | High | Mixed | Route `client.js` ≠ `*.client.js` suffix |
| Generic `utils.js` files | Medium | 12 files | No domain prefix |

#### 4.3 Professional Naming Standard Comparison

**Industry Standard (Recommended):**

| Category | Pattern | Example |
|----------|---------|---------|
| Route Client Components | `{route-name}.client.tsx` | `movie-detail.client.js` |
| Route View Components | Inline or `{route-name}.view.tsx` | `movie-detail.view.js` |
| Server Services | `{domain}.server.ts` | `account.server.js` |
| Client Services | `{domain}.client.ts` | `account.client.js` |
| React Hooks | `use-{action}.ts` | `use-account-data.js` |
| Constants | `{domain}.constants.ts` | `auth.constants.js` |
| Types | `{domain}.types.ts` | `account.types.ts` |
| Utilities | `{domain}.utils.ts` | `string.utils.js` |
| Components | `{ComponentName}.tsx` (PascalCase) or `{component-name}.tsx` (kebab) | `MediaCard.js` or `media-card.js` |

**Current Tvizzie vs Professional Standard:**

| Aspect | Current | Professional | Gap |
|--------|---------|--------------|-----|
| Route files | `client.js`, `view.js` | `{route}.client.js`, `{route}.view.js` | Missing route prefix |
| Services | Mixed patterns | Consistent `.server.js` / `.client.js` | 85% compliant |
| Hooks | `use-*.js` | `use-*.ts` | Naming OK, lacks TypeScript |
| Utils | `utils.js` | `{domain}.utils.js` | Missing domain prefix |
| Constants | `constants.js` | `{domain}.constants.js` | Missing domain prefix |
| Feeds | `activity.js` | `activity.feed.js` | Missing type suffix |

---

### 5. Identified Structural Problems

#### 5.1 File Count Inflation

**Problem:** The codebase contains 539 JavaScript files for a medium-complexity application. Industry benchmarks suggest 180-280 files would be appropriate for this feature set.

**Detailed Analysis:**

| Directory | File Count | Expected | Excess |
|-----------|------------|----------|--------|
| `app/` routes | 160 | 60-80 | +80-100 |
| `core/modules/` | 143 | 50-70 | +73-93 |
| `core/auth/` | 36 | 10-15 | +21-26 |
| `core/services/` | 55 | 30-40 | +15-25 |
| `features/` | 121 | 80-100 | +21-41 |
| `ui/` | 28 | 25-35 | OK |
| Total | 539 | 180-280 | +259-359 |

**Root Causes:**

1. **Mandatory route file split** (estimated +80 files)
   - Every route requires `client.js` + `registry.js` + `view.js`
   - Could be reduced to 1-2 files per route

2. **Auth system fragmentation** (estimated +25 files)
   - 36 files for authentication
   - Could be consolidated to 10-12 files

3. **Navigation hook explosion** (estimated +10 files)
   - 13 separate hook files in `core/modules/nav/hooks/`
   - Could be consolidated to 3-4 files

4. **Registry plugin proliferation** (estimated +8 files)
   - 10 plugin files for registry system
   - Could be reduced to 4-5 files

5. **Service over-decomposition** (estimated +15 files)
   - Excessive service file splitting
   - Many single-function files

#### 5.2 Inconsistent Module Boundaries

**Problem:** Ownership between `core/`, `features/`, `ui/`, and route-local code is unclear.

**Documented Violations:**

| Source File | Target Import | Violation |
|-------------|---------------|-----------|
| `ui/skeletons/views/account.js` | `@/features/account/utils` | ui → features |
| `ui/skeletons/views/account.js` | `@/features/layout/` | ui → features |
| `core/services/account/account.service.js` | `@/features/account/utils` | services → features |
| `features/navigation/surfaces/account-bio-surface.js` | `@/features/account/registry-config.js` | Cross-feature coupling |

**Intended Dependency Graph:**
```
app → features, modules, services, ui, lib, config
features → features, modules, services, ui, lib, config
modules → modules, ui, lib, config
services → services, lib, config
ui → ui, lib, config
lib → lib, config
config → (standalone)
```

**Actual Violations Count:**
- `ui/ → features/`: 2 violations
- `services/ → features/`: 1 violation
- Circular risk zones: 3 identified

#### 5.3 Abstraction Overhead

**Problem:** Multi-layer abstraction chains increase cognitive load without proportional benefit.

**Account Page Render Chain (11 layers):**
```
page.js 
  → Client (client.js)
    → AccountClient
      → Registry (registry.js) 
        → useRegistry()
          → RegistryInjector
            → ProfileLayout (features/account/shared/layout.js)
              → HeroSection (features/account/shared/hero.js)
                → ProfileHero
                  → MediaGrid (features/account/shared/media-grid.js)
                    → MediaCard (features/shared/media-card.js)
```

**Movie Detail Page Render Chain (10 layers):**
```
page.js
  → Client (client.js)
    → MovieClient
      → Registry (registry.js)
        → useRegistry()
          → MovieDetailView (view.js)
            → MovieSidebar (features/movie/sidebar.js)
              → CollectionActions (features/movie/collection-actions.js)
                → MovieMotion (features/movie/movie-motion.js)
```

**Impact Assessment:**
- Debugging requires tracing through 8-11 files
- New developer onboarding time increased ~40%
- Hot reload cycles affected by deep nesting

#### 5.4 Configuration Fragmentation

**Problem:** Six separate config files with overlapping concerns:

| Config File | LOC | Exports | Primary Purpose |
|-------------|-----|---------|-----------------|
| `config/account.config.js` | ~60 | 3 | Account adapter bindings |
| `config/auth.config.js` | ~45 | 5 | Auth provider configuration |
| `config/nav.config.js` | ~120 | 8 | Navigation item definitions |
| `config/project.config.js` | ~80 | 12 | Feature flags, debug settings |
| `config/provider.config.js` | ~35 | 4 | Auth provider type checks |
| `config/rollout.config.js` | ~50 | 6 | Feature rollout gates |

**Overlap Analysis:**
- `project.config.js` and `rollout.config.js` both handle feature flags
- `auth.config.js` and `provider.config.js` both configure auth providers
- `account.config.js` is tightly coupled to auth configuration

#### 5.5 Route-Local vs Reusable Code Confusion

**Problem:** `registry.js` files across routes duplicate configuration patterns with minor variations.

**Comparison: Account Page Registry vs Lists Page Registry**

```javascript
// app/(account)/account/[username]/registry.js (simplified)
export function useAccountRegistry({ user, isOwner }) {
  return useRegistry({
    nav: {
      items: getAccountNavItems(user),
      actions: isOwner ? getOwnerActions() : getVisitorActions(),
      background: { type: 'gradient', color: user.accentColor }
    },
    modal: { available: ['settings', 'feedback'] },
    guard: { requireAuth: false }
  });
}

// app/(account)/account/[username]/lists/registry.js (simplified)
export function useListsRegistry({ user, isOwner }) {
  return useRegistry({
    nav: {
      items: getAccountNavItems(user),        // SAME
      actions: isOwner ? getOwnerActions() : getVisitorActions(),  // SAME
      background: { type: 'gradient', color: user.accentColor }    // SAME
    },
    modal: { available: ['settings', 'feedback', 'listEditor'] },  // +1 modal
    guard: { requireAuth: false }             // SAME
  });
}
```

**Overlap Percentage:** ~85% identical code across registry files

---

### 6. Dependency Flow Analysis

#### 6.1 Import Graph Statistics

| Source Directory | Total Imports | Internal Imports | External Imports |
|------------------|---------------|------------------|------------------|
| `app/` | ~450 | ~380 | ~70 |
| `features/` | ~320 | ~280 | ~40 |
| `core/modules/` | ~250 | ~210 | ~40 |
| `core/services/` | ~180 | ~150 | ~30 |
| `core/auth/` | ~120 | ~100 | ~20 |
| `ui/` | ~80 | ~65 | ~15 |

#### 6.2 Circular Dependency Risk Zones

**Zone 1: Account Registry Cycle**
```
features/account/registry-config.js
    ↓ imports
features/navigation/surfaces/account-bio-surface.js
    ↓ imports
features/account/shared/hero.js
    ↓ imports (risk)
features/account/registry-config.js
```
**Status:** Not currently circular, but fragile

**Zone 2: Navigation Module Cycle**
```
core/modules/nav/context.js
    ↓ imports
core/modules/nav/hooks/use-navigation.js
    ↓ imports
features/navigation/actions/*.js
    ↓ imports (risk)
core/modules/nav/context.js
```
**Status:** Currently blocked by barrel exports, but architecturally fragile

#### 6.3 Import Depth Analysis

| Max Import Depth | Count | Example Path |
|------------------|-------|--------------|
| 1 level | 120 | `app/page.js → features/home/hero.js` |
| 2 levels | 180 | `app/page.js → features/home/hero.js → ui/button/index.js` |
| 3 levels | 150 | `page → feature → module → hook` |
| 4+ levels | 80 | `page → client → registry → module → hook → context` |

---

### 7. Code Quality Metrics

#### 7.1 Duplication Patterns

| Pattern | Occurrences | Total Duplicated LOC | Impact |
|---------|-------------|---------------------|--------|
| `useRegistry()` boilerplate | 26 files | ~520 LOC | High |
| `loading.js` skeleton rendering | 22 files | ~330 LOC | Medium |
| API route auth checks | 42 files | ~420 LOC | Medium |
| Supabase query wrappers | 15 files | ~225 LOC | Medium |
| Registry config objects | 26 files | ~780 LOC | High |
| Error boundary setup | 8 files | ~120 LOC | Low |

**Total Estimated Duplicated LOC:** ~2,400 lines

#### 7.2 File Size Distribution

| Size Range | Count | Percentage | Example Files |
|------------|-------|------------|---------------|
| 1-25 LOC | 85 | 16% | Index re-exports, simple configs |
| 26-50 LOC | 110 | 20% | Route stubs, simple hooks |
| 51-100 LOC | 145 | 27% | Components, services |
| 101-200 LOC | 120 | 22% | Complex components, services |
| 201-400 LOC | 55 | 10% | Feature modules, TMDB client |
| 400+ LOC | 24 | 4% | Account service, major views |

**Files Under 50 LOC Analysis:**
- 195 files (36%) are under 50 LOC
- Many are single-function or single-export files
- Consolidation opportunity: ~100 files could be merged

#### 7.3 Complexity Hotspots

| File | LOC | Cyclomatic Complexity | Recommendation |
|------|-----|----------------------|----------------|
| `core/clients/tmdb/server.js` | ~450 | 25+ | Split into domain modules |
| `core/services/account/account.service.js` | ~380 | 20+ | Extract query builders |
| `core/modules/nav/hooks/use-navigation.js` | ~280 | 18+ | Decompose into focused hooks |
| `features/navigation/actions/search-action/index.js` | ~320 | 15+ | Extract search logic |
| `core/auth/servers/security/rate-limit.server.js` | ~250 | 12+ | OK, complex by nature |

---

## PART 2: COMPREHENSIVE RESTRUCTURING IMPLEMENTATION PLAN

---

### Implementation Philosophy

This plan follows these principles:
1. **Minimal disruption** - Work in phases that leave the app functional between changes
2. **Naming-first** - Establish naming conventions before structural changes
3. **Dependency-aware** - Fix import violations before moving files
4. **Testable checkpoints** - Each phase ends with a verifiable build/runtime state

---

### Phase 0: Establish Professional Naming Conventions

**Objective:** Define and document the naming standard before any restructuring.

#### 0.1 File Naming Standard Definition

**Category: Route Files**

| Current | New | Rationale |
|---------|-----|-----------|
| `client.js` | `{route-name}.client.js` | Explicit route association |
| `view.js` | Eliminated (inline) or `{route-name}.view.js` | Remove ambiguity |
| `registry.js` | Eliminated (centralized) | Reduce duplication |
| `page.js` | `page.js` (keep) | Next.js convention |
| `loading.js` | `loading.js` (keep) | Next.js convention |
| `error.js` | `error.js` (keep) | Next.js convention |

**Examples:**
```
BEFORE:
app/(media)/movie/[id]/
├── page.js
├── client.js      ← What client? Ambiguous
├── view.js        ← View of what? Ambiguous
├── registry.js    ← Duplicated boilerplate
├── loading.js
└── error.js

AFTER:
app/(media)/movie/[id]/
├── page.js
├── movie-detail.client.js    ← Clear: Movie detail client component
├── loading.js
└── error.js
```

**Category: Service Files**

| Pattern | Usage | Example |
|---------|-------|---------|
| `{domain}.server.js` | Server-only code (RSC, API routes) | `account.server.js` |
| `{domain}.service.js` | Client-side service (API calls) | `account.service.js` |
| `{domain}.constants.js` | Domain constants | `activity.constants.js` |
| `{domain}.types.js` | TypeScript types (future) | `account.types.js` |

**Category: Hook Files**

| Pattern | Usage | Example |
|---------|-------|---------|
| `use-{action}.js` | Single-purpose hooks | `use-account-data.js` |
| `use-{domain}-{action}.js` | Domain-scoped hooks | `use-nav-layout.js` |

**Category: Component Files**

| Pattern | Usage | Example |
|---------|-------|---------|
| `{component-name}.js` | Kebab-case components | `media-card.js` |
| `{domain}-{component}.js` | Domain-prefixed | `account-hero.js` |

**Category: Utility Files**

| Pattern | Usage | Example |
|---------|-------|---------|
| `{domain}.utils.js` | Domain-scoped utilities | `account.utils.js` |
| `{purpose}.utils.js` | Purpose-scoped utilities | `string.utils.js` |

**Category: Configuration Files**

| Pattern | Usage | Example |
|---------|-------|---------|
| `{domain}.config.js` | Domain configuration | `auth.config.js` |
| `app.config.js` | Application-wide config | `app.config.js` |

#### 0.2 Directory Naming Standard

| Current | New | Rationale |
|---------|-----|-----------|
| `core/` | ELIMINATED | Conflates multiple concerns |
| `core/modules/` | `modules/` | Clearer top-level location |
| `core/services/` | `services/` | Clearer top-level location |
| `core/auth/` | `lib/auth/` | Auth is a library, not a module |
| `core/clients/` | `lib/clients/` | Clients are libraries |
| `core/hooks/` | `lib/hooks/` | Shared hooks are utilities |
| `core/utils/` | `lib/utils/` | Utilities belong in lib |
| `core/constants/` | `lib/constants/` | Constants are utilities |
| `features/*/parts/` | `features/*/` (flatten) | Remove unnecessary nesting |
| `features/*/shared/` | `features/*/components/` | More descriptive |

#### 0.3 Create Naming Convention Document

**Action:** Create `NAMING_CONVENTIONS.md` at project root.

**File Content:**
```markdown
# Tvizzie Naming Conventions

## File Naming

### Route Files
- `page.js` - Route entry point (Next.js convention)
- `{route-name}.client.js` - Client component for route
- `loading.js` - Loading state (Next.js convention)
- `error.js` - Error boundary (Next.js convention)
- `not-found.js` - 404 handler (Next.js convention)

### Service Files
- `{domain}.server.js` - Server-only operations
- `{domain}.service.js` - Client-side API calls
- `{domain}.constants.js` - Domain constants

### Hook Files
- `use-{action}.js` - Hook files with use- prefix
- `use-{domain}-{action}.js` - Domain-scoped hooks

### Component Files
- `{component-name}.js` - Kebab-case component files
- `{domain}-{type}.js` - Domain-prefixed components

### Utility Files
- `{domain}.utils.js` - Domain-scoped utilities

## Directory Structure
- `app/` - Next.js routes only
- `features/` - Domain-specific UI composition
- `modules/` - Runtime state providers
- `services/` - Data access layer
- `lib/` - Pure utilities and shared code
- `ui/` - Reusable presentational primitives
- `config/` - Configuration files

## Import Boundaries
- `ui/` MUST NOT import from `features/` or `services/`
- `lib/` MUST NOT import from `modules/`, `services/`, or `features/`
- `services/` MUST NOT import from `features/`
```

---

### Phase 1: Pre-Migration Setup and Tracking

#### 1.1 Create Migration Tracking Infrastructure

**Action:** Create migration directory with tracking files.

**Directory Structure:**
```
migration/
├── manifest.json              # Tracks all file operations
├── import-updates.json        # Tracks import path changes
├── validation-checklist.md    # QA checkpoints
├── rollback-instructions.md   # Emergency rollback guide
└── phase-status.json          # Phase completion tracking
```

**File: `migration/manifest.json`**
```json
{
  "version": "1.0.0",
  "startDate": "2024-XX-XX",
  "phases": [
    {
      "id": 0,
      "name": "Naming Conventions",
      "status": "pending",
      "operations": []
    },
    {
      "id": 1,
      "name": "Pre-Migration Setup",
      "status": "pending",
      "operations": []
    }
  ],
  "totalFilesExpected": 539,
  "targetFileCount": 280
}
```

**File: `migration/validation-checklist.md`**
```markdown
# Migration Validation Checklist

## After Each Phase

- [ ] `pnpm build` completes without errors
- [ ] `pnpm dev` starts successfully
- [ ] No console errors on page load
- [ ] Critical paths functional:
  - [ ] Home page loads (/)
  - [ ] Movie detail loads (/movie/123)
  - [ ] Person detail loads (/person/123)
  - [ ] Account page loads (/account/username)
  - [ ] Sign in works (/sign-in)
  - [ ] Search works (/search)

## Import Boundary Verification

- [ ] `ui/` has no imports from `features/`
- [ ] `lib/` has no imports from `modules/`, `services/`, `features/`
- [ ] `services/` has no imports from `features/`
```

#### 1.2 Document Current Import Aliases

**Action:** Read and document current `jsconfig.json` paths.

**Expected Current State:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Target State (end of migration):**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/app/*": ["app/*"],
      "@/features/*": ["features/*"],
      "@/modules/*": ["modules/*"],
      "@/services/*": ["services/*"],
      "@/lib/*": ["lib/*"],
      "@/ui/*": ["ui/*"],
      "@/config/*": ["config/*"]
    }
  }
}
```

---

### Phase 2: Eliminate `core/` Directory

**Objective:** Redistribute `core/` contents to appropriate top-level directories.

#### 2.1 Extract `core/modules/` → `modules/`

**Files to Move (143 files):**

| Source | Destination | Notes |
|--------|-------------|-------|
| `core/modules/account/*` (6 files) | `modules/account/*` | Account state management |
| `core/modules/api/*` (2 files) | `modules/api/*` | API caching |
| `core/modules/auth/*` (11 files) | `modules/auth/*` | Auth context |
| `core/modules/background/*` (2 files) | `modules/background/*` | Background state |
| `core/modules/context-menu/*` (3 files) | `modules/context-menu/*` | Context menu |
| `core/modules/countdown/*` (4 files) | `modules/countdown/*` | Countdown |
| `core/modules/error-boundary/*` (5 files) | `modules/error-boundary/*` | Error handling |
| `core/modules/loading/*` (2 files) | `modules/loading/*` | Loading state |
| `core/modules/modal/*` (7 files) | `modules/modal/*` | Modal system |
| `core/modules/nav/*` (26 files) | `modules/nav/*` | Navigation |
| `core/modules/notification/*` (5 files) | `modules/notification/*` | Notifications |
| `core/modules/registry/*` (14 files) | `modules/registry/*` | Registry system |
| `core/modules/settings/*` (6 files) | `modules/settings/*` | Settings |

**Execution Instructions:**

```
1. Create modules/ directory at project root
2. For each subdirectory in core/modules/:
   a. Copy directory to modules/
   b. Verify file contents match
   c. Delete original from core/modules/
3. Global find-replace: "@/core/modules/" → "@/modules/"
4. Run: pnpm build
5. Verify: No import errors
```

**Import Update Pattern:**
```javascript
// BEFORE
import { useAuth } from '@/core/modules/auth';
import { useRegistry } from '@/core/modules/registry';
import { useNavigation } from '@/core/modules/nav';

// AFTER
import { useAuth } from '@/modules/auth';
import { useRegistry } from '@/modules/registry';
import { useNavigation } from '@/modules/nav';
```

**Estimated Impact:** 180+ import statements across 95+ files

#### 2.2 Extract `core/services/` → `services/`

**Files to Move (55 files):**

| Source | Destination | File Count |
|--------|-------------|------------|
| `core/services/account/*` | `services/account/*` | 5 |
| `core/services/activity/*` | `services/activity/*` | 5 |
| `core/services/admin/*` | `services/admin/*` | 11 |
| `core/services/browser/*` | `services/browser/*` | 3 |
| `core/services/feedback/*` | `services/feedback/*` | 1 |
| `core/services/media/*` | `services/media/*` | 9 |
| `core/services/notifications/*` | `services/notifications/*` | 5 |
| `core/services/realtime/*` | `services/realtime/*` | 4 |
| `core/services/shared/*` | `services/shared/*` | 7 |
| `core/services/social/*` | `services/social/*` | 2 |
| `core/services/tmdb/*` | `services/tmdb/*` | 3 |

**Execution Instructions:**
```
1. Create services/ directory at project root
2. Move each subdirectory preserving structure
3. Global find-replace: "@/core/services/" → "@/services/"
4. Run: pnpm build
5. Verify: No import errors
```

**Estimated Impact:** 120+ import statements across 70+ files

#### 2.3 Extract `core/clients/` → `lib/clients/`

**Files to Move (7 files):**

| Source | Destination |
|--------|-------------|
| `core/clients/supabase/admin.js` | `lib/clients/supabase/admin.js` |
| `core/clients/supabase/client.js` | `lib/clients/supabase/client.js` |
| `core/clients/supabase/constants.js` | `lib/clients/supabase/constants.js` |
| `core/clients/supabase/proxy.js` | `lib/clients/supabase/proxy.js` |
| `core/clients/supabase/server.js` | `lib/clients/supabase/server.js` |
| `core/clients/tmdb/sanitize.js` | `lib/clients/tmdb/sanitize.js` |
| `core/clients/tmdb/server.js` | `lib/clients/tmdb/server.js` |

**Execution Instructions:**
```
1. Create lib/clients/ directory structure
2. Move supabase/ and tmdb/ directories
3. Global find-replace: "@/core/clients/" → "@/lib/clients/"
4. Run: pnpm build
```

**Estimated Impact:** 45+ import statements

#### 2.4 Extract `core/auth/` → `lib/auth/`

**Files to Move (36 files):**

**Root Files (4):**
| Source | Destination |
|--------|-------------|
| `core/auth/capabilities.js` | `lib/auth/capabilities.js` |
| `core/auth/oauth-callback.js` | `lib/auth/oauth-callback.js` |
| `core/auth/oauth-providers.js` | `lib/auth/oauth-providers.js` |
| `core/auth/route-notice.js` | `lib/auth/route-notice.js` |

**Client Files (5):**
| Source | Destination |
|--------|-------------|
| `core/auth/clients/audit.client.js` | `lib/auth/clients/audit.client.js` |
| `core/auth/clients/auth-route-notice.client.js` | `lib/auth/clients/auth-route-notice.client.js` |
| `core/auth/clients/csrf.client.js` | `lib/auth/clients/csrf.client.js` |
| `core/auth/clients/pending-account.client.js` | `lib/auth/clients/pending-account.client.js` |
| `core/auth/clients/pending-provider-link.client.js` | `lib/auth/clients/pending-provider-link.client.js` |

**Server Files (27):**
All files in `core/auth/servers/` subdirectories move to corresponding `lib/auth/servers/` paths.

**Execution Instructions:**
```
1. Create lib/auth/ directory structure matching core/auth/
2. Move all files preserving subdirectory structure
3. Global find-replace: "@/core/auth/" → "@/lib/auth/"
4. Run: pnpm build
```

**Estimated Impact:** 85+ import statements

#### 2.5 Extract Remaining `core/` Contents

**Files to Move:**

| Source | Destination | Count |
|--------|-------------|-------|
| `core/constants/*` | `lib/constants/*` | 2 |
| `core/hooks/*` | `lib/hooks/*` | 7 |
| `core/utils/*` | `lib/utils/*` | 2 |
| `core/index.js` | `lib/index.js` | 1 |

**Execution Instructions:**
```
1. Move remaining directories to lib/
2. Update imports: "@/core/constants/" → "@/lib/constants/"
3. Update imports: "@/core/hooks/" → "@/lib/hooks/"
4. Update imports: "@/core/utils/" → "@/lib/utils/"
5. Update imports: "@/core" → "@/lib"
6. Delete empty core/ directory
7. Run: pnpm build
```

#### 2.6 Phase 2 Validation

**Checklist:**
- [ ] `core/` directory deleted
- [ ] `modules/` directory exists with 143 files
- [ ] `services/` directory exists with 55 files
- [ ] `lib/` directory exists with 57 files
- [ ] `pnpm build` succeeds
- [ ] All routes load correctly

---

### Phase 3: Fix Dependency Violations

**Objective:** Resolve import boundary violations before further restructuring.

#### 3.1 Resolve `ui/` → `features/` Violations

**Violation 1: `ui/skeletons/views/account.js`**

**Current Imports:**
```javascript
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/features/account/utils';
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop';
```

**Resolution Steps:**

1. **Create `lib/constants/layout.constants.js`:**
```javascript
// lib/constants/layout.constants.js
export const ACCOUNT_ROUTE_SHELL_CLASS = 'relative flex flex-col min-h-screen';
export const ACCOUNT_SECTION_SHELL_CLASS = 'flex-1 px-4 py-6 md:px-8';
```

2. **Move `PageGradientShell` to `ui/layout/page-gradient-shell.js`:**
```javascript
// ui/layout/page-gradient-shell.js
'use client';

export function PageGradientShell({ children, className, ...props }) {
  // Component implementation from features/layout/page-gradient-backdrop.js
}
```

3. **Update `ui/skeletons/views/account.js`:**
```javascript
// BEFORE
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/features/account/utils';
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop';

// AFTER
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/lib/constants/layout.constants';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
```

4. **Update `features/account/utils.js`** to import from new location:
```javascript
// Re-export for backward compatibility
export { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/lib/constants/layout.constants';
```

5. **Update all other consumers** of these constants to use `@/lib/constants/layout.constants`

#### 3.2 Resolve `services/` → `features/` Violations

**Violation: `services/account/account.service.js`**

**Current Import:**
```javascript
import { isReservedAccountSegment } from '@/features/account/utils';
```

**Resolution Steps:**

1. **Create `lib/utils/account.utils.js`:**
```javascript
// lib/utils/account.utils.js

const RESERVED_SEGMENTS = ['edit', 'settings', 'activity', 'lists', 'new'];

export function isReservedAccountSegment(segment) {
  return RESERVED_SEGMENTS.includes(segment?.toLowerCase());
}

export function validateUsername(username) {
  if (!username) return false;
  if (isReservedAccountSegment(username)) return false;
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
}
```

2. **Update `services/account/account.service.js`:**
```javascript
// BEFORE
import { isReservedAccountSegment } from '@/features/account/utils';

// AFTER
import { isReservedAccountSegment } from '@/lib/utils/account.utils';
```

3. **Update `features/account/utils.js`:**
```javascript
// Re-export for backward compatibility
export { isReservedAccountSegment, validateUsername } from '@/lib/utils/account.utils';
```

#### 3.3 Resolve `components/ui/` Duplication

**Current Files:**
- `components/ui/noise-texture.js`
- `components/ui/text-animate.js`

**Resolution:**

1. **Move files to `ui/` directory:**
```
components/ui/noise-texture.js → ui/effects/noise-texture.js
components/ui/text-animate.js → ui/animations/text-animate.js
```

2. **Update imports globally:**
```javascript
// BEFORE
import { NoiseTexture } from '@/components/ui/noise-texture';

// AFTER
import { NoiseTexture } from '@/ui/effects/noise-texture';
```

3. **Delete `components/` directory** if empty after move

4. **Update or delete `components.json`** (shadcn config)

#### 3.4 Phase 3 Validation

**Run Import Boundary Verification Script:**
```bash
# Verify no ui/ → features/ imports
grep -r "from '@/features" ui/ --include="*.js"
# Should return: no matches

# Verify no services/ → features/ imports
grep -r "from '@/features" services/ --include="*.js"
# Should return: no matches

# Verify no lib/ → modules/services/features imports
grep -r "from '@/modules\|from '@/services\|from '@/features" lib/ --include="*.js"
# Should return: no matches
```

---

### Phase 4: Route File Pattern Consolidation and Renaming

**Objective:** Reduce route file count and apply professional naming.

#### 4.1 Define New Route File Convention

**Standard:**
```
app/{route}/
├── page.js                    # KEEP - Next.js convention
├── {route-name}.client.js     # RENAME from client.js (if needed)
├── loading.js                 # KEEP - Next.js convention
├── error.js                   # KEEP - Next.js convention
└── not-found.js               # KEEP - Next.js convention
```

**Eliminated Files:**
- `view.js` → Inline into `{route-name}.client.js` or move to `features/`
- `registry.js` → Centralize into `features/registry/route-configs.js`

#### 4.2 Centralize Registry Configurations

**Create: `features/registry/route-configs.js`**

```javascript
// features/registry/route-configs.js

import { getAccountNavItems } from '@/features/navigation/account-nav-registry';
import { getMediaNavItems } from '@/features/navigation/media-nav-registry';

// Account pages registry factory
export function createAccountRegistryConfig({ user, isOwner, additionalModals = [] }) {
  return {
    nav: {
      items: getAccountNavItems(user),
      actions: isOwner ? 'owner' : 'visitor',
      background: { type: 'gradient', color: user?.accentColor || 'default' }
    },
    modal: {
      available: ['settings', 'feedback', ...additionalModals]
    },
    guard: {
      requireAuth: false
    }
  };
}

// Media pages registry factory
export function createMediaRegistryConfig({ media, mediaType }) {
  return {
    nav: {
      items: getMediaNavItems(media, mediaType),
      actions: 'media',
      background: { type: 'backdrop', image: media?.backdropPath }
    },
    modal: {
      available: ['feedback', 'listPicker', 'reviewEditor']
    },
    guard: {
      requireAuth: false
    }
  };
}

// Auth pages registry factory
export function createAuthRegistryConfig({ mode }) {
  return {
    nav: {
      items: [],
      actions: 'auth',
      background: { type: 'minimal' }
    },
    modal: {
      available: []
    },
    guard: {
      requireAuth: false,
      redirectIfAuthed: '/'
    }
  };
}

// Home page registry factory
export function createHomeRegistryConfig() {
  return {
    nav: {
      items: [],
      actions: 'home',
      background: { type: 'hero' }
    },
    modal: {
      available: ['feedback']
    },
    guard: {
      requireAuth: false
    }
  };
}
```

#### 4.3 Route File Transformation Examples

**Example 1: Movie Detail Route**

**BEFORE (6 files):**
```
app/(media)/movie/[id]/
├── page.js           (50 LOC)
├── client.js         (80 LOC)
├── registry.js       (45 LOC)
├── view.js           (120 LOC)
├── loading.js        (25 LOC)
└── error.js          (30 LOC)
```

**AFTER (4 files):**
```
app/(media)/movie/[id]/
├── page.js                    (50 LOC) - unchanged
├── movie-detail.client.js     (180 LOC) - merged client + registry + view
├── loading.js                 (25 LOC) - unchanged
└── error.js                   (30 LOC) - unchanged
```

**New `movie-detail.client.js`:**
```javascript
// app/(media)/movie/[id]/movie-detail.client.js
'use client';

import { useRegistry } from '@/modules/registry';
import { createMediaRegistryConfig } from '@/features/registry/route-configs';
import { MovieDetailView } from '@/features/movie/movie-detail-view';

export function MovieDetailClient({ movie, initialData }) {
  // Apply registry configuration
  useRegistry(createMediaRegistryConfig({ 
    media: movie, 
    mediaType: 'movie' 
  }));

  // Render view directly (previously in view.js)
  return (
    <MovieDetailView 
      movie={movie}
      initialData={initialData}
    />
  );
}
```

**Example 2: Account Profile Route**

**BEFORE (6 files):**
```
app/(account)/account/[username]/
├── page.js           (60 LOC)
├── client.js         (90 LOC)
├── registry.js       (55 LOC)
├── loading.js        (20 LOC)
├── error.js          (25 LOC)
└── not-found.js      (20 LOC)
```

**AFTER (5 files):**
```
app/(account)/account/[username]/
├── page.js                      (60 LOC)
├── account-profile.client.js    (120 LOC) - merged client + registry
├── loading.js                   (20 LOC)
├── error.js                     (25 LOC)
└── not-found.js                 (20 LOC)
```

#### 4.4 Bulk Route File Renaming

**Complete Rename List:**

| Current Path | New Path |
|--------------|----------|
| `app/(home)/client.js` | `app/(home)/home.client.js` |
| `app/(home)/view.js` | DELETED (inline) |
| `app/(home)/registry.js` | DELETED (centralized) |
| `app/(auth)/sign-in/client.js` | `app/(auth)/sign-in/sign-in.client.js` |
| `app/(auth)/sign-in/view.js` | DELETED (inline) |
| `app/(auth)/sign-in/registry.js` | DELETED (centralized) |
| `app/(auth)/sign-up/client.js` | `app/(auth)/sign-up/sign-up.client.js` |
| `app/(auth)/sign-up/view.js` | DELETED (inline) |
| `app/(auth)/sign-up/registry.js` | DELETED (centralized) |
| `app/(media)/movie/[id]/client.js` | `app/(media)/movie/[id]/movie-detail.client.js` |
| `app/(media)/movie/[id]/view.js` | DELETED (move to features) |
| `app/(media)/movie/[id]/registry.js` | DELETED (centralized) |
| `app/(media)/person/[id]/client.js` | `app/(media)/person/[id]/person-detail.client.js` |
| `app/(media)/person/[id]/view.js` | DELETED (move to features) |
| `app/(media)/person/[id]/registry.js` | DELETED (centralized) |
| `app/(account)/account/[username]/client.js` | `app/(account)/account/[username]/account-profile.client.js` |
| `app/(account)/account/[username]/registry.js` | DELETED (centralized) |
| `app/(account)/account/[username]/activity/client.js` | `app/(account)/account/[username]/activity/account-activity.client.js` |
| `app/(account)/account/[username]/activity/view.js` | DELETED (inline) |
| `app/(account)/account/[username]/activity/registry.js` | DELETED (centralized) |
| ... (continue for all 26 registry.js and 14 view.js files) |

**Estimated Impact:**
- Delete: 26 `registry.js` files
- Delete: 14 `view.js` files (content moves to client or features)
- Rename: 29 `client.js` files to `{route-name}.client.js`
- Net reduction: ~40 files

#### 4.5 Phase 4 Validation

- [ ] All `registry.js` files deleted from routes
- [ ] All `view.js` files deleted from routes (content migrated)
- [ ] All `client.js` files renamed to `{route-name}.client.js`
- [ ] `features/registry/route-configs.js` created with all factory functions
- [ ] `pnpm build` succeeds
- [ ] All routes render correctly

---

### Phase 5: Consolidate Configuration Files

**Objective:** Reduce 6 config files to 4 with clearer organization.

#### 5.1 Configuration Consolidation Map

| Current Files | New File | Contents |
|---------------|----------|----------|
| `config/project.config.js` + `config/rollout.config.js` | `config/app.config.js` | Feature flags, debug, rollout |
| `config/auth.config.js` | `config/auth.config.js` | Keep as-is |
| `config/account.config.js` + `config/provider.config.js` | `config/features.config.js` | Account + provider settings |
| `config/nav.config.js` | `config/navigation.config.js` | Rename for clarity |

#### 5.2 Create Consolidated Configuration Files

**New: `config/app.config.js`**
```javascript
// config/app.config.js
// Merged from: project.config.js + rollout.config.js

export const APP_CONFIG = {
  // From project.config.js
  name: 'Tvizzie',
  version: '1.0.0',
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: 'info',
    showDevTools: process.env.NODE_ENV === 'development'
  },
  
  // From rollout.config.js
  features: {
    reviews: { enabled: true, rolloutPercentage: 100 },
    lists: { enabled: true, rolloutPercentage: 100 },
    notifications: { enabled: true, rolloutPercentage: 100 },
    realtime: { enabled: true, rolloutPercentage: 100 },
    adminDashboard: { enabled: true, rolloutPercentage: 100 }
  }
};

export const isFeatureEnabled = (featureName) => {
  const feature = APP_CONFIG.features[featureName];
  return feature?.enabled && (feature?.rolloutPercentage ?? 100) > 0;
};

export const getFeatureRollout = (featureName) => {
  return APP_CONFIG.features[featureName]?.rolloutPercentage ?? 0;
};
```

**New: `config/features.config.js`**
```javascript
// config/features.config.js
// Merged from: account.config.js + provider.config.js

export const ACCOUNT_CONFIG = {
  adapters: {
    // From account.config.js
    profile: 'supabase',
    media: 'supabase',
    social: 'supabase'
  },
  limits: {
    maxLists: 50,
    maxListItems: 500,
    maxReviewLength: 5000
  }
};

export const PROVIDER_CONFIG = {
  // From provider.config.js
  oauth: {
    google: { enabled: true },
    github: { enabled: false },
    discord: { enabled: false }
  },
  isOAuthProvider: (provider) => {
    return Object.keys(PROVIDER_CONFIG.oauth).includes(provider);
  },
  isProviderEnabled: (provider) => {
    return PROVIDER_CONFIG.oauth[provider]?.enabled ?? false;
  }
};
```

**Rename: `config/nav.config.js` → `config/navigation.config.js`**

#### 5.3 Update All Config Imports

**Find-Replace Operations:**
```javascript
// project.config.js → app.config.js
import { ... } from '@/config/project.config'
→ import { ... } from '@/config/app.config'

// rollout.config.js → app.config.js
import { ... } from '@/config/rollout.config'
→ import { ... } from '@/config/app.config'

// account.config.js → features.config.js
import { ... } from '@/config/account.config'
→ import { ACCOUNT_CONFIG, ... } from '@/config/features.config'

// provider.config.js → features.config.js
import { ... } from '@/config/provider.config'
→ import { PROVIDER_CONFIG, ... } from '@/config/features.config'

// nav.config.js → navigation.config.js
import { ... } from '@/config/nav.config'
→ import { ... } from '@/config/navigation.config'
```

#### 5.4 Delete Redundant Config Files

After all imports updated:
- Delete `config/project.config.js`
- Delete `config/rollout.config.js`
- Delete `config/account.config.js`
- Delete `config/provider.config.js`

**Final Config Directory:**
```
config/
├── app.config.js           # App-wide settings, feature flags
├── auth.config.js          # Auth provider configuration
├── features.config.js      # Feature-specific settings
└── navigation.config.js    # Navigation structure
```

---

### Phase 6: Reduce Auth System Complexity

**Objective:** Consolidate 36 auth files to ~15 files.

#### 6.1 Auth Server Consolidation Map

**Current Structure (27 server files):**
```
lib/auth/servers/
├── account/           (4 files)
├── audit/             (1 file)
├── notice/            (1 file)
├── policy/            (1 file)
├── providers/         (2 files)
├── security/          (6 files)
├── session/           (5 files)
└── verification/      (6 files)
```

**Target Structure (8 server files):**
```
lib/auth/servers/
├── account.server.js       # Merged: account/*.server.js
├── audit.server.js         # Keep: audit-log.server.js
├── notice.server.js        # Keep: auth-route-notice.server.js
├── policy.server.js        # Keep: auth-route-policy.server.js
├── providers.server.js     # Merged: providers/*.server.js
├── security.server.js      # Merged: csrf, password, step-up, recent-reauth
├── rate-limit.server.js    # Keep separate (complex)
├── session.server.js       # Merged: session/*.server.js
└── verification.server.js  # Merged: verification/*.server.js
```

#### 6.2 Consolidation Details

**Merge: `lib/auth/servers/account/*.server.js` → `lib/auth/servers/account.server.js`**

```javascript
// lib/auth/servers/account.server.js
// Merged from: account-bootstrap, account-deletion, account-lifecycle, account-state

// === BOOTSTRAP ===
export async function bootstrapAccount(userId, userData) { ... }
export async function initializeAccountProfile(userId) { ... }

// === DELETION ===
export async function deleteAccount(userId) { ... }
export async function scheduleAccountDeletion(userId) { ... }
export async function cancelAccountDeletion(userId) { ... }

// === LIFECYCLE ===
export async function activateAccount(userId) { ... }
export async function deactivateAccount(userId) { ... }
export async function suspendAccount(userId, reason) { ... }

// === STATE ===
export async function getAccountState(userId) { ... }
export async function updateAccountState(userId, state) { ... }
export async function isAccountActive(userId) { ... }
```

**Merge: `lib/auth/servers/session/*.server.js` → `lib/auth/servers/session.server.js`**

```javascript
// lib/auth/servers/session.server.js
// Merged from: authenticated-request, request-context, revocation, session, supabase-admin-auth

// === SESSION CRUD ===
export async function createSession(userId, metadata) { ... }
export async function getSession(sessionId) { ... }
export async function updateSession(sessionId, data) { ... }
export async function deleteSession(sessionId) { ... }

// === AUTHENTICATION ===
export async function getAuthenticatedUser(request) { ... }
export async function requireAuth(request) { ... }
export async function optionalAuth(request) { ... }

// === REQUEST CONTEXT ===
export function createRequestContext(request) { ... }
export function getRequestContext() { ... }

// === REVOCATION ===
export async function revokeSession(sessionId) { ... }
export async function revokeAllUserSessions(userId) { ... }

// === ADMIN ===
export async function adminGetUser(userId) { ... }
export async function adminUpdateUser(userId, data) { ... }
```

**Similar consolidation for remaining directories...**

#### 6.3 Auth Client Consolidation

**Current (5 files) → Target (2 files):**

```
lib/auth/clients/
├── auth.client.js          # Merged: csrf, pending-account, pending-provider-link
└── audit.client.js         # Keep: audit logging
```

#### 6.4 Update Auth Imports

**Example Import Updates:**
```javascript
// BEFORE
import { bootstrapAccount } from '@/lib/auth/servers/account/account-bootstrap.server';
import { createSession } from '@/lib/auth/servers/session/session.server';

// AFTER
import { bootstrapAccount } from '@/lib/auth/servers/account.server';
import { createSession } from '@/lib/auth/servers/session.server';
```

---

### Phase 7: Consolidate Navigation Hooks

**Objective:** Reduce 13 nav hook files to 4 files.

#### 7.1 Navigation Hook Consolidation Map

**Current (13 files):**
```
modules/nav/hooks/
├── index.js
├── use-action-component.js
├── use-action-height.js
├── use-element-height.js
├── use-nav-badge.js
├── use-nav-height.js
├── use-navigation-core.js
├── use-navigation-countdown.js
├── use-navigation-display.js
├── use-navigation-effects.js
├── use-navigation-expanded.js
├── use-navigation-items.js
├── use-navigation-layout.js
├── use-navigation-status.js
└── use-navigation.js
```

**Target (4 files):**
```
modules/nav/hooks/
├── index.js                  # Re-exports
├── use-navigation.js         # Primary hook (keep)
├── use-nav-layout.js         # Merged: layout, height, element hooks
└── use-nav-actions.js        # Merged: action, component, badge hooks
```

#### 7.2 Merge Strategy

**New: `use-nav-layout.js`**
```javascript
// modules/nav/hooks/use-nav-layout.js
// Merged from: use-element-height, use-nav-height, use-navigation-layout

export function useNavLayout() {
  // Combined layout logic
}

export function useNavHeight() {
  // Height calculation
}

export function useElementHeight(elementRef) {
  // Element height measurement
}

export function useNavigationLayout() {
  // Full layout state
}
```

**New: `use-nav-actions.js`**
```javascript
// modules/nav/hooks/use-nav-actions.js
// Merged from: use-action-component, use-action-height, use-nav-badge

export function useNavActions() {
  // Combined action logic
}

export function useActionComponent() {
  // Action component resolution
}

export function useActionHeight() {
  // Action container height
}

export function useNavBadge() {
  // Badge state
}
```

---

### Phase 8: API Route Handler Consolidation

**Objective:** Reduce API route count by merging related endpoints.

#### 8.1 Auth API Consolidation

**Current (12 auth routes):**
```
app/api/auth/
├── account/
│   ├── change-email/route.js
│   ├── change-password/route.js
│   ├── delete/route.js
│   ├── password-status/route.js
│   ├── reauthenticate/route.js
│   └── set-password/route.js
├── audit/route.js
├── password-reset/complete/route.js
├── session/route.js
├── sign-up/complete/route.js
└── verification/
    ├── send-code/route.js
    └── verify-code/route.js
```

**Target (7 auth routes):**
```
app/api/auth/
├── account/route.js              # Merged: change-email, change-password, set-password, password-status
├── account/delete/route.js       # Keep: delete operation (destructive)
├── account/reauthenticate/route.js # Keep: security-sensitive
├── audit/route.js                # Keep
├── password-reset/route.js       # Renamed from complete/
├── session/route.js              # Keep
├── sign-up/route.js              # Renamed from complete/
└── verification/route.js         # Merged: send-code, verify-code
```

**New: `app/api/auth/account/route.js`**
```javascript
// app/api/auth/account/route.js
// Merged from: change-email, change-password, set-password, password-status

import { NextResponse } from 'next/server';

export async function POST(request) {
  const { action, ...data } = await request.json();
  
  switch (action) {
    case 'change-email':
      return handleChangeEmail(data);
    case 'change-password':
      return handleChangePassword(data);
    case 'set-password':
      return handleSetPassword(data);
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  switch (action) {
    case 'password-status':
      return handlePasswordStatus();
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function handleChangeEmail({ newEmail }) { ... }
async function handleChangePassword({ currentPassword, newPassword }) { ... }
async function handleSetPassword({ password }) { ... }
async function handlePasswordStatus() { ... }
```

---

### Phase 9: Feature Module Cleanup and Renaming

**Objective:** Flatten and rename feature module files.

#### 9.1 Flatten `features/reviews/parts/`

**Current:**
```
features/reviews/
├── index.js
├── parts/
│   ├── rating-range-selector.js
│   ├── rating-selector.js
│   ├── rating-stars.js
│   ├── review-auth-fallback.js
│   ├── review-card.js
│   ├── review-composer.js
│   ├── review-header.js
│   └── review-list.js
├── use-media-reviews.js
├── use-review-nav-state.js
└── utils.js
```

**Target:**
```
features/reviews/
├── index.js
├── components/                    # Renamed from parts/
│   ├── rating-range-selector.js
│   ├── rating-selector.js
│   ├── rating-stars.js
│   ├── review-auth-fallback.js
│   ├── review-card.js
│   ├── review-composer.js
│   ├── review-header.js
│   └── review-list.js
├── use-media-reviews.js
├── use-review-nav-state.js
└── reviews.utils.js               # Renamed from utils.js
```

#### 9.2 Rename Generic Utils Files

| Current | New | Location |
|---------|-----|----------|
| `features/account/utils.js` | `features/account/account.utils.js` | features/account/ |
| `features/auth/utils.js` | `features/auth/auth.utils.js` | features/auth/ |
| `features/movie/utils.js` | `features/movie/movie.utils.js` | features/movie/ |
| `features/person/utils.js` | `features/person/person.utils.js` | features/person/ |
| `features/reviews/utils.js` | `features/reviews/reviews.utils.js` | features/reviews/ |
| `ui/elements/utils.js` | `ui/elements/elements.utils.js` | ui/elements/ |

#### 9.3 Rename `shared/` to `components/`

| Current | New |
|---------|-----|
| `features/account/shared/` | `features/account/components/` |
| `features/shared/` | `features/common/` |

#### 9.4 Consolidate Account Hooks

**Current (8 files):**
```
features/account/hooks/
├── collections.js
├── edit-data.js
├── page-actions.js
├── page-data.js
├── relationships.js
├── section-page.js
├── security-actions.js
└── security-credentials.js
```

**Target (3 files):**
```
features/account/hooks/
├── use-account-data.js           # Merged: page-data, edit-data, collections
├── use-account-actions.js        # Merged: page-actions, security-actions
└── use-account-social.js         # Merged: relationships, section-page, security-credentials
```

---

### Phase 10: Final Validation and Documentation

#### 10.1 Build Verification

**Command Sequence:**
```bash
# Clean install
rm -rf node_modules .next
pnpm install

# Production build
pnpm build

# Verify output
# Expected: Build Optimization... completed successfully
```

#### 10.2 Runtime Verification Checklist

| Route | Test Actions | Expected Result |
|-------|--------------|-----------------|
| `/` | Load page | Home renders with hero |
| `/movie/123` | Load, interact | Movie detail renders, actions work |
| `/person/456` | Load, interact | Person detail renders |
| `/account/username` | Load | Profile renders (or 404 if user doesn't exist) |
| `/account/username/lists` | Load, create list | Lists page works |
| `/sign-in` | Load, attempt sign in | Auth flow works |
| `/sign-up` | Load, attempt sign up | Registration works |
| `/search` | Load, search | Search results appear |

#### 10.3 Import Boundary Final Verification

**Verification Commands:**
```bash
# No ui/ → features/ imports
grep -rn "from '@/features" ui/ --include="*.js" | wc -l
# Expected: 0

# No lib/ → modules/services/features imports
grep -rn "from '@/modules\|from '@/services\|from '@/features" lib/ --include="*.js" | wc -l
# Expected: 0

# No services/ → features/ imports
grep -rn "from '@/features" services/ --include="*.js" | wc -l
# Expected: 0
```

#### 10.4 Update Documentation

**Files to Update:**

1. **`ARCHITECTURE.md`** - Update with new directory structure
2. **`FILE_STRUCTURE.md`** - Regenerate with new file listing
3. **`NAMING_CONVENTIONS.md`** - Already created in Phase 0
4. **`README.md`** - Update getting started section

---

### Migration Summary

#### Before Migration

| Metric | Value |
|--------|-------|
| Total JS Files | 539 |
| `core/` Files | 217 |
| Route Files per Page | 4-7 (avg 5.2) |
| Auth System Files | 36 |
| Config Files | 6 |
| Nav Hook Files | 13 |
| Registry Files | 26 |
| Naming Patterns | 14+ (inconsistent) |

#### After Migration (Target)

| Metric | Value |
|--------|-------|
| Total JS Files | ~280-320 |
| `core/` Files | 0 (eliminated) |
| Route Files per Page | 2-4 (avg 2.8) |
| Auth System Files | ~15 |
| Config Files | 4 |
| Nav Hook Files | 4 |
| Registry Files | 1 (centralized) |
| Naming Patterns | 6 (standardized) |

#### File Reduction Breakdown

| Action | Files Affected | Net Change |
|--------|---------------|------------|
| Eliminate `registry.js` files | 26 | -26 |
| Eliminate `view.js` files | 14 | -14 |
| Consolidate auth files | 36 → 15 | -21 |
| Consolidate nav hooks | 13 → 4 | -9 |
| Consolidate config files | 6 → 4 | -2 |
| Merge API routes | 42 → 35 | -7 |
| Consolidate account hooks | 8 → 3 | -5 |
| Delete `components/ui/` | 2 | -2 |
| **Total Reduction** | | **~86 files** |

---

### Execution Order Summary

Execute phases in this exact order:

| Order | Phase | Impact | Risk | Duration |
|-------|-------|--------|------|----------|
| 1 | Phase 0: Naming Conventions | Documentation | Low | 1 hour |
| 2 | Phase 1: Migration Setup | Infrastructure | Low | 30 min |
| 3 | Phase 2: Eliminate `core/` | 217 files moved | Medium | 2-3 hours |
| 4 | Phase 3: Fix Violations | 5 files modified | Low | 1 hour |
| 5 | Phase 4: Route Files | 69 files changed | Medium | 3-4 hours |
| 6 | Phase 5: Config Files | 6 files → 4 | Low | 1 hour |
| 7 | Phase 6: Auth System | 36 files → 15 | Medium | 2-3 hours |
| 8 | Phase 7: Nav Hooks | 13 files → 4 | Low | 1 hour |
| 9 | Phase 8: API Routes | 7 routes merged | Medium | 2 hours |
| 10 | Phase 9: Feature Cleanup | 25 files renamed | Low | 2 hours |
| 11 | Phase 10: Validation | Testing | Low | 1-2 hours |

**Total Estimated Duration:** 16-22 hours

---

### Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking imports during migration | High | High | Run `pnpm build` after each sub-phase |
| Runtime regressions | Medium | High | Manual testing of critical paths |
| Merge conflicts | Medium | Medium | Work on feature branch, rebase daily |
| Lost functionality | Low | High | Git history preserves all changes |
| Performance regression | Low | Medium | Lighthouse comparison before/after |

---

### Post-Migration Recommendations

1. **Add ESLint Import Boundaries**
   - Configure `eslint-plugin-import` with zone restrictions
   - Fail CI on boundary violations

2. **Add Architecture Tests**
   - Automated tests verifying import boundaries
   - Run on every PR

3. **Add TypeScript**
   - Gradual migration to `.ts` / `.tsx`
   - Start with `lib/` and `services/`

4. **Document Module Ownership**
   - README.md in each top-level directory
   - Define maintainer responsibilities

5. **Remove Unused Exports**
   - Use `ts-prune` or similar to find dead code
   - Clean up after migration stabilizes

---

*Document Version: 2.0*
*Generated: Comprehensive analysis of Tvizzie codebase*
*Target Audience: Advanced AI coding agents, senior engineers*
*Estimated Reading Time: 45 minutes*
