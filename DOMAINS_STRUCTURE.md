# Tvizzie - Domain Architecture & File Structure

This document outlines the domain-driven modular architecture of **Tvizzie**, detailing the responsibility of each layer and the complete file structure under the `domains/` directory.

---

## 🏛️ Architecture & Layering Principles

Each domain follows a standardized, modular layer pattern:

* **`client/`**: Client-side fetchers, API request wrappers, state mutation helpers, and realtime/polling subscription handlers (`'use client'`).
* **`hooks/`**: React custom hooks managing domain-specific state lifecycles and reactive data.
* **`server/`**: Server-side data access layer, Server Actions, Route Handler logic, and route data loaders protected by `'server-only'` (`*.server.js`).
* **`ui/`**: User interface elements cleanly split into:
  * `components/`: Atomic, reusable domain presentation components.
  * `layouts/`: Section layout shells and context providers.
  * `sections/`: Full page-level content sections and feeds.
  * `nav-surfaces/` & `modals/`: Interactive navigation sheets, drawers, and modal dialogs.
  * `nav-actions/`: Shell navigation actions.
  * `skeletons.js`: Consolidated domain skeleton loaders.
* **`utils/`**: Pure JavaScript helper utilities, input validators, filter builders, and constant definitions.

---

## 📌 Standardized Direct Import Conventions

Consumers across `app/` and other domains import symbols directly from their target files:

```js
// 1. UI Layer
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';
import Sidebar from '@/domains/media/ui/components/sidebar';

// 2. Server Data Layer
import { getUsernameAccountOverviewRouteData } from '@/domains/account/server/routes.server';

// 3. Client Operations & Realtime Mutations
import { toggleUserWatchlistItem } from '@/domains/media/client/watchlist';

// 4. Utility Functions & Constants
import { getMediaDetailPath } from '@/domains/media/utils/media-key';
import { getMediaTitle } from '@/domains/media/utils/media-data';
```

---

## 📂 Complete `domains/` File Structure

