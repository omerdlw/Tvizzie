# Current Repository File Structure

This file is generated from the working tree and lists every project file. Generated or metadata-only content is intentionally excluded: `.git/`, `.next/`, `node_modules/`, and `.DS_Store`.

```text
.
├── .vscode
│   └── settings.json
├── app
│   ├── (account)
│   │   ├── account
│   │   │   ├── [username]
│   │   │   │   ├── activity
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── likes
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── lists
│   │   │   │   │   ├── [slug]
│   │   │   │   │   │   ├── client.js
│   │   │   │   │   │   ├── loading.js
│   │   │   │   │   │   └── page.js
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── reviews
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── watched
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── watchlist
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── client.js
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   └── page.js
│   │   │   ├── edit
│   │   │   │   ├── client.js
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   └── page.js
│   │   │   ├── client.js
│   │   │   ├── error.js
│   │   │   ├── loading.js
│   │   │   ├── not-found.js
│   │   │   └── page.js
│   │   ├── motion.js
│   │   └── registry.js
│   ├── (auth)
│   │   ├── callback
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── sign-in
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── sign-up
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── motion.js
│   │   └── registry.js
│   ├── (home)
│   │   ├── client.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── motion.js
│   │   ├── page.js
│   │   └── registry.js
│   ├── (legal)
│   │   ├── privacy
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── terms
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── motion.js
│   │   └── registry.js
│   ├── (media)
│   │   ├── movie
│   │   │   └── [id]
│   │   │       ├── reviews
│   │   │       │   ├── client.js
│   │   │       │   └── page.js
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── person
│   │   │   └── [id]
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── tv
│   │   │   └── [id]
│   │   │       ├── reviews
│   │   │       │   ├── client.js
│   │   │       │   └── page.js
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── motion.js
│   │   └── registry.js
│   ├── _shell
│   │   ├── navigation
│   │   │   ├── account-nav-links.js
│   │   │   ├── account-nav-registry.js
│   │   │   └── media-action.js
│   │   ├── global-context-menu-registry.js
│   │   ├── interactive-boundary.js
│   │   ├── nav-runtime.js
│   │   ├── navigation-config.js
│   │   ├── settings-modal.js
│   │   └── smooth-scroll.js
│   ├── api
│   │   ├── account
│   │   │   ├── activity
│   │   │   │   └── route.js
│   │   │   ├── media
│   │   │   │   └── route.js
│   │   │   ├── profile
│   │   │   │   └── route.js
│   │   │   ├── resolve
│   │   │   │   └── route.js
│   │   │   ├── reviews
│   │   │   │   └── route.js
│   │   │   └── search
│   │   │       └── route.js
│   │   ├── activity
│   │   │   └── events
│   │   │       └── route.js
│   │   ├── auth
│   │   │   ├── account
│   │   │   │   └── route.js
│   │   │   ├── audit
│   │   │   │   └── route.js
│   │   │   ├── password-reset
│   │   │   │   └── complete
│   │   │   │       └── route.js
│   │   │   ├── session
│   │   │   │   └── route.js
│   │   │   ├── sign-in
│   │   │   │   └── route.js
│   │   │   ├── sign-up
│   │   │   │   └── complete
│   │   │   │       └── route.js
│   │   │   └── verification
│   │   │       └── route.js
│   │   ├── collections
│   │   │   └── route.js
│   │   ├── feedback
│   │   │   └── route.js
│   │   ├── follows
│   │   │   └── route.js
│   │   ├── health
│   │   │   └── route.js
│   │   ├── internal
│   │   │   └── jobs
│   │   │       └── app-events
│   │   │           └── route.js
│   │   ├── live-updates
│   │   │   ├── events
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── notifications
│   │   │   ├── events
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── observability
│   │   │   └── web-vitals
│   │   │       └── route.js
│   │   ├── person
│   │   │   └── [id]
│   │   │       └── awards
│   │   │           └── route.js
│   │   ├── reviews
│   │   │   ├── write
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── search
│   │   │   └── community
│   │   │       └── route.js
│   │   ├── social-proof
│   │   │   └── route.js
│   │   ├── system
│   │   │   └── rollout
│   │   │       └── route.js
│   │   └── tmdb
│   │       └── route.js
│   ├── error.js
│   ├── global-error.js
│   ├── globals.css
│   ├── layout.js
│   ├── manifest.js
│   ├── not-found.js
│   ├── providers.js
│   └── template.js
├── assets
│   └── fonts
│       ├── zuume
│       │   └── Zuume-Bold.woff2
│       └── index.js
├── domains
│   ├── account
│   │   ├── client
│   │   │   ├── collections.client.js
│   │   │   ├── index.js
│   │   │   └── profile.client.js
│   │   ├── hooks
│   │   │   ├── collections.hooks.js
│   │   │   ├── index.js
│   │   │   ├── page.hooks.js
│   │   │   └── security.hooks.js
│   │   ├── server
│   │   │   ├── api-handlers.server.js
│   │   │   ├── collections.server.js
│   │   │   ├── feed.server.js
│   │   │   ├── index.js
│   │   │   ├── media.server.js
│   │   │   ├── profile.server.js
│   │   │   └── routes.server.js
│   │   ├── ui
│   │   │   ├── feeds
│   │   │   │   ├── list-detail
│   │   │   │   │   ├── comments-section.js
│   │   │   │   │   ├── list-detail-config.js
│   │   │   │   │   └── list-detail-filter-state.js
│   │   │   │   ├── activity.js
│   │   │   │   ├── likes.js
│   │   │   │   ├── list-detail.js
│   │   │   │   ├── lists.js
│   │   │   │   ├── overview.js
│   │   │   │   ├── reviews.js
│   │   │   │   ├── watched.js
│   │   │   │   └── watchlist.js
│   │   │   ├── filters
│   │   │   │   ├── content-filter
│   │   │   │   │   ├── activity-filter-bar.js
│   │   │   │   │   ├── content-filter-controls.js
│   │   │   │   │   ├── content-filter-options.js
│   │   │   │   │   ├── list-sort-bar.js
│   │   │   │   │   ├── media-filter-bar.js
│   │   │   │   │   ├── review-filter-bar.js
│   │   │   │   │   └── search-movie-filter-bar.js
│   │   │   │   ├── activity.js
│   │   │   │   ├── content-filter-primitives.js
│   │   │   │   ├── filtering-query-utils.js
│   │   │   │   ├── filtering-shared.js
│   │   │   │   ├── filtering.js
│   │   │   │   ├── lists.js
│   │   │   │   ├── media.js
│   │   │   │   └── reviews.js
│   │   │   ├── lists
│   │   │   │   ├── list-card.js
│   │   │   │   └── list-grid.js
│   │   │   ├── modals
│   │   │   │   ├── create-list-modal.js
│   │   │   │   ├── list-editor-modal.js
│   │   │   │   └── list-picker-modal.js
│   │   │   ├── overview
│   │   │   │   ├── activity.js
│   │   │   │   ├── favorites.js
│   │   │   │   ├── lists.js
│   │   │   │   ├── reviews.js
│   │   │   │   ├── watched.js
│   │   │   │   └── watchlist.js
│   │   │   ├── account-action.js
│   │   │   ├── account-bio-surface.js
│   │   │   ├── account-hero.js
│   │   │   ├── account-layout.js
│   │   │   ├── account-media-grid.js
│   │   │   ├── account-page-factory.js
│   │   │   ├── account-pagination.js
│   │   │   ├── account-registry-state.js
│   │   │   ├── account-section-factory.js
│   │   │   ├── account-section-state.js
│   │   │   ├── account-section.js
│   │   │   └── index.js
│   │   ├── utils
│   │   │   ├── avatar.js
│   │   │   ├── constants.js
│   │   │   ├── feedback.js
│   │   │   ├── formatting.js
│   │   │   ├── index.js
│   │   │   ├── security.js
│   │   │   └── validation.js
│   │   └── index.js
│   ├── auth
│   │   ├── client
│   │   │   ├── index.js
│   │   │   └── requests.js
│   │   ├── server
│   │   │   ├── account-routes.server.js
│   │   │   ├── account.server.js
│   │   │   ├── api-handlers.server.js
│   │   │   ├── audit-log.server.js
│   │   │   ├── google-provider.server.js
│   │   │   ├── index.js
│   │   │   ├── policies.server.js
│   │   │   ├── proof-tokens.server.js
│   │   │   ├── security.server.js
│   │   │   ├── session.server.js
│   │   │   ├── verification.server.js
│   │   │   └── workflows.js
│   │   ├── ui
│   │   │   ├── forgot-password-action.js
│   │   │   ├── form-primitives.js
│   │   │   ├── index.js
│   │   │   ├── oauth-provider-button.js
│   │   │   ├── page-shell.js
│   │   │   └── verification-surface.js
│   │   ├── utils
│   │   │   ├── constants.js
│   │   │   ├── errors.js
│   │   │   ├── index.js
│   │   │   ├── oauth.js
│   │   │   ├── password.js
│   │   │   ├── providers.js
│   │   │   └── routes.js
│   │   └── index.js
│   ├── home
│   │   ├── ui
│   │   │   ├── discover-section.js
│   │   │   ├── poster-rail.js
│   │   │   └── trending-section.js
│   │   ├── utils
│   │   │   └── index.js
│   │   └── index.js
│   ├── legal
│   │   ├── ui
│   │   ├── utils
│   │   │   └── index.js
│   │   └── index.js
│   ├── media
│   │   ├── server
│   │   │   ├── likes
│   │   │   │   ├── index.js
│   │   │   │   ├── like-queries.js
│   │   │   │   ├── like-service.js
│   │   │   │   ├── like-shared.js
│   │   │   │   └── like-subscriptions.js
│   │   │   ├── lists
│   │   │   │   ├── derived-state.js
│   │   │   │   ├── index.js
│   │   │   │   ├── item-mutations.js
│   │   │   │   ├── like-mutations.js
│   │   │   │   ├── list-mutations.js
│   │   │   │   ├── list-queries.js
│   │   │   │   ├── list-service.js
│   │   │   │   ├── list-shared.js
│   │   │   │   ├── list-subscriptions.js
│   │   │   │   └── mutations.js
│   │   │   ├── social-proof
│   │   │   │   ├── index.js
│   │   │   │   └── social-proof-service.js
│   │   │   ├── watched-watchlist
│   │   │   │   ├── index.js
│   │   │   │   ├── watched-queries.js
│   │   │   │   ├── watched-service.js
│   │   │   │   ├── watched-shared.js
│   │   │   │   ├── watched-subscriptions.js
│   │   │   │   ├── watchlist-queries.js
│   │   │   │   ├── watchlist-service.js
│   │   │   │   ├── watchlist-shared.js
│   │   │   │   └── watchlist-subscriptions.js
│   │   │   ├── index.js
│   │   │   ├── media-key-service.js
│   │   │   ├── media.js
│   │   │   ├── person-awards.js
│   │   │   └── supabase-media-utils-service.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── media-card.js
│   │   │   │   ├── media-carousel.js
│   │   │   │   ├── media-list-preview.js
│   │   │   │   └── media-poster-card.js
│   │   │   ├── modals
│   │   │   │   ├── cast-modal.js
│   │   │   │   ├── image-preview-modal.js
│   │   │   │   ├── media-social-proof-modal.js
│   │   │   │   └── video-preview-modal.js
│   │   │   ├── navigation
│   │   │   │   ├── movie-action.js
│   │   │   │   └── person-action.js
│   │   │   ├── person
│   │   │   │   ├── awards.js
│   │   │   │   ├── bio.js
│   │   │   │   ├── filmography-card.js
│   │   │   │   ├── filmography-section.js
│   │   │   │   ├── gallery.js
│   │   │   │   ├── media-thumb.js
│   │   │   │   ├── social-links.js
│   │   │   │   └── timeline.js
│   │   │   ├── surfaces
│   │   │   │   ├── person-bio-surface.js
│   │   │   │   └── watch-providers-surface.js
│   │   │   ├── background-preferences.js
│   │   │   ├── cast-section.js
│   │   │   ├── collection-actions.js
│   │   │   ├── context-menu-actions.js
│   │   │   ├── gallery-section.js
│   │   │   ├── images-section.js
│   │   │   ├── media-data.js
│   │   │   ├── poster-overrides.js
│   │   │   ├── recommendation-card.js
│   │   │   ├── seasons-section.js
│   │   │   ├── sidebar.js
│   │   │   ├── social-proof.js
│   │   │   ├── static-route-elements.js
│   │   │   └── videos-section.js
│   │   ├── utils
│   │   │   ├── index.js
│   │   │   ├── person-data.js
│   │   │   ├── poster-preference-events.js
│   │   │   ├── poster-preferences.js
│   │   │   ├── user-media-index.js
│   │   │   ├── user-media-service.js
│   │   │   └── user-media.js
│   │   └── index.js
│   ├── reviews
│   │   ├── hooks
│   │   │   └── use-media-reviews.js
│   │   ├── server
│   │   │   ├── api
│   │   │   │   └── reviews.js
│   │   │   ├── index.js
│   │   │   ├── list-mutations.js
│   │   │   ├── media-mutations.js
│   │   │   ├── mutation-shared.js
│   │   │   ├── mutations.js
│   │   │   ├── review-context.js
│   │   │   ├── review-list-feed.js
│   │   │   ├── review-profile-feed.js
│   │   │   ├── review-server-context.js
│   │   │   ├── review-server-queries.js
│   │   │   ├── review-server-shared.js
│   │   │   ├── review-server.js
│   │   │   ├── review-service.js
│   │   │   ├── review-subscriptions.js
│   │   │   ├── reviews-write-actions.js
│   │   │   ├── reviews-write-shared.js
│   │   │   ├── reviews-write.js
│   │   │   ├── stored-mutations.js
│   │   │   └── validation.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── rating-range-selector.js
│   │   │   │   ├── rating-selector.js
│   │   │   │   ├── rating-stars.js
│   │   │   │   ├── review-auth-fallback.js
│   │   │   │   ├── review-card.js
│   │   │   │   ├── review-header.js
│   │   │   │   └── review-list.js
│   │   │   ├── media-reviews.js
│   │   │   ├── review-action.js
│   │   │   ├── review-data.js
│   │   │   └── review-editor-surface.js
│   │   ├── utils
│   │   │   └── index.js
│   │   └── index.js
│   ├── search
│   │   ├── client
│   │   │   ├── search-api.js
│   │   │   └── search-cache.js
│   │   ├── server
│   │   │   ├── search-community.js
│   │   │   └── search-quality.js
│   │   ├── ui
│   │   │   ├── navigation
│   │   │   │   └── search-action
│   │   │   │       ├── components
│   │   │   │       │   ├── controls.js
│   │   │   │       │   ├── item.js
│   │   │   │       │   └── results-preview.js
│   │   │   │       ├── index.js
│   │   │   │       ├── search-action-helpers.js
│   │   │   │       └── use-search-action-controller.js
│   │   │   ├── grid-item.js
│   │   │   ├── search-data.js
│   │   │   ├── search-filters.js
│   │   │   ├── search-ranking.js
│   │   │   └── search-result.js
│   │   ├── utils
│   │   │   └── index.js
│   │   └── index.js
│   └── social
│       ├── server
│       │   ├── activity
│       │   │   ├── activity-events-service.js
│       │   │   ├── activity-service.js
│       │   │   ├── event-processor-queries.js
│       │   │   ├── event-processor-shared.js
│       │   │   ├── event-processor.server.js
│       │   │   └── index.js
│       │   ├── api
│       │   │   ├── activity-events.server.js
│       │   │   ├── notification-events.server.js
│       │   │   └── social-proof.server.js
│       │   ├── notifications
│       │   │   ├── event-processor.server.js
│       │   │   ├── notification-events-service.js
│       │   │   ├── notification-resources.server.js
│       │   │   └── notifications-service.js
│       │   ├── social
│       │   │   ├── follow-client-shared.js
│       │   │   ├── follow-mutations.js
│       │   │   ├── follow-resources.server.js
│       │   │   ├── follow-service.js
│       │   │   ├── follow-subscriptions.js
│       │   │   └── index.js
│       │   ├── follow-events.server.js
│       │   ├── follow-server.js
│       │   ├── follow-shared.js
│       │   └── notifications.server.js
│       ├── ui
│       │   ├── account-social-modal.js
│       │   └── notifications-modal.js
│       ├── utils
│       │   └── index.js
│       └── index.js
├── infrastructure
│   ├── http
│   │   ├── api
│   │   │   └── rollout.server.js
│   │   ├── api-request-service.js
│   │   ├── api-response.server.js
│   │   ├── api-result.js
│   │   ├── app-error.js
│   │   ├── cache-policy.server.js
│   │   ├── http-client.js
│   │   ├── http-server.js
│   │   ├── index.js
│   │   ├── memory-cache.server.js
│   │   ├── request-meta.server.js
│   │   ├── route-context.server.js
│   │   ├── runtime-policy-constants.js
│   │   ├── supabase-data-service.js
│   │   ├── supabase-edge-internal.server.js
│   │   ├── write-rollout-config.server.js
│   │   ├── write-rollout-executor.server.js
│   │   └── write-rollout.server.js
│   ├── jobs
│   │   ├── app-event-queue.server.js
│   │   └── app-events-route.server.js
│   ├── observability
│   │   ├── feedback.server.js
│   │   └── web-vitals.server.js
│   ├── realtime
│   │   ├── api
│   │   │   ├── live-updates-events.server.js
│   │   │   └── live-updates.server.js
│   │   ├── live-updates-service.js
│   │   ├── polling-subscription-constants.js
│   │   ├── polling-subscription-service.js
│   │   ├── polling-subscription-shared.js
│   │   ├── realtime-broadcast.server.js
│   │   ├── realtime-transport-config.js
│   │   └── user-events.server.js
│   ├── runtime
│   │   └── health.server.js
│   ├── supabase
│   │   ├── admin.js
│   │   ├── auth-storage.js
│   │   ├── proxy.js
│   │   ├── response-client.server.js
│   │   ├── supabase-client.js
│   │   ├── supabase-constants.js
│   │   └── supabase-server.js
│   └── tmdb
│       ├── api
│       │   └── route.server.js
│       ├── clients
│       │   ├── search
│       │   │   ├── fallback-queries.js
│       │   │   ├── movie-ranking.js
│       │   │   ├── person-ranking.js
│       │   │   └── tmdb-search-shared.js
│       │   ├── catalog.server.js
│       │   ├── detail-id.server.js
│       │   ├── details.server.js
│       │   ├── request.js
│       │   ├── runtime-sanitize.server.js
│       │   ├── sanitize.js
│       │   ├── search-ranking.js
│       │   ├── search.server.js
│       │   ├── tmdb-client-config.js
│       │   └── tmdb-server-client.js
│       └── services
│           ├── tmdb-http.client.js
│           ├── tmdb-movie-images.client.js
│           ├── tmdb-service.js
│           └── watch-region.js
├── modules
│   ├── account
│   │   ├── client.js
│   │   ├── context.js
│   │   ├── hooks.js
│   │   └── index.js
│   ├── api
│   │   ├── cache.js
│   │   └── index.js
│   ├── auth
│   │   ├── adapters
│   │   │   ├── api.js
│   │   │   ├── create-adapter.js
│   │   │   └── supabase-adapter.js
│   │   ├── action-flows.js
│   │   ├── config.js
│   │   ├── context.js
│   │   ├── guards.js
│   │   ├── index.js
│   │   ├── session-client.js
│   │   ├── session-ready.js
│   │   ├── storage.js
│   │   └── utils.js
│   ├── background
│   │   ├── context.js
│   │   └── index.js
│   ├── context-menu
│   │   ├── context.js
│   │   ├── index.js
│   │   ├── menu-engine.js
│   │   ├── motion.js
│   │   └── renderer.js
│   ├── countdown
│   │   ├── config.js
│   │   ├── context.js
│   │   └── index.js
│   ├── error-boundary
│   │   ├── core.js
│   │   ├── index.js
│   │   ├── integrations.js
│   │   ├── listener.js
│   │   └── reporter.js
│   ├── loading
│   │   ├── context.js
│   │   └── index.js
│   ├── modal
│   │   ├── config.js
│   │   ├── container.js
│   │   ├── context.js
│   │   ├── header.js
│   │   ├── index.js
│   │   ├── motion.js
│   │   ├── title.js
│   │   └── utils.js
│   ├── nav
│   │   ├── hooks
│   │   │   ├── index.js
│   │   │   ├── navigation-status-model.js
│   │   │   ├── use-action-height.js
│   │   │   ├── use-element-height.js
│   │   │   ├── use-nav-badge.js
│   │   │   ├── use-nav-height-controller.js
│   │   │   ├── use-nav-height.js
│   │   │   ├── use-nav-keyboard.js
│   │   │   ├── use-nav-viewport.js
│   │   │   ├── use-navigation-compact.js
│   │   │   ├── use-navigation-core.js
│   │   │   ├── use-navigation-countdown.js
│   │   │   ├── use-navigation-display.js
│   │   │   ├── use-navigation-items.js
│   │   │   ├── use-navigation-layout.js
│   │   │   ├── use-navigation-status.js
│   │   │   ├── use-navigation.js
│   │   │   └── use-surface-stack.js
│   │   ├── actions.js
│   │   ├── context.js
│   │   ├── elements.js
│   │   ├── events.js
│   │   ├── guards.js
│   │   ├── index.js
│   │   ├── item.js
│   │   ├── layout.js
│   │   ├── motion.js
│   │   ├── state-machine.js
│   │   ├── surface-model.js
│   │   ├── surface.js
│   │   └── utils.js
│   ├── notification
│   │   ├── client-utils.js
│   │   ├── config.js
│   │   ├── context.js
│   │   ├── hooks.js
│   │   ├── index.js
│   │   ├── motion.js
│   │   └── overlay.js
│   ├── registry
│   │   ├── plugins
│   │   │   └── index.js
│   │   ├── bootstrap.js
│   │   ├── constants.js
│   │   ├── context.js
│   │   ├── index.js
│   │   ├── injector.js
│   │   ├── route-registry.js
│   │   ├── store.js
│   │   └── use-registry.js
│   └── settings
│       ├── config.js
│       ├── context.js
│       ├── index.js
│       ├── storage.js
│       └── utils.js
├── public
│   ├── images
│   │   ├── default-avatar.svg
│   │   └── noise.webp
│   ├── _headers
│   └── tvizzie.png
├── shared
│   ├── constants
│   │   ├── events
│   │   │   └── index.js
│   │   └── index.js
│   ├── hooks
│   │   ├── use-click-outside.js
│   │   ├── use-debounce.js
│   │   └── use-draggable-scroll.js
│   └── utils.js
├── ui
│   ├── feedback
│   │   ├── confirmation-surface.js
│   │   ├── empty-state.js
│   │   ├── file-upload-surface.js
│   │   ├── fullscreen-state.js
│   │   ├── not-found-action.js
│   │   ├── not-found-template.js
│   │   └── spinner.js
│   ├── layout
│   │   ├── nav-height-spacer.js
│   │   └── page-gradient-shell.js
│   ├── motion
│   │   └── animations
│   │       ├── blurry-text.js
│   │       └── text-animate.js
│   └── primitives
│       ├── select
│       │   ├── async-select.js
│       │   ├── combobox.js
│       │   ├── default-select.js
│       │   ├── index.js
│       │   ├── multi-select.js
│       │   └── searchable-select.js
│       ├── adaptive-image.js
│       ├── button.js
│       ├── checkbox.js
│       ├── icon.js
│       ├── index.js
│       ├── input.js
│       ├── navigation-action-styles.js
│       ├── noise-texture.js
│       ├── popover.js
│       ├── primitive-support.js
│       ├── segmented-control.js
│       ├── switch.js
│       ├── textarea.js
│       └── tooltip.js
├── .editorconfig
├── .env
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc.cjs
├── ARCHITECTURE.md
├── eslint.config.mjs
├── FILE_STRUCTURE.md
├── jsconfig.json
├── middleware.js
├── next.config.mjs
├── open-next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tailwind.config.js
└── wrangler.jsonc
```
