# Current Repository File Structure

This file is generated from the working tree and lists every project file. Generated or metadata-only content is intentionally excluded: `.git/`, `.next/`, `node_modules/`, and `.DS_Store`.

```text
.
├── .vscode/
│   └── settings.json
├── app/
│   ├── (account)/
│   │   ├── account/
│   │   │   ├── [username]/
│   │   │   │   ├── activity/
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── likes/
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── lists/
│   │   │   │   │   ├── [slug]/
│   │   │   │   │   │   ├── client.js
│   │   │   │   │   │   ├── loading.js
│   │   │   │   │   │   └── page.js
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── reviews/
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── watched/
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── watchlist/
│   │   │   │   │   ├── client.js
│   │   │   │   │   ├── loading.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── client.js
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   └── page.js
│   │   │   ├── edit/
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
│   ├── (auth)/
│   │   ├── callback/
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── sign-in/
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── sign-up/
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── motion.js
│   │   └── registry.js
│   ├── (home)/
│   │   ├── client.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── motion.js
│   │   ├── page.js
│   │   └── registry.js
│   ├── (legal)/
│   │   ├── privacy/
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── terms/
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── motion.js
│   │   └── registry.js
│   ├── (media)/
│   │   ├── movie/
│   │   │   └── [id]/
│   │   │       ├── reviews/
│   │   │       │   ├── client.js
│   │   │       │   └── page.js
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── person/
│   │   │   └── [id]/
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── tv/
│   │   │   └── [id]/
│   │   │       ├── reviews/
│   │   │       │   ├── client.js
│   │   │       │   └── page.js
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── motion.js
│   │   └── registry.js
│   ├── _shell/
│   │   ├── navigation/
│   │   │   ├── account-nav-links.js
│   │   │   ├── account-nav-registry.js
│   │   │   └── media-action.js
│   │   ├── global-context-menu-registry.js
│   │   ├── interactive-boundary.js
│   │   ├── nav-runtime.js
│   │   ├── navigation-config.js
│   │   ├── settings-modal.js
│   │   └── smooth-scroll.js
│   ├── api/
│   │   ├── account/
│   │   │   ├── activity/
│   │   │   │   └── route.js
│   │   │   ├── media/
│   │   │   │   └── route.js
│   │   │   ├── profile/
│   │   │   │   └── route.js
│   │   │   ├── resolve/
│   │   │   │   └── route.js
│   │   │   ├── reviews/
│   │   │   │   └── route.js
│   │   │   └── search/
│   │   │       └── route.js
│   │   ├── activity/
│   │   │   └── events/
│   │   │       └── route.js
│   │   ├── auth/
│   │   │   ├── account/
│   │   │   │   └── route.js
│   │   │   ├── audit/
│   │   │   │   └── route.js
│   │   │   ├── password-reset/
│   │   │   │   └── complete/
│   │   │   │       └── route.js
│   │   │   ├── session/
│   │   │   │   └── route.js
│   │   │   ├── sign-in/
│   │   │   │   └── route.js
│   │   │   ├── sign-up/
│   │   │   │   └── complete/
│   │   │   │       └── route.js
│   │   │   └── verification/
│   │   │       └── route.js
│   │   ├── collections/
│   │   │   └── route.js
│   │   ├── feedback/
│   │   │   └── route.js
│   │   ├── follows/
│   │   │   └── route.js
│   │   ├── health/
│   │   │   └── route.js
│   │   ├── internal/
│   │   │   └── jobs/
│   │   │       └── app-events/
│   │   │           └── route.js
│   │   ├── live-updates/
│   │   │   ├── events/
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── notifications/
│   │   │   ├── events/
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── observability/
│   │   │   └── web-vitals/
│   │   │       └── route.js
│   │   ├── person/
│   │   │   └── [id]/
│   │   │       └── awards/
│   │   │           └── route.js
│   │   ├── reviews/
│   │   │   ├── write/
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── search/
│   │   │   └── community/
│   │   │       └── route.js
│   │   ├── social-proof/
│   │   │   └── route.js
│   │   ├── system/
│   │   │   └── rollout/
│   │   │       └── route.js
│   │   └── tmdb/
│   │       └── route.js
│   ├── error.js
│   ├── global-error.js
│   ├── globals.css
│   ├── layout.js
│   ├── manifest.js
│   ├── not-found.js
│   ├── providers.js
│   └── template.js
├── assets/
│   └── fonts/
│       ├── zuume/
│       │   └── Zuume-Bold.woff2
│       └── index.js
├── domains/
│   ├── account/
│   │   ├── server/
│   │   │   ├── api/
│   │   │   │   ├── activity.server.js
│   │   │   │   ├── collections.server.js
│   │   │   │   ├── profile.server.js
│   │   │   │   ├── resolve.server.js
│   │   │   │   ├── reviews.server.js
│   │   │   │   └── search.server.js
│   │   │   ├── collections/
│   │   │   │   ├── collection-constants.js
│   │   │   │   ├── collection-normalizers.js
│   │   │   │   ├── collection-read.server.js
│   │   │   │   ├── collection-shared.server.js
│   │   │   │   └── collection-status.server.js
│   │   │   ├── feed/
│   │   │   │   ├── feed-constants.js
│   │   │   │   ├── feed-derived.js
│   │   │   │   ├── feed-normalizers.js
│   │   │   │   ├── feed-projector.js
│   │   │   │   └── feed-read.server.js
│   │   │   ├── media/
│   │   │   │   ├── media-collection-service.js
│   │   │   │   ├── media-constants.js
│   │   │   │   ├── media-shared.js
│   │   │   │   ├── media-storage.server.js
│   │   │   │   └── media-upload.server.js
│   │   │   ├── profile/
│   │   │   │   ├── profile-constants.js
│   │   │   │   ├── profile-http-client.js
│   │   │   │   ├── profile-normalizers.js
│   │   │   │   ├── profile-public-read.server.js
│   │   │   │   ├── profile-read.server.js
│   │   │   │   ├── profile-service-normalizers.js
│   │   │   │   ├── profile-service-requests.js
│   │   │   │   ├── profile-service-subscriptions.js
│   │   │   │   ├── profile-service.js
│   │   │   │   └── profile-summary-service.js
│   │   │   ├── routes/
│   │   │   │   ├── route-constants.js
│   │   │   │   ├── route-loaders.js
│   │   │   │   ├── route-read.server.js
│   │   │   │   ├── route-session.js
│   │   │   │   ├── route-snapshot.js
│   │   │   │   └── route-state.js
│   │   │   └── account-server.js
│   │   └── ui/
│   │       ├── feeds/
│   │       │   ├── list-detail/
│   │       │   │   ├── comments-section.js
│   │       │   │   ├── list-detail-config.js
│   │       │   │   └── list-detail-filter-state.js
│   │       │   ├── activity.js
│   │       │   ├── likes.js
│   │       │   ├── list-detail.js
│   │       │   ├── lists.js
│   │       │   ├── overview.js
│   │       │   ├── reviews.js
│   │       │   ├── watched.js
│   │       │   └── watchlist.js
│   │       ├── filtering/
│   │       │   ├── activity.js
│   │       │   ├── filtering-query-utils.js
│   │       │   ├── filtering-shared.js
│   │       │   ├── filtering.js
│   │       │   ├── lists.js
│   │       │   ├── media.js
│   │       │   └── reviews.js
│   │       ├── filters/
│   │       │   ├── content-filter/
│   │       │   │   ├── activity-filter-bar.js
│   │       │   │   ├── content-filter-controls.js
│   │       │   │   ├── content-filter-options.js
│   │       │   │   ├── list-sort-bar.js
│   │       │   │   ├── media-filter-bar.js
│   │       │   │   ├── review-filter-bar.js
│   │       │   │   └── search-movie-filter-bar.js
│   │       │   └── content-filter-primitives.js
│   │       ├── hooks/
│   │       │   ├── collection-metadata.js
│   │       │   ├── collection-remove-actions.js
│   │       │   ├── collection-reorder-actions.js
│   │       │   ├── collection-seed-state.js
│   │       │   ├── collections.js
│   │       │   ├── edit-data.js
│   │       │   ├── page-actions.js
│   │       │   ├── page-data.js
│   │       │   ├── relationships.js
│   │       │   ├── section-page.js
│   │       │   ├── security-actions.js
│   │       │   ├── security-credential-helpers.js
│   │       │   ├── security-credential-validation.js
│   │       │   └── security-credentials.js
│   │       ├── lists/
│   │       │   ├── list-card.js
│   │       │   └── list-grid.js
│   │       ├── modals/
│   │       │   ├── create-list-modal.js
│   │       │   ├── list-editor-modal.js
│   │       │   └── list-picker-modal.js
│   │       ├── overview/
│   │       │   ├── activity.js
│   │       │   ├── favorites.js
│   │       │   ├── lists.js
│   │       │   ├── reviews.js
│   │       │   ├── watched.js
│   │       │   └── watchlist.js
│   │       ├── account-action.js
│   │       ├── account-bio-surface.js
│   │       ├── account-data.js
│   │       ├── account-hero.js
│   │       ├── account-layout.js
│   │       ├── account-media-grid.js
│   │       ├── account-page-factory.js
│   │       ├── account-pagination.js
│   │       ├── account-registry-state.js
│   │       ├── account-section-factory.js
│   │       ├── account-section-state.js
│   │       ├── account-section.js
│   │       └── account-security.js
│   ├── auth/
│   │   ├── clients/
│   │   │   ├── audit.client.js
│   │   │   ├── csrf.client.js
│   │   │   ├── index.js
│   │   │   ├── pending-account.client.js
│   │   │   └── session-storage.client.js
│   │   ├── servers/
│   │   │   ├── account/
│   │   │   │   ├── account-bootstrap.server.js
│   │   │   │   ├── account-deletion.server.js
│   │   │   │   ├── account-lifecycle.server.js
│   │   │   │   └── account-state.server.js
│   │   │   ├── account-route/
│   │   │   │   ├── account-route-shared.server.js
│   │   │   │   ├── account-route.delete.server.js
│   │   │   │   ├── account-route.email.server.js
│   │   │   │   ├── account-route.handlers.server.js
│   │   │   │   ├── account-route.password-change.server.js
│   │   │   │   ├── account-route.password-set.server.js
│   │   │   │   ├── account-route.password-status.server.js
│   │   │   │   └── account-route.reauthenticate.server.js
│   │   │   ├── api/
│   │   │   │   ├── audit.server.js
│   │   │   │   ├── password-reset-complete.server.js
│   │   │   │   ├── session.server.js
│   │   │   │   ├── sign-in.server.js
│   │   │   │   ├── sign-up-complete.server.js
│   │   │   │   └── verification.server.js
│   │   │   ├── providers/
│   │   │   │   ├── google-auth-intent.server.js
│   │   │   │   └── google-provider.server.js
│   │   │   ├── security/
│   │   │   │   ├── csrf.server.js
│   │   │   │   ├── password-security.server.js
│   │   │   │   ├── rate-limit-policies.server.js
│   │   │   │   ├── rate-limit.server.js
│   │   │   │   ├── recent-reauth.server.js
│   │   │   │   └── step-up.server.js
│   │   │   ├── session/
│   │   │   │   ├── authenticated-request.server.js
│   │   │   │   ├── request-context.server.js
│   │   │   │   ├── revocation.server.js
│   │   │   │   ├── session-auth-context.server.js
│   │   │   │   ├── session-builder.server.js
│   │   │   │   ├── session-constants.server.js
│   │   │   │   ├── session-cookie-state.server.js
│   │   │   │   ├── session-cookies.server.js
│   │   │   │   ├── session-errors.server.js
│   │   │   │   ├── session-request-client.server.js
│   │   │   │   ├── session-shared.js
│   │   │   │   ├── session.server.js
│   │   │   │   └── supabase-admin-auth.server.js
│   │   │   ├── verification/
│   │   │   │   ├── challenge-proof.server.js
│   │   │   │   ├── email-sender.server.js
│   │   │   │   ├── email-verification-constants.js
│   │   │   │   ├── email-verification-utils.js
│   │   │   │   ├── email-verification.rate-limit.server.js
│   │   │   │   ├── email-verification.server.js
│   │   │   │   ├── email-verification.store.server.js
│   │   │   │   ├── email-verification.token.server.js
│   │   │   │   ├── login-verification-constants.js
│   │   │   │   ├── login-verification.server.js
│   │   │   │   ├── password-account-errors.js
│   │   │   │   ├── password-account.server.js
│   │   │   │   ├── password-reset-proof.server.js
│   │   │   │   ├── secret-fallback.server.js
│   │   │   │   ├── signed-token.server.js
│   │   │   │   ├── signup-proof.server.js
│   │   │   │   └── verification-request.server.js
│   │   │   ├── audit-log.server.js
│   │   │   ├── auth-account.js
│   │   │   ├── auth-audit.js
│   │   │   ├── auth-notice.js
│   │   │   ├── auth-policy.js
│   │   │   ├── auth-providers.js
│   │   │   ├── auth-route-notice.server.js
│   │   │   ├── auth-route-policy.server.js
│   │   │   ├── auth-security.js
│   │   │   ├── auth-session.js
│   │   │   ├── auth-verification.js
│   │   │   └── index.js
│   │   ├── ui/
│   │   │   └── sign-in-state.js
│   │   ├── auth-constants.js
│   │   ├── auth-flow.js
│   │   ├── auth-tables-constants.js
│   │   ├── auth-verification-surface.js
│   │   ├── capabilities.js
│   │   ├── forgot-password-action.js
│   │   ├── form-primitives.js
│   │   ├── index.js
│   │   ├── oauth-callback.js
│   │   ├── oauth-provider-button.js
│   │   ├── oauth-providers.js
│   │   ├── page-shell.js
│   │   ├── password-validation.js
│   │   ├── requests.js
│   │   ├── route-notice.js
│   │   └── workflows.js
│   ├── home/
│   │   ├── ui/
│   │   ├── discover-section.js
│   │   ├── poster-rail.js
│   │   └── trending-section.js
│   ├── legal/
│   │   └── ui/
│   ├── media/
│   │   ├── person/
│   │   │   ├── awards.js
│   │   │   ├── bio.js
│   │   │   ├── filmography-card.js
│   │   │   ├── filmography-section.js
│   │   │   ├── gallery.js
│   │   │   ├── media-thumb.js
│   │   │   ├── person-data.js
│   │   │   ├── poster-preferences.js
│   │   │   ├── social-links.js
│   │   │   └── timeline.js
│   │   ├── server/
│   │   │   ├── likes/
│   │   │   │   ├── index.js
│   │   │   │   ├── like-queries.js
│   │   │   │   ├── like-service.js
│   │   │   │   ├── like-shared.js
│   │   │   │   └── like-subscriptions.js
│   │   │   ├── lists/
│   │   │   │   ├── derived-state.js
│   │   │   │   ├── index.js
│   │   │   │   ├── item-mutations.js
│   │   │   │   ├── like-mutations.js
│   │   │   │   ├── list-constants.js
│   │   │   │   ├── list-mutations.js
│   │   │   │   ├── list-queries.js
│   │   │   │   ├── list-service.js
│   │   │   │   ├── list-shared.js
│   │   │   │   ├── list-subscriptions.js
│   │   │   │   └── mutations.js
│   │   │   ├── social-proof/
│   │   │   │   ├── index.js
│   │   │   │   └── social-proof-service.js
│   │   │   ├── user-media/
│   │   │   │   ├── index.js
│   │   │   │   ├── poster-preference-events.js
│   │   │   │   └── user-media-service.js
│   │   │   ├── watched-watchlist/
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
│   │   │   ├── person-awards.server.js
│   │   │   └── supabase-media-utils-service.js
│   │   └── ui/
│   │       ├── components/
│   │       │   ├── media-card.js
│   │       │   ├── media-carousel.js
│   │       │   ├── media-list-preview.js
│   │       │   └── media-poster-card.js
│   │       ├── modals/
│   │       │   ├── cast-modal.js
│   │       │   ├── image-preview-modal.js
│   │       │   ├── media-social-proof-modal.js
│   │       │   └── video-preview-modal.js
│   │       ├── navigation/
│   │       │   ├── movie-action.js
│   │       │   └── person-action.js
│   │       ├── surfaces/
│   │       │   ├── person-bio-surface.js
│   │       │   └── watch-providers-surface.js
│   │       ├── background-preferences.js
│   │       ├── cast-section.js
│   │       ├── collection-actions.js
│   │       ├── context-menu-actions.js
│   │       ├── gallery-section.js
│   │       ├── images-section.js
│   │       ├── media-data.js
│   │       ├── poster-overrides.js
│   │       ├── recommendation-card.js
│   │       ├── seasons-section.js
│   │       ├── sidebar.js
│   │       ├── social-proof.js
│   │       ├── static-route-elements.js
│   │       └── videos-section.js
│   ├── reviews/
│   │   ├── components/
│   │   │   ├── rating-range-selector.js
│   │   │   ├── rating-selector.js
│   │   │   ├── rating-stars.js
│   │   │   ├── review-auth-fallback.js
│   │   │   ├── review-card.js
│   │   │   ├── review-header.js
│   │   │   └── review-list.js
│   │   ├── server/
│   │   │   ├── api/
│   │   │   │   └── reviews.server.js
│   │   │   ├── index.js
│   │   │   ├── list-mutations.js
│   │   │   ├── media-mutations.js
│   │   │   ├── mutation-shared.js
│   │   │   ├── mutations.js
│   │   │   ├── review-constants.js
│   │   │   ├── review-context.js
│   │   │   ├── review-list-feed.js
│   │   │   ├── review-profile-feed.js
│   │   │   ├── review-server-constants.js
│   │   │   ├── review-server-context.js
│   │   │   ├── review-server-queries.js
│   │   │   ├── review-server-shared.js
│   │   │   ├── review-server.js
│   │   │   ├── review-service.js
│   │   │   ├── review-shared.js
│   │   │   ├── review-subscriptions.js
│   │   │   ├── reviews-write-actions.server.js
│   │   │   ├── reviews-write-shared.js
│   │   │   ├── reviews-write.server.js
│   │   │   ├── stored-mutations.js
│   │   │   └── validation.js
│   │   └── ui/
│   │       ├── media-reviews.js
│   │       ├── review-action.js
│   │       ├── review-data.js
│   │       ├── review-editor-surface.js
│   │       └── use-media-reviews.js
│   ├── search/
│   │   ├── ui/
│   │   │   ├── navigation/
│   │   │   │   └── search-action/
│   │   │   │       ├── components/
│   │   │   │       │   ├── controls.js
│   │   │   │       │   ├── item.js
│   │   │   │       │   └── results-preview.js
│   │   │   │       ├── index.js
│   │   │   │       ├── search-action-helpers.js
│   │   │   │       └── use-search-action-controller.js
│   │   │   ├── grid-item.js
│   │   │   ├── search-api.js
│   │   │   ├── search-cache.js
│   │   │   ├── search-constants.js
│   │   │   ├── search-data.js
│   │   │   ├── search-filters.js
│   │   │   ├── search-ranking.js
│   │   │   ├── search-result.js
│   │   │   └── search-text.js
│   │   ├── search-community.server.js
│   │   └── search-quality.server.js
│   └── social/
│       ├── server/
│       │   ├── activity/
│       │   │   ├── activity-events-constants.js
│       │   │   ├── activity-events-service.js
│       │   │   ├── activity-service.js
│       │   │   ├── canonical-key.js
│       │   │   ├── event-processor-constants.js
│       │   │   ├── event-processor-queries.js
│       │   │   ├── event-processor-shared.js
│       │   │   ├── event-processor.server.js
│       │   │   └── index.js
│       │   ├── api/
│       │   │   ├── activity-events.server.js
│       │   │   ├── notification-events.server.js
│       │   │   └── social-proof.server.js
│       │   ├── notifications/
│       │   │   ├── event-processor.server.js
│       │   │   ├── notification-events-constants.js
│       │   │   ├── notification-events-service.js
│       │   │   ├── notification-resources.server.js
│       │   │   ├── notifications-constants.js
│       │   │   └── notifications-service.js
│       │   ├── social/
│       │   │   ├── follow-client-shared.js
│       │   │   ├── follow-constants.js
│       │   │   ├── follow-mutations.js
│       │   │   ├── follow-resources.server.js
│       │   │   ├── follow-service.js
│       │   │   ├── follow-subscriptions.js
│       │   │   └── index.js
│       │   ├── follow-events.server.js
│       │   ├── follow-server.js
│       │   ├── follow-shared.js
│       │   └── notifications.server.js
│       └── ui/
│           ├── account-social-modal.js
│           └── notifications-modal.js
├── infrastructure/
│   ├── http/
│   │   ├── api/
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
│   ├── jobs/
│   │   ├── app-event-queue.server.js
│   │   └── app-events-route.server.js
│   ├── observability/
│   │   ├── feedback.server.js
│   │   └── web-vitals.server.js
│   ├── realtime/
│   │   ├── api/
│   │   │   ├── live-updates-events.server.js
│   │   │   └── live-updates.server.js
│   │   ├── live-updates-service.js
│   │   ├── polling-subscription-constants.js
│   │   ├── polling-subscription-service.js
│   │   ├── polling-subscription-shared.js
│   │   ├── realtime-broadcast.server.js
│   │   ├── realtime-transport-config.js
│   │   └── user-events.server.js
│   ├── runtime/
│   │   └── health.server.js
│   ├── supabase/
│   │   ├── admin.js
│   │   ├── auth-storage.js
│   │   ├── proxy.js
│   │   ├── response-client.server.js
│   │   ├── supabase-client.js
│   │   ├── supabase-constants.js
│   │   └── supabase-server.js
│   └── tmdb/
│       ├── api/
│       │   └── route.server.js
│       ├── clients/
│       │   ├── search/
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
│       └── services/
│           ├── tmdb-http.client.js
│           ├── tmdb-movie-images.client.js
│           ├── tmdb-service.js
│           └── watch-region.js
├── modules/
│   ├── account/
│   │   ├── account-client.js
│   │   ├── account-context.js
│   │   ├── account-hooks.js
│   │   └── index.js
│   ├── api/
│   │   ├── api-cache.js
│   │   └── index.js
│   ├── auth/
│   │   ├── adapters/
│   │   │   ├── api-adapter.js
│   │   │   ├── create-adapter.js
│   │   │   └── supabase-adapter.js
│   │   ├── action-flows.js
│   │   ├── auth-config.js
│   │   ├── auth-context.js
│   │   ├── auth-guards.js
│   │   ├── auth-utils.js
│   │   ├── index.js
│   │   ├── session-client.js
│   │   ├── session-ready.js
│   │   └── storage.js
│   ├── background/
│   │   ├── background-context.js
│   │   └── index.js
│   ├── context-menu/
│   │   ├── context.js
│   │   ├── index.js
│   │   ├── menu-engine.js
│   │   ├── motion.js
│   │   └── renderer.js
│   ├── countdown/
│   │   ├── context.js
│   │   ├── countdown-config.js
│   │   └── index.js
│   ├── error-boundary/
│   │   ├── core.js
│   │   ├── index.js
│   │   ├── integrations.js
│   │   ├── listener.js
│   │   └── reporter.js
│   ├── loading/
│   │   ├── context.js
│   │   └── index.js
│   ├── modal/
│   │   ├── container.js
│   │   ├── header.js
│   │   ├── index.js
│   │   ├── modal-config.js
│   │   ├── modal-context.js
│   │   ├── modal-motion.js
│   │   ├── modal-utils.js
│   │   └── title.js
│   ├── nav/
│   │   ├── hooks/
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
│   ├── notification/
│   │   ├── index.js
│   │   ├── notification-config.js
│   │   ├── notification-context.js
│   │   ├── notification-hooks.js
│   │   ├── notification-motion.js
│   │   └── notification-overlay.js
│   ├── registry/
│   │   ├── plugins/
│   │   │   └── index.js
│   │   ├── bootstrap.js
│   │   ├── index.js
│   │   ├── registry-constants.js
│   │   ├── registry-context.js
│   │   ├── registry-injector.js
│   │   ├── registry-store.js
│   │   └── use-registry.js
│   └── settings/
│       ├── index.js
│       ├── settings-config.js
│       ├── settings-context.js
│       ├── settings-storage.js
│       └── settings-utils.js
├── public/
│   ├── images/
│   │   ├── default-avatar.svg
│   │   └── noise.webp
│   ├── _headers
│   └── tvizzie.png
├── scripts/
│   ├── check-architecture.mjs
│   └── dev-seed-dataset.mjs
├── shared/
│   ├── constants/
│   │   ├── events/
│   │   │   └── index.js
│   │   └── index.js
│   ├── hooks/
│   │   ├── use-click-outside.js
│   │   ├── use-debounce.js
│   │   └── use-draggable-scroll.js
│   └── lib/
│       ├── account.js
│       ├── avatar.js
│       ├── classnames.js
│       ├── client-utils.js
│       ├── collection.js
│       ├── data-errors.js
│       ├── feedback.js
│       ├── format.js
│       ├── image.js
│       ├── index.js
│       ├── media.js
│       ├── number.js
│       ├── react.js
│       ├── route-registry.js
│       ├── string.js
│       ├── type.js
│       └── url.js
├── ui/
│   ├── feedback/
│   │   ├── confirmation-surface.js
│   │   ├── empty-state.js
│   │   ├── file-upload-surface.js
│   │   ├── fullscreen-state.js
│   │   ├── not-found-action.js
│   │   ├── not-found-template.js
│   │   └── spinner.js
│   ├── layout/
│   │   ├── nav-height-spacer.js
│   │   └── page-gradient-shell.js
│   ├── motion/
│   │   └── animations/
│   │       ├── blurry-text.js
│   │       └── text-animate.js
│   └── primitives/
│       ├── select/
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