```text
domains/
├── account/
│   ├── client/
│   │   ├── api.js
│   │   ├── collections.js
│   │   ├── index.js
│   │   ├── mutations.js
│   │   └── realtime.js
│   ├── hooks/
│   │   ├── index.js
│   │   ├── use-account-collections.js
│   │   ├── use-account-edit.js
│   │   ├── use-account-feed.js
│   │   ├── use-account-overview.js
│   │   ├── use-account-profile.js
│   │   ├── use-account-section.js
│   │   └── use-account-security.js
│   ├── server/
│   │   ├── actions.server.js
│   │   ├── api-handlers.server.js
│   │   ├── collections.server.js
│   │   ├── feed.server.js
│   │   ├── index.js
│   │   ├── media-upload.server.js
│   │   ├── profile.server.js
│   │   ├── request-target.server.js
│   │   └── routes.server.js
│   ├── ui/
│   │   ├── components/
│   │   │   ├── account-filter-bars.js
│   │   │   ├── account-hero.js
│   │   │   ├── account-list-card.js
│   │   │   ├── account-media-grid.js
│   │   │   ├── account-pagination.js
│   │   │   └── account-skeletons.js
│   │   ├── layouts/
│   │   │   ├── account-layout.js
│   │   │   └── account-profile-context.js
│   │   ├── nav-actions/
│   │   │   └── account-action.js
│   │   ├── sections/
│   │   │   ├── account-section-factory.js
│   │   │   ├── activity-section.js
│   │   │   ├── collections-section.js
│   │   │   ├── edit-section.js
│   │   │   ├── lists-section.js
│   │   │   ├── overview-section.js
│   │   └── reviews-section.js
│   │   ├── surfaces/
│   │   │   ├── bio-surface.js
│   │   │   ├── create-list-surface.js
│   │   │   ├── edit-list-surface.js
│   │   │   ├── list-picker-surface.js
│   │   │   └── list-surface-shared.js
│   │   └── index.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── filtering.js
│   │   ├── formatters.js
│   │   ├── index.js
│   │   ├── supabase.js
│   │   └── validation.js
│   └── index.js
│
├── auth/
│   ├── client/
│   │   ├── http.js
│   │   ├── index.js
│   │   ├── requests.js
│   │   ├── sign-in.js
│   │   └── sign-up.js
│   ├── server/
│   │   ├── account-routes.server.js
│   │   ├── account.server.js
│   │   ├── admin.server.js
│   │   ├── api-handlers.server.js
│   │   ├── audit-log.server.js
│   │   ├── google-provider.server.js
│   │   ├── index.js
│   │   ├── password-status.server.js
│   │   ├── policies.server.js
│   │   ├── proof-tokens.server.js
│   │   ├── response.server.js
│   │   ├── security.server.js
│   │   ├── session.server.js
│   │   ├── tokens.server.js
│   │   └── verification.server.js
│   ├── ui/
│   │   ├── components/
│   │   │   ├── forgot-password-action.js
│   │   │   └── form-primitives.js
│   │   ├── layouts/
│   │   │   └── page-shell.js
│   │   ├── surfaces/
│   │   │   └── verification-surface.js
│   │   └── index.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── errors.js
│   │   ├── index.js
│   │   ├── oauth.js
│   │   ├── password.js
│   │   ├── providers.js
│   │   └── routes.js
│   └── index.js
│
├── home/
│   ├── client/
│   │   ├── index.js
│   │   └── use-discover-feed.js
│   ├── server/
│   │   ├── imdb-top-100.server.js
│   │   └── index.js
│   ├── ui/
│   │   ├── components/
│   │   │   └── poster-rail.js
│   │   ├── layouts/
│   │   │   ├── home-grid-frame.js
│   │   │   └── home-section.js
│   │   ├── sections/
│   │   │   ├── discover-section.js
│   │   │   ├── home-rail-section.js
│   │   │   ├── top-rated-section.js
│   │   │   └── trending-section.js
│   │   └── index.js
│   ├── utils/
│   │   ├── discover.js
│   │   ├── imdb-top-100-data.js
│   │   └── index.js
│   └── index.js
│
├── legal/
│   ├── ui/
│   │   ├── components/
│   │   │   └── quick-links.js
│   │   ├── layouts/
│   │   │   └── page-shell.js
│   │   └── index.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── index.js
│   └── index.js
│
├── media/
│   ├── client/
│   │   ├── index.js
│   │   ├── likes.js
│   │   ├── lists.js
│   │   ├── social-proof.js
│   │   ├── watched.js
│   │   └── watchlist.js
│   ├── server/
│   │   ├── index.js
│   │   ├── list-like-route.server.js
│   │   ├── person-awards.server.js
│   │   ├── title-route.server.js
│   │   └── tv-season-ratings.server.js
│   ├── ui/
│   │   ├── components/
│   │   │   ├── collection-actions.js
│   │   │   ├── filmography-card.js
│   │   │   ├── list-preview-composition.js
│   │   │   ├── media-poster-card.js
│   │   │   ├── media-thumb.js
│   │   │   ├── person-bio.js
│   │   │   ├── recommendation-card.js
│   │   │   ├── sidebar.js
│   │   │   ├── social-links.js
│   │   │   ├── social-proof.js
│   │   │   ├── static-route-elements.js
│   │   │   └── tv-season-ratings.js
│   │   ├── layouts/
│   │   │   ├── media-detail-section.js
│   │   │   ├── media-grid-frame.js
│   │   │   └── person-grid-frame.js
│   │   ├── modals/
│   │   │   ├── cast-modal.js
│   │   │   ├── image-preview-modal.js
│   │   │   ├── social-proof-modal.js
│   │   │   └── video-preview-modal.js
│   │   ├── nav-actions/
│   │   │   ├── movie-action.js
│   │   │   └── person-action.js
│   │   ├── sections/
│   │   │   ├── awards-section.js
│   │   │   ├── cast-section.js
│   │   │   ├── filmography-section.js
│   │   │   ├── gallery-section.js
│   │   │   ├── seasons-section.js
│   │   │   ├── timeline-section.js
│   │   │   └── videos-section.js
│   │   ├── surfaces/
│   │   │   ├── person-bio-surface.js
│   │   │   └── watch-providers-surface.js
│   │   └── index.js
│   ├── utils/
│   │   ├── background-preferences.js
│   │   ├── index.js
│   │   ├── media-data.js
│   │   ├── media-key.js
│   │   ├── media-payload.js
│   │   ├── person-data.js
│   │   └── poster-preferences.js
│   └── index.js
│
├── reviews/
│   ├── client/
│   │   ├── index.js
│   │   ├── mutations.js
│   │   ├── queries.js
│   │   └── subscriptions.js
│   ├── hooks/
│   │   ├── index.js
│   │   └── use-media-reviews.js
│   ├── server/
│   │   ├── actions.server.js
│   │   ├── feeds.server.js
│   │   ├── index.js
│   │   ├── resources.server.js
│   │   └── routes.server.js
│   ├── ui/
│   │   ├── components/
│   │   │   ├── rating-range-selector.js
│   │   │   ├── rating-selector.js
│   │   │   ├── rating-stars.js
│   │   │   ├── review-auth-fallback.js
│   │   │   ├── review-card.js
│   │   │   ├── review-header.js
│   │   │   └── review-list.js
│   │   ├── nav-actions/
│   │   │   └── review-action.js
│   │   ├── sections/
│   │   │   └── media-reviews.js
│   │   ├── surfaces/
│   │   │   └── review-editor-surface.js
│   │   └── index.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── formatting.js
│   │   ├── index.js
│   │   └── validation.js
│   └── index.js
│
├── search/
│   ├── client/
│   │   ├── index.js
│   │   ├── search-api.js
│   │   └── search-cache.js
│   ├── server/
│   │   ├── community-route.server.js
│   │   └── index.js
│   ├── ui/
│   │   ├── nav-actions/
│   │   │   └── search-action.js
│   │   └── index.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   ├── index.js
│   │   ├── ranking.js
│   │   ├── result.js
│   │   └── text.js
│   └── index.js
│
└── social/
    ├── client/
    │   ├── activity.js
    │   ├── follows.js
    │   └── notifications.js
    ├── server/
    │   ├── activity.server.js
    │   ├── follows.server.js
    │   ├── notifications.server.js
    │   └── social-proof.server.js
    └── utils/
        ├── constants.js
        └── formatting.js
│
└── shell/
    ├── layout/
    │   ├── grid-crosshair.js
    │   ├── nav-height-spacer.js
    │   ├── not-found-template.js
    │   └── page-gradient-shell.js
    ├── modals/
    │   ├── account-social-modal.js
    │   ├── cast-modal.js
    │   ├── image-preview-modal.js
    │   ├── notifications-modal.js
    │   ├── social-proof-modal.js
    │   └── video-preview-modal.js
    ├── navigation/
    │   ├── action/
    │   │   ├── account-action.js
    │   │   ├── constants.js
    │   │   ├── forgot-password-action.js
    │   │   ├── movie-action.js
    │   │   ├── not-found-action.js
    │   │   ├── person-action.js
    │   │   ├── review-action.js
    │   │   └── search-action.js
    │   └── surfaces/
    │       ├── account-bio-surface.js
    │       ├── confirmation-surface.js
    │       ├── create-list-surface.js
    │       ├── file-upload-surface.js
    │       ├── list-editor-surface.js
    │       ├── list-picker-surface.js
    │       ├── list-primitives.js
    │       ├── person-bio-surface.js
    │       ├── review-editor-surface.js
    │       ├── verification-surface.js
    │       └── watch-providers-surface.js
    └── shared/
        ├── media-card.js
        └── media-carousel.js
```
