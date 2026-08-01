# Current Repository File Structure

This file reflects the current repository after the architecture migration. It is generated from the working tree and includes every project file except generated or metadata-only directories/files: `.git/`, `.next/`, `node_modules/`, and `.DS_Store`.

```text
.
|-- .vscode
|   `-- settings.json
|-- app
|   |-- _shell
|   |   |-- navigation
|   |   |   |-- account-nav-links.js
|   |   |   |-- account-nav-registry.js
|   |   |   |-- media-action.js
|   |   |   `-- nav-skeleton.js
|   |   |-- global-context-menu-registry.js
|   |   |-- interactive-boundary.js
|   |   |-- nav-runtime.js
|   |   |-- navigation.config.js
|   |   |-- settings-modal.js
|   |   `-- smooth-scroll.js
|   |-- (account)
|   |   `-- account
|   |       |-- [username]
|   |       |   |-- activity
|   |       |   |   |-- loading.js
|   |       |   |   `-- page.js
|   |       |   |-- likes
|   |       |   |   |-- loading.js
|   |       |   |   `-- page.js
|   |       |   |-- lists
|   |       |   |   |-- [slug]
|   |       |   |   |   |-- loading.js
|   |       |   |   |   `-- page.js
|   |       |   |   |-- loading.js
|   |       |   |   `-- page.js
|   |       |   |-- reviews
|   |       |   |   |-- loading.js
|   |       |   |   `-- page.js
|   |       |   |-- watched
|   |       |   |   |-- loading.js
|   |       |   |   `-- page.js
|   |       |   |-- watchlist
|   |       |   |   |-- loading.js
|   |       |   |   `-- page.js
|   |       |   |-- loading.js
|   |       |   |-- not-found.js
|   |       |   `-- page.js
|   |       |-- edit
|   |       |   |-- loading.js
|   |       |   |-- not-found.js
|   |       |   `-- page.js
|   |       |-- error.js
|   |       |-- loading.js
|   |       |-- not-found.js
|   |       `-- page.js
|   |-- (auth)
|   |   |-- callback
|   |   |   `-- page.js
|   |   |-- sign-in
|   |   |   `-- page.js
|   |   |-- sign-up
|   |   |   `-- page.js
|   |   |-- error.js
|   |   `-- loading.js
|   |-- (home)
|   |   |-- error.js
|   |   |-- loading.js
|   |   `-- page.js
|   |-- (legal)
|   |   |-- privacy
|   |   |   `-- page.js
|   |   |-- terms
|   |   |   `-- page.js
|   |   `-- error.js
|   |-- (media)
|   |   |-- movie
|   |   |   `-- [id]
|   |   |       |-- reviews
|   |   |       |   `-- page.js
|   |   |       |-- loading.js
|   |   |       |-- not-found.js
|   |   |       `-- page.js
|   |   |-- person
|   |   |   `-- [id]
|   |   |       |-- loading.js
|   |   |       |-- not-found.js
|   |   |       `-- page.js
|   |   `-- tv
|   |       `-- [id]
|   |           |-- reviews
|   |           |   `-- page.js
|   |           |-- loading.js
|   |           |-- not-found.js
|   |           `-- page.js
|   |-- api
|   |   |-- account
|   |   |   |-- activity
|   |   |   |   `-- route.js
|   |   |   |-- media
|   |   |   |   `-- route.js
|   |   |   |-- profile
|   |   |   |   `-- route.js
|   |   |   |-- resolve
|   |   |   |   `-- route.js
|   |   |   |-- reviews
|   |   |   |   `-- route.js
|   |   |   `-- search
|   |   |       `-- route.js
|   |   |-- activity
|   |   |   `-- events
|   |   |       `-- route.js
|   |   |-- auth
|   |   |   |-- account
|   |   |   |   `-- route.js
|   |   |   |-- audit
|   |   |   |   `-- route.js
|   |   |   |-- password-reset
|   |   |   |   `-- complete
|   |   |   |       `-- route.js
|   |   |   |-- session
|   |   |   |   `-- route.js
|   |   |   |-- sign-in
|   |   |   |   `-- route.js
|   |   |   |-- sign-up
|   |   |   |   `-- complete
|   |   |   |       `-- route.js
|   |   |   `-- verification
|   |   |       `-- route.js
|   |   |-- collections
|   |   |   `-- route.js
|   |   |-- feedback
|   |   |   `-- route.js
|   |   |-- follows
|   |   |   `-- route.js
|   |   |-- health
|   |   |   `-- route.js
|   |   |-- internal
|   |   |   `-- jobs
|   |   |       `-- app-events
|   |   |           `-- route.js
|   |   |-- live-updates
|   |   |   |-- events
|   |   |   |   `-- route.js
|   |   |   `-- route.js
|   |   |-- notifications
|   |   |   |-- events
|   |   |   |   `-- route.js
|   |   |   `-- route.js
|   |   |-- observability
|   |   |   `-- web-vitals
|   |   |       `-- route.js
|   |   |-- person
|   |   |   `-- [id]
|   |   |       `-- awards
|   |   |           `-- route.js
|   |   |-- reviews
|   |   |   |-- write
|   |   |   |   `-- route.js
|   |   |   `-- route.js
|   |   |-- search
|   |   |   `-- community
|   |   |       `-- route.js
|   |   |-- social-proof
|   |   |   `-- route.js
|   |   |-- system
|   |   |   `-- rollout
|   |   |       `-- route.js
|   |   `-- tmdb
|   |       `-- route.js
|   |-- error.js
|   |-- global-error.js
|   |-- globals.css
|   |-- layout.js
|   |-- manifest.js
|   |-- not-found.js
|   |-- providers.js
|   `-- template.js
|-- assets
|   `-- fonts
|       |-- zuume
|       |   `-- Zuume-Bold.woff2
|       `-- index.js
|-- domains
|   |-- account
|   |   |-- server
|   |   |   |-- api
|   |   |   |   |-- activity.server.js
|   |   |   |   |-- collections.server.js
|   |   |   |   |-- profile.server.js
|   |   |   |   |-- resolve.server.js
|   |   |   |   |-- reviews.server.js
|   |   |   |   `-- search.server.js
|   |   |   |-- collections
|   |   |   |   |-- constants.js
|   |   |   |   |-- normalizers.js
|   |   |   |   |-- read.server.js
|   |   |   |   |-- shared.server.js
|   |   |   |   `-- status.server.js
|   |   |   |-- feed
|   |   |   |   |-- constants.js
|   |   |   |   |-- derived.js
|   |   |   |   |-- normalizers.js
|   |   |   |   |-- projector.js
|   |   |   |   `-- read.server.js
|   |   |   |-- media
|   |   |   |   |-- collection.service.js
|   |   |   |   |-- constants.js
|   |   |   |   |-- shared.js
|   |   |   |   |-- storage.server.js
|   |   |   |   `-- upload.server.js
|   |   |   |-- profile
|   |   |   |   |-- client.js
|   |   |   |   |-- constants.js
|   |   |   |   |-- normalizers.js
|   |   |   |   |-- read-profile.server.js
|   |   |   |   |-- read.server.js
|   |   |   |   |-- service.js
|   |   |   |   |-- service.normalizers.js
|   |   |   |   |-- service.requests.js
|   |   |   |   |-- service.subscriptions.js
|   |   |   |   `-- summary.service.js
|   |   |   |-- routes
|   |   |   |   |-- constants.js
|   |   |   |   |-- loaders.js
|   |   |   |   |-- read.server.js
|   |   |   |   |-- session.js
|   |   |   |   |-- snapshot.js
|   |   |   |   `-- state.js
|   |   |   `-- index.js
|   |   `-- ui
|   |       |-- feeds
|   |       |   |-- list-detail
|   |       |   |   |-- comments-section.js
|   |       |   |   |-- config.js
|   |       |   |   `-- filter-state.js
|   |       |   |-- activity.js
|   |       |   |-- likes.js
|   |       |   |-- list-detail.js
|   |       |   |-- lists.js
|   |       |   |-- overview.js
|   |       |   |-- reviews.js
|   |       |   |-- watched.js
|   |       |   `-- watchlist.js
|   |       |-- filtering
|   |       |   |-- activity.js
|   |       |   |-- index.js
|   |       |   |-- lists.js
|   |       |   |-- media.js
|   |       |   |-- query-utils.js
|   |       |   |-- reviews.js
|   |       |   `-- shared.js
|   |       |-- filters
|   |       |   |-- content-filter
|   |       |   |   |-- activity-filter-bar.js
|   |       |   |   |-- list-sort-bar.js
|   |       |   |   |-- media-filter-bar.js
|   |       |   |   |-- options.js
|   |       |   |   |-- primitives.js
|   |       |   |   |-- review-filter-bar.js
|   |       |   |   `-- search-movie-filter-bar.js
|   |       |   `-- content-filter-primitives.js
|   |       |-- hooks
|   |       |   |-- collection-metadata.js
|   |       |   |-- collection-remove-actions.js
|   |       |   |-- collection-reorder-actions.js
|   |       |   |-- collection-seed-state.js
|   |       |   |-- collections.js
|   |       |   |-- edit-data.js
|   |       |   |-- page-actions.js
|   |       |   |-- page-data.js
|   |       |   |-- relationships.js
|   |       |   |-- section-page.js
|   |       |   |-- security-actions.js
|   |       |   |-- security-credential-helpers.js
|   |       |   |-- security-credential-validation.js
|   |       |   `-- security-credentials.js
|   |       |-- lists
|   |       |   |-- card.js
|   |       |   `-- grid.js
|   |       |-- modals
|   |       |   |-- create-list-modal.js
|   |       |   |-- list-editor-modal.js
|   |       |   `-- list-picker-modal.js
|   |       |-- overview
|   |       |   |-- activity.js
|   |       |   |-- favorites.js
|   |       |   |-- lists.js
|   |       |   |-- reviews.js
|   |       |   |-- watched.js
|   |       |   `-- watchlist.js
|   |       |-- account-action.js
|   |       |-- account-animation-config.js
|   |       |-- account-bio-surface.js
|   |       |-- account-data.js
|   |       |-- account-hero.js
|   |       |-- account-layout.js
|   |       |-- account-media-grid.js
|   |       |-- account-page-factory.js
|   |       |-- account-pagination.js
|   |       |-- account-registry-state.js
|   |       |-- account-section-factory.js
|   |       |-- account-section-state.js
|   |       |-- account-section.js
|   |       |-- account-skeleton.js
|   |       |-- activity-client.js
|   |       |-- activity-view.js
|   |       |-- edit-client.js
|   |       |-- edit-registry.js
|   |       |-- edit-view.js
|   |       |-- likes-client.js
|   |       |-- likes-view.js
|   |       |-- list-detail-client.js
|   |       |-- list-detail-view.js
|   |       |-- lists-client.js
|   |       |-- lists-view.js
|   |       |-- overview-client.js
|   |       |-- overview-registry.js
|   |       |-- overview-view.js
|   |       |-- profile-client.js
|   |       |-- profile-registry.js
|   |       |-- registry-config.js
|   |       |-- reviews-client.js
|   |       |-- reviews-view.js
|   |       |-- security.js
|   |       |-- watched-client.js
|   |       |-- watched-view.js
|   |       |-- watchlist-client.js
|   |       `-- watchlist-view.js
|   |-- auth
|   |   |-- clients
|   |   |   |-- audit.client.js
|   |   |   |-- csrf.client.js
|   |   |   |-- index.js
|   |   |   |-- pending-account.client.js
|   |   |   `-- session-storage.client.js
|   |   |-- servers
|   |   |   |-- account
|   |   |   |   |-- account-bootstrap.server.js
|   |   |   |   |-- account-deletion.server.js
|   |   |   |   |-- account-lifecycle.server.js
|   |   |   |   `-- account-state.server.js
|   |   |   |-- account-route
|   |   |   |   |-- account-route.delete.server.js
|   |   |   |   |-- account-route.email.server.js
|   |   |   |   |-- account-route.handlers.server.js
|   |   |   |   |-- account-route.password-change.server.js
|   |   |   |   |-- account-route.password-set.server.js
|   |   |   |   |-- account-route.password-status.server.js
|   |   |   |   |-- account-route.reauthenticate.server.js
|   |   |   |   `-- account-route.shared.server.js
|   |   |   |-- api
|   |   |   |   |-- audit.server.js
|   |   |   |   |-- password-reset-complete.server.js
|   |   |   |   |-- session.server.js
|   |   |   |   |-- sign-in.server.js
|   |   |   |   |-- sign-up-complete.server.js
|   |   |   |   `-- verification.server.js
|   |   |   |-- providers
|   |   |   |   |-- google-auth-intent.server.js
|   |   |   |   `-- google-provider.server.js
|   |   |   |-- security
|   |   |   |   |-- csrf.server.js
|   |   |   |   |-- password-security.server.js
|   |   |   |   |-- rate-limit-policies.server.js
|   |   |   |   |-- rate-limit.server.js
|   |   |   |   |-- recent-reauth.server.js
|   |   |   |   `-- step-up.server.js
|   |   |   |-- session
|   |   |   |   |-- authenticated-request.server.js
|   |   |   |   |-- request-context.server.js
|   |   |   |   |-- revocation.server.js
|   |   |   |   |-- session-auth-context.server.js
|   |   |   |   |-- session-cookie-state.server.js
|   |   |   |   |-- session-errors.server.js
|   |   |   |   |-- session-request-client.server.js
|   |   |   |   |-- session.builder.js
|   |   |   |   |-- session.constants.js
|   |   |   |   |-- session.cookies.server.js
|   |   |   |   |-- session.server.js
|   |   |   |   |-- session.shared.js
|   |   |   |   `-- supabase-admin-auth.server.js
|   |   |   |-- verification
|   |   |   |   |-- challenge-proof.server.js
|   |   |   |   |-- email-sender.server.js
|   |   |   |   |-- email-verification.constants.js
|   |   |   |   |-- email-verification.rate-limit.server.js
|   |   |   |   |-- email-verification.server.js
|   |   |   |   |-- email-verification.store.server.js
|   |   |   |   |-- email-verification.token.server.js
|   |   |   |   |-- email-verification.utils.js
|   |   |   |   |-- login-verification.constants.js
|   |   |   |   |-- login-verification.server.js
|   |   |   |   |-- password-account.errors.js
|   |   |   |   |-- password-account.server.js
|   |   |   |   |-- password-reset-proof.server.js
|   |   |   |   |-- secret-fallback.server.js
|   |   |   |   |-- signed-token.server.js
|   |   |   |   |-- signup-proof.server.js
|   |   |   |   `-- verification-request.server.js
|   |   |   |-- account.js
|   |   |   |-- audit-log.server.js
|   |   |   |-- audit.js
|   |   |   |-- auth-route-notice.server.js
|   |   |   |-- auth-route-policy.server.js
|   |   |   |-- index.js
|   |   |   |-- notice.js
|   |   |   |-- policy.js
|   |   |   |-- providers.js
|   |   |   |-- security.js
|   |   |   |-- session.js
|   |   |   `-- verification.js
|   |   |-- ui
|   |   |   |-- auth-animation.js
|   |   |   |-- auth-route-registry.js
|   |   |   |-- callback-client.js
|   |   |   |-- loading-state.js
|   |   |   |-- sign-in-client.js
|   |   |   |-- sign-in-state.js
|   |   |   |-- sign-in-view.js
|   |   |   |-- sign-up-client.js
|   |   |   `-- sign-up-view.js
|   |   |-- auth-flow.js
|   |   |-- auth-verification-surface.js
|   |   |-- auth.constants.js
|   |   |-- capabilities.js
|   |   |-- constants.js
|   |   |-- forgot-password-action.js
|   |   |-- form-primitives.js
|   |   |-- index.js
|   |   |-- oauth-callback.js
|   |   |-- oauth-provider-button.js
|   |   |-- oauth-providers.js
|   |   |-- page-shell.js
|   |   |-- password-validation.js
|   |   |-- requests.js
|   |   |-- route-notice.js
|   |   `-- workflows.js
|   |-- home
|   |   |-- ui
|   |   |   |-- client.js
|   |   |   |-- loading-state.js
|   |   |   |-- registry.js
|   |   |   `-- view.js
|   |   |-- animation-config.js
|   |   |-- discover-section.js
|   |   |-- poster-rail.js
|   |   `-- trending-section.js
|   |-- legal
|   |   `-- ui
|   |       |-- legal-animation.js
|   |       |-- legal-registry.js
|   |       |-- privacy-view.js
|   |       `-- terms-view.js
|   |-- media
|   |   |-- person
|   |   |   |-- awards.js
|   |   |   |-- bio.js
|   |   |   |-- filmography-card.js
|   |   |   |-- filmography-section.js
|   |   |   |-- gallery.js
|   |   |   |-- media-thumb.js
|   |   |   |-- person-data.js
|   |   |   |-- poster-preferences.js
|   |   |   |-- social-links.js
|   |   |   `-- timeline.js
|   |   |-- server
|   |   |   |-- likes
|   |   |   |   |-- index.js
|   |   |   |   |-- queries.js
|   |   |   |   |-- service.js
|   |   |   |   |-- shared.js
|   |   |   |   `-- subscriptions.js
|   |   |   |-- lists
|   |   |   |   |-- constants.js
|   |   |   |   |-- derived-state.js
|   |   |   |   |-- index.js
|   |   |   |   |-- item-mutations.js
|   |   |   |   |-- like-mutations.js
|   |   |   |   |-- list-mutations.js
|   |   |   |   |-- mutations.js
|   |   |   |   |-- queries.js
|   |   |   |   |-- service.js
|   |   |   |   |-- shared.js
|   |   |   |   `-- subscriptions.js
|   |   |   |-- social-proof
|   |   |   |   |-- index.js
|   |   |   |   `-- service.js
|   |   |   |-- user-media
|   |   |   |   |-- index.js
|   |   |   |   |-- poster-preference-events.js
|   |   |   |   `-- service.js
|   |   |   |-- watched-watchlist
|   |   |   |   |-- index.js
|   |   |   |   |-- watched.queries.js
|   |   |   |   |-- watched.service.js
|   |   |   |   |-- watched.shared.js
|   |   |   |   |-- watched.subscriptions.js
|   |   |   |   |-- watchlist.queries.js
|   |   |   |   |-- watchlist.service.js
|   |   |   |   |-- watchlist.shared.js
|   |   |   |   `-- watchlist.subscriptions.js
|   |   |   |-- index.js
|   |   |   |-- media-key.service.js
|   |   |   |-- media.js
|   |   |   |-- person-awards.server.js
|   |   |   `-- supabase-media-utils.service.js
|   |   `-- ui
|   |       |-- components
|   |       |   |-- carousel.js
|   |       |   |-- list-preview-composition.js
|   |       |   |-- media-card.js
|   |       |   `-- media-poster-card.js
|   |       |-- modals
|   |       |   |-- cast-modal.js
|   |       |   |-- image-preview-modal.js
|   |       |   |-- media-social-proof-modal.js
|   |       |   `-- video-preview-modal.js
|   |       |-- navigation
|   |       |   |-- movie-action.js
|   |       |   `-- person-action.js
|   |       |-- surfaces
|   |       |   |-- person-bio-surface.js
|   |       |   `-- watch-providers-surface.js
|   |       |-- background-preferences.js
|   |       |-- cast-section.js
|   |       |-- collection-actions.js
|   |       |-- context-menu-actions.js
|   |       |-- gallery-section.js
|   |       |-- images-section.js
|   |       |-- media-animation-config.js
|   |       |-- media-data.js
|   |       |-- media-registry.js
|   |       |-- movie-client.js
|   |       |-- movie-reviews-client.js
|   |       |-- movie-reviews-view.js
|   |       |-- movie-skeleton.js
|   |       |-- movie-view.js
|   |       |-- person-client.js
|   |       |-- person-skeleton.js
|   |       |-- person-view.js
|   |       |-- poster-overrides.js
|   |       |-- recommendation-card.js
|   |       |-- seasons-section.js
|   |       |-- sidebar.js
|   |       |-- social-proof.js
|   |       |-- static-route-elements.js
|   |       |-- tv-client.js
|   |       `-- videos-section.js
|   |-- reviews
|   |   |-- components
|   |   |   |-- rating-range-selector.js
|   |   |   |-- rating-selector.js
|   |   |   |-- rating-stars.js
|   |   |   |-- review-auth-fallback.js
|   |   |   |-- review-card.js
|   |   |   |-- review-header.js
|   |   |   `-- review-list.js
|   |   |-- server
|   |   |   |-- api
|   |   |   |   `-- reviews.server.js
|   |   |   |-- constants.js
|   |   |   |-- context.js
|   |   |   |-- index.js
|   |   |   |-- list-mutations.js
|   |   |   |-- media-mutations.js
|   |   |   |-- mutation-shared.js
|   |   |   |-- mutations.js
|   |   |   |-- reviews-write.actions.server.js
|   |   |   |-- reviews-write.server.js
|   |   |   |-- reviews-write.shared.js
|   |   |   |-- server.constants.js
|   |   |   |-- server.context.js
|   |   |   |-- server.js
|   |   |   |-- server.list-feed.js
|   |   |   |-- server.profile-feed.js
|   |   |   |-- server.queries.js
|   |   |   |-- server.shared.js
|   |   |   |-- service.js
|   |   |   |-- shared.js
|   |   |   |-- stored-mutations.js
|   |   |   |-- subscriptions.js
|   |   |   `-- validation.js
|   |   `-- ui
|   |       |-- media-reviews.js
|   |       |-- review-action.js
|   |       |-- review-data.js
|   |       |-- review-editor-surface.js
|   |       `-- use-media-reviews.js
|   |-- search
|   |   |-- ui
|   |   |   |-- navigation
|   |   |   |   `-- search-action
|   |   |   |       |-- components
|   |   |   |       |   |-- controls.js
|   |   |   |       |   |-- item.js
|   |   |   |       |   `-- results-preview.js
|   |   |   |       |-- index.js
|   |   |   |       |-- search-action-helpers.js
|   |   |   |       `-- use-search-action-controller.js
|   |   |   |-- api.js
|   |   |   |-- cache.js
|   |   |   |-- constants.js
|   |   |   |-- filters.js
|   |   |   |-- grid-item.js
|   |   |   |-- ranking.js
|   |   |   |-- result.js
|   |   |   |-- search-data.js
|   |   |   `-- text.js
|   |   |-- search-community.server.js
|   |   `-- search-quality.server.js
|   `-- social
|       |-- server
|       |   |-- activity
|       |   |   |-- activity-events.constants.js
|       |   |   |-- activity-events.service.js
|       |   |   |-- activity.service.js
|       |   |   |-- canonical-key.js
|       |   |   |-- event-processor.constants.js
|       |   |   |-- event-processor.queries.js
|       |   |   |-- event-processor.server.js
|       |   |   |-- event-processor.shared.js
|       |   |   `-- index.js
|       |   |-- api
|       |   |   |-- activity-events.server.js
|       |   |   |-- notification-events.server.js
|       |   |   `-- social-proof.server.js
|       |   |-- notifications
|       |   |   |-- event-processor.server.js
|       |   |   |-- notification-events.constants.js
|       |   |   |-- notification-events.service.js
|       |   |   |-- notification-resources.server.js
|       |   |   |-- notifications.constants.js
|       |   |   `-- notifications.service.js
|       |   |-- social
|       |   |   |-- follow-resources.server.js
|       |   |   |-- follow.client-shared.js
|       |   |   |-- follow.constants.js
|       |   |   |-- follow.mutations.js
|       |   |   |-- follow.subscriptions.js
|       |   |   |-- follows.service.js
|       |   |   `-- index.js
|       |   |-- follows.events.server.js
|       |   |-- follows.server.js
|       |   |-- follows.shared.js
|       |   `-- notifications.server.js
|       `-- ui
|           |-- account-social-modal.js
|           `-- notifications-modal.js
|-- infrastructure
|   |-- http
|   |   |-- api
|   |   |   `-- rollout.server.js
|   |   |-- api-request.service.js
|   |   |-- api-response.server.js
|   |   |-- api-result.js
|   |   |-- app-error.js
|   |   |-- cache-policy.server.js
|   |   |-- client.js
|   |   |-- index.js
|   |   |-- memory-cache.server.js
|   |   |-- request-meta.server.js
|   |   |-- route-context.server.js
|   |   |-- runtime-policy.constants.js
|   |   |-- server.js
|   |   |-- supabase-data.service.js
|   |   |-- supabase-edge-internal.server.js
|   |   |-- write-rollout.config.server.js
|   |   |-- write-rollout.executor.server.js
|   |   `-- write-rollout.server.js
|   |-- jobs
|   |   |-- app-event-queue.server.js
|   |   `-- app-events-route.server.js
|   |-- observability
|   |   |-- feedback.server.js
|   |   `-- web-vitals.server.js
|   |-- realtime
|   |   |-- api
|   |   |   |-- live-updates-events.server.js
|   |   |   `-- live-updates.server.js
|   |   |-- live-updates.service.js
|   |   |-- polling-subscription.constants.js
|   |   |-- polling-subscription.service.js
|   |   |-- polling-subscription.shared.js
|   |   |-- realtime-broadcast.server.js
|   |   |-- realtime-transport.config.js
|   |   `-- user-events.server.js
|   |-- runtime
|   |   `-- health.server.js
|   |-- supabase
|   |   |-- admin.js
|   |   |-- auth-storage.js
|   |   |-- client.js
|   |   |-- constants.js
|   |   |-- proxy.js
|   |   |-- response-client.server.js
|   |   `-- server.js
|   `-- tmdb
|       |-- api
|       |   `-- route.server.js
|       |-- clients
|       |   |-- search
|       |   |   |-- fallback-queries.js
|       |   |   |-- movie-ranking.js
|       |   |   |-- person-ranking.js
|       |   |   `-- shared.js
|       |   |-- catalog.server.js
|       |   |-- config.js
|       |   |-- detail-id.server.js
|       |   |-- details.server.js
|       |   |-- request.js
|       |   |-- runtime-sanitize.server.js
|       |   |-- sanitize.js
|       |   |-- search-ranking.js
|       |   |-- search.server.js
|       |   `-- server.js
|       `-- services
|           |-- tmdb-http.client.js
|           |-- tmdb-movie-images.client.js
|           |-- tmdb.service.js
|           `-- watch-region.js
|-- modules
|   |-- account
|   |   |-- client.js
|   |   |-- context.js
|   |   |-- hooks.js
|   |   `-- index.js
|   |-- api
|   |   |-- cache.js
|   |   `-- index.js
|   |-- auth
|   |   |-- adapters
|   |   |   |-- api-adapter.js
|   |   |   |-- create-adapter.js
|   |   |   `-- supabase-adapter.js
|   |   |-- action-flows.js
|   |   |-- config.js
|   |   |-- context.js
|   |   |-- guards.js
|   |   |-- index.js
|   |   |-- session-client.js
|   |   |-- session-ready.js
|   |   |-- storage.js
|   |   `-- utils.js
|   |-- background
|   |   |-- context.js
|   |   `-- index.js
|   |-- context-menu
|   |   |-- context.js
|   |   |-- index.js
|   |   |-- menu-engine.js
|   |   |-- motion.js
|   |   `-- renderer.js
|   |-- countdown
|   |   |-- config.js
|   |   |-- context.js
|   |   `-- index.js
|   |-- error-boundary
|   |   |-- core.js
|   |   |-- index.js
|   |   |-- integrations.js
|   |   |-- listener.js
|   |   `-- reporter.js
|   |-- loading
|   |   |-- context.js
|   |   `-- index.js
|   |-- modal
|   |   |-- config.js
|   |   |-- container.js
|   |   |-- context.js
|   |   |-- header.js
|   |   |-- index.js
|   |   |-- motion.js
|   |   |-- title.js
|   |   `-- utils.js
|   |-- nav
|   |   |-- hooks
|   |   |   |-- index.js
|   |   |   |-- navigation-status-model.js
|   |   |   |-- use-action-height.js
|   |   |   |-- use-element-height.js
|   |   |   |-- use-nav-badge.js
|   |   |   |-- use-nav-height-controller.js
|   |   |   |-- use-nav-height.js
|   |   |   |-- use-nav-keyboard.js
|   |   |   |-- use-nav-viewport.js
|   |   |   |-- use-navigation-compact.js
|   |   |   |-- use-navigation-core.js
|   |   |   |-- use-navigation-countdown.js
|   |   |   |-- use-navigation-display.js
|   |   |   |-- use-navigation-items.js
|   |   |   |-- use-navigation-layout.js
|   |   |   |-- use-navigation-status.js
|   |   |   |-- use-navigation.js
|   |   |   `-- use-surface-stack.js
|   |   |-- actions.js
|   |   |-- context.js
|   |   |-- elements.js
|   |   |-- events.js
|   |   |-- guards.js
|   |   |-- index.js
|   |   |-- item.js
|   |   |-- layout.js
|   |   |-- motion.js
|   |   |-- state-machine.js
|   |   |-- surface-model.js
|   |   |-- surface.js
|   |   `-- utils.js
|   |-- notification
|   |   |-- config.js
|   |   |-- context.js
|   |   |-- hooks.js
|   |   |-- index.js
|   |   |-- motion.js
|   |   `-- overlay.js
|   |-- registry
|   |   |-- plugins
|   |   |   `-- index.js
|   |   |-- bootstrap.js
|   |   |-- constants.js
|   |   |-- context.js
|   |   |-- index.js
|   |   |-- injector.js
|   |   |-- store.js
|   |   `-- use-registry.js
|   `-- settings
|       |-- config.js
|       |-- context.js
|       |-- index.js
|       |-- storage.js
|       `-- utils.js
|-- public
|   |-- images
|   |   |-- default-avatar.svg
|   |   `-- noise.webp
|   |-- _headers
|   `-- tvizzie.png
|-- scripts
|   |-- check-architecture.mjs
|   `-- dev-seed-dataset.mjs
|-- shared
|   |-- constants
|   |   |-- events
|   |   |   `-- index.js
|   |   `-- index.js
|   |-- hooks
|   |   |-- use-click-outside.js
|   |   |-- use-debounce.js
|   |   `-- use-draggable-scroll.js
|   `-- lib
|       |-- account.js
|       |-- avatar.js
|       |-- classnames.js
|       |-- client-utils.js
|       |-- collection.js
|       |-- data-errors.js
|       |-- feedback.js
|       |-- format.js
|       |-- image.js
|       |-- index.js
|       |-- media.js
|       |-- number.js
|       |-- react.js
|       |-- route-registry.js
|       |-- string.js
|       |-- type.js
|       `-- url.js
|-- ui
|   |-- feedback
|   |   |-- confirmation-surface.js
|   |   |-- empty-state.js
|   |   |-- file-upload-surface.js
|   |   |-- fullscreen-state.js
|   |   |-- not-found-action.js
|   |   |-- not-found-template.js
|   |   |-- skeleton.js
|   |   `-- spinner.js
|   |-- layout
|   |   |-- nav-height-spacer.js
|   |   `-- page-gradient-shell.js
|   |-- motion
|   |   `-- animations
|   |       |-- blurry-text.js
|   |       `-- text-animate.js
|   `-- primitives
|       |-- select
|       |   |-- async-select.js
|       |   |-- combobox.js
|       |   |-- default-select.js
|       |   |-- index.js
|       |   |-- multi-select.js
|       |   `-- searchable-select.js
|       |-- adaptive-image.js
|       |-- button.js
|       |-- checkbox.js
|       |-- icon.js
|       |-- index.js
|       |-- input.js
|       |-- navigation-action-styles.js
|       |-- noise-texture.js
|       |-- popover.js
|       |-- primitive-support.js
|       |-- segmented-control.js
|       |-- switch.js
|       |-- textarea.js
|       `-- tooltip.js
|-- .editorconfig
|-- .env
|-- .gitattributes
|-- .gitignore
|-- .prettierignore
|-- .prettierrc.cjs
|-- ARCHITECTURE.md
|-- eslint.config.mjs
|-- FILE_STRUCTURE.md
|-- jsconfig.json
|-- middleware.js
|-- next.config.mjs
|-- open-next.config.ts
|-- package-lock.json
|-- package.json
|-- postcss.config.mjs
|-- tailwind.config.js
`-- wrangler.jsonc
```

