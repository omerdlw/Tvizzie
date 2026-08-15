# Current Repository File Structure

This file is generated from the working tree and lists every project file. Generated or metadata-only content is intentionally excluded: `.git/`, `.next/`, `node_modules/`, and `.DS_Store`.

```text
.
├── .editorconfig
├── .env
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc.cjs
├── .vscode
│   └── settings.json
├── AGENTS.md
├── ARCHITECTURE.md
├── CLAUDE.md
├── FILE_STRUCTURE.md
├── app
│   ├── (account)
│   │   ├── account
│   │   │   ├── [username]
│   │   │   │   ├── activity
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── client.js
│   │   │   │   ├── layout.js
│   │   │   │   ├── likes
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── lists
│   │   │   │   │   ├── [slug]
│   │   │   │   │   │   ├── client.js
│   │   │   │   │   │   ├── loading.js
│   │   │   │   │   │   └── page.js
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   ├── page.js
│   │   │   │   ├── reviews
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── watched
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   └── watchlist
│   │   │   │       ├── client.js
│   │   │   │       └── page.js
│   │   │   ├── client.js
│   │   │   ├── edit
│   │   │   │   ├── client.js
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   └── page.js
│   │   │   ├── error.js
│   │   │   ├── loading.js
│   │   │   ├── not-found.js
│   │   │   └── page.js
│   │   ├── layout.js
│   │   ├── motion.js
│   │   └── registry.js
│   ├── (auth)
│   │   ├── callback
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── error.js
│   │   ├── layout.js
│   │   ├── loading.js
│   │   ├── motion.js
│   │   ├── registry.js
│   │   ├── sign-in
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   └── sign-up
│   │       ├── client.js
│   │       └── page.js
│   ├── (home)
│   │   ├── client.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── page.js
│   │   └── registry.js
│   ├── (legal)
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── motion.js
│   │   ├── privacy
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── registry.js
│   │   └── terms
│   │       ├── client.js
│   │       └── page.js
│   ├── (media)
│   │   ├── layout.js
│   │   ├── motion.js
│   │   ├── movie
│   │   │   └── [id]
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       ├── page.js
│   │   │       └── reviews
│   │   │           ├── client.js
│   │   │           └── page.js
│   │   ├── person
│   │   │   └── [id]
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── registry.js
│   │   └── tv
│   │       └── [id]
│   │           ├── client.js
│   │           ├── loading.js
│   │           ├── not-found.js
│   │           ├── page.js
│   │           └── reviews
│   │               ├── client.js
│   │               └── page.js
│   ├── _shell
│   │   ├── global-context-menu-registry.js
│   │   ├── interactive-boundary.js
│   │   ├── nav-runtime.js
│   │   ├── navigation
│   │   │   ├── account-nav-links.js
│   │   │   └── account-nav-registry.js
│   │   ├── navigation-config.js
│   │   ├── route-transition-interceptor.js
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
│   │   │   ├── callback
│   │   │   │   └── route.js
│   │   │   ├── csrf
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
│   │   ├── jobs
│   │   │   └── route.js
│   │   ├── lists
│   │   │   ├── like
│   │   │   │   └── route.js
│   │   │   └── reviews-count
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
│   │   ├── person
│   │   │   └── [id]
│   │   ├── reviews
│   │   │   ├── route.js
│   │   │   └── write
│   │   │       └── route.js
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
│   ├── motion.js
│   ├── not-found.js
│   ├── providers.js
│   └── template.js
├── core
│   ├── modules
│   │   ├── account
│   │   │   ├── client.js
│   │   │   ├── context.js
│   │   │   ├── hooks.js
│   │   │   └── index.js
│   │   ├── api
│   │   │   ├── cache.js
│   │   │   └── index.js
│   │   ├── auth
│   │   │   ├── action-flows.js
│   │   │   ├── adapters
│   │   │   │   ├── api.js
│   │   │   │   ├── create-adapter.js
│   │   │   │   └── supabase-adapter.js
│   │   │   ├── config.js
│   │   │   ├── context.js
│   │   │   ├── guards.js
│   │   │   ├── http.client.js
│   │   │   ├── index.js
│   │   │   ├── provider-utils.js
│   │   │   ├── session-client.js
│   │   │   ├── session-ready.js
│   │   │   ├── storage.js
│   │   │   └── utils.js
│   │   ├── background
│   │   │   ├── context.js
│   │   │   └── index.js
│   │   ├── context-menu
│   │   │   ├── context.js
│   │   │   ├── index.js
│   │   │   ├── menu-engine.js
│   │   │   ├── motion.js
│   │   │   └── renderer.js
│   │   ├── countdown
│   │   ├── error-boundary
│   │   │   ├── core.js
│   │   │   ├── index.js
│   │   │   ├── integrations.js
│   │   │   ├── listener.js
│   │   │   └── reporter.js
│   │   ├── loading
│   │   │   ├── context.js
│   │   │   └── index.js
│   │   ├── modal
│   │   │   ├── config.js
│   │   │   ├── container.js
│   │   │   ├── context.js
│   │   │   ├── header.js
│   │   │   ├── index.js
│   │   │   ├── motion.js
│   │   │   ├── title.js
│   │   │   └── utils.js
│   │   ├── nav
│   │   │   ├── actions.js
│   │   │   ├── context.js
│   │   │   ├── elements.js
│   │   │   ├── events.js
│   │   │   ├── guards.js
│   │   │   ├── hooks
│   │   │   │   ├── index.js
│   │   │   │   ├── navigation-status-model.js
│   │   │   │   ├── use-action-height.js
│   │   │   │   ├── use-element-height.js
│   │   │   │   ├── use-nav-badge.js
│   │   │   │   ├── use-nav-height-controller.js
│   │   │   │   ├── use-nav-height.js
│   │   │   │   ├── use-nav-keyboard.js
│   │   │   │   ├── use-nav-viewport.js
│   │   │   │   ├── use-navigation-compact.js
│   │   │   │   ├── use-navigation-core.js
│   │   │   │   ├── use-navigation-display.js
│   │   │   │   ├── use-navigation-items.js
│   │   │   │   ├── use-navigation-layout.js
│   │   │   │   ├── use-navigation-status.js
│   │   │   │   ├── use-navigation.js
│   │   │   │   └── use-surface-stack.js
│   │   │   ├── index.js
│   │   │   ├── item.js
│   │   │   ├── layout.js
│   │   │   ├── motion.js
│   │   │   ├── state-machine.js
│   │   │   ├── surface-model.js
│   │   │   ├── surface.js
│   │   │   └── utils.js
│   │   ├── notification
│   │   │   ├── client-utils.js
│   │   │   ├── config.js
│   │   │   ├── context.js
│   │   │   ├── hooks.js
│   │   │   ├── index.js
│   │   │   ├── motion.js
│   │   │   └── overlay.js
│   │   ├── registry
│   │   │   ├── bootstrap.js
│   │   │   ├── constants.js
│   │   │   ├── context.js
│   │   │   ├── index.js
│   │   │   ├── injector.js
│   │   │   ├── plugins
│   │   │   │   └── index.js
│   │   │   ├── route-registry.js
│   │   │   ├── store.js
│   │   │   └── use-registry.js
│   │   └── settings
│   ├── shared
│   │   ├── constants
│   │   │   ├── events
│   │   │   │   └── index.js
│   │   │   └── index.js
│   │   ├── hooks
│   │   │   ├── use-click-outside.js
│   │   │   ├── use-debounce.js
│   │   │   └── use-draggable-scroll.js
│   │   ├── route-transition-coordinator.js
│   │   ├── route-transitions.js
│   │   └── utils.js
│   └── ui
│       ├── feedback
│       │   ├── confirmation-surface.js
│       │   ├── empty-state.js
│       │   ├── file-upload-surface.js
│       │   ├── fullscreen-state.js
│       │   ├── not-found-action.js
│       │   ├── not-found-template.js
│       │   └── spinner.js
│       ├── layout
│       │   ├── grid-crosshair.js
│       │   ├── nav-height-spacer.js
│       │   └── page-gradient-shell.js
│       ├── motion
│       │   ├── animations
│       │   │   ├── blurry-text.js
│       │   │   └── text-animate.js
│       │   └── skeleton-scene.js
│       └── primitives
│           ├── adaptive-image.js
│           ├── button.js
│           ├── checkbox.js
│           ├── icon.js
│           ├── index.js
│           ├── input.js
│           ├── navigation-action-styles.js
│           ├── noise-texture.js
│           ├── popover.js
│           ├── primitive-support.js
│           ├── segmented-control.js
│           ├── select
│           │   ├── async-select.js
│           │   ├── combobox.js
│           │   ├── default-select.js
│           │   ├── index.js
│           │   ├── multi-select.js
│           │   └── searchable-select.js
│           ├── switch.js
│           ├── textarea.js
│           └── tooltip.js
├── domains
│   ├── account
│   │   ├── client
│   │   │   ├── account-api.client.js
│   │   │   ├── collections.client.js
│   │   │   ├── index.js
│   │   │   └── profile.client.js
│   │   ├── hooks
│   │   │   ├── account-edit-data.hooks.js
│   │   │   ├── account-edit-page-state.js
│   │   │   ├── account-overview-state.js
│   │   │   ├── account-registry-state.js
│   │   │   ├── account-section-state.js
│   │   │   ├── collections.hooks.js
│   │   │   ├── feed-state.hooks.js
│   │   │   ├── index.js
│   │   │   ├── list-items.hooks.js
│   │   │   ├── media-feed-state.js
│   │   │   ├── page-actions.hooks.js
│   │   │   ├── page-data.hooks.js
│   │   │   ├── page.hooks.js
│   │   │   ├── relationship.hooks.js
│   │   │   ├── section-page.hooks.js
│   │   │   └── security.hooks.js
│   │   ├── index.js
│   │   ├── server
│   │   │   ├── actions
│   │   │   │   └── profile.server.js
│   │   │   ├── api-handlers.server.js
│   │   │   ├── collections.server.js
│   │   │   ├── feed.server.js
│   │   │   ├── index.js
│   │   │   ├── media-upload.server.js
│   │   │   ├── profile.server.js
│   │   │   ├── request-target.server.js
│   │   │   └── routes.server.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── account-media-grid.js
│   │   │   │   ├── account-pagination.js
│   │   │   │   └── lists
│   │   │   │       ├── list-card.js
│   │   │   │       └── list-grid.js
│   │   │   ├── filters
│   │   │   │   ├── activity.js
│   │   │   │   ├── content-filter
│   │   │   │   │   ├── activity-filter-bar.js
│   │   │   │   │   ├── content-filter-controls.js
│   │   │   │   │   ├── content-filter-options.js
│   │   │   │   │   ├── list-sort-bar.js
│   │   │   │   │   ├── media-filter-bar.js
│   │   │   │   │   ├── review-filter-bar.js
│   │   │   │   │   └── search-movie-filter-bar.js
│   │   │   │   ├── content-filter-primitives.js
│   │   │   │   ├── filtering.js
│   │   │   │   ├── lists.js
│   │   │   │   ├── media.js
│   │   │   │   └── reviews.js
│   │   │   ├── index.js
│   │   │   ├── layouts
│   │   │   │   ├── account-background-registry.js
│   │   │   │   ├── account-grid-frame.js
│   │   │   │   ├── account-layout.js
│   │   │   │   └── account-profile-context.js
│   │   │   ├── modals
│   │   │   │   └── list-editor-modal.js
│   │   │   ├── nav-actions
│   │   │   │   └── account-action.js
│   │   │   ├── nav-surfaces
│   │   │   │   ├── account-bio-surface.js
│   │   │   │   ├── create-list-surface.js
│   │   │   │   └── list-picker-surface.js
│   │   │   ├── pages
│   │   │   │   └── account-route-page.js
│   │   │   ├── sections
│   │   │   │   ├── account-hero.js
│   │   │   │   ├── account-section-factory.js
│   │   │   │   ├── account-section.js
│   │   │   │   ├── collections
│   │   │   │   │   ├── likes-collection.js
│   │   │   │   │   ├── media-collection-feed.js
│   │   │   │   │   ├── watched-collection.js
│   │   │   │   │   └── watchlist-collection.js
│   │   │   │   ├── edit
│   │   │   │   │   ├── account-edit-primitives.js
│   │   │   │   │   ├── account-edit-view.js
│   │   │   │   │   ├── account-general-settings-form.js
│   │   │   │   │   └── account-security-settings.js
│   │   │   │   ├── feeds
│   │   │   │   │   ├── activity.js
│   │   │   │   │   └── reviews.js
│   │   │   │   ├── lists
│   │   │   │   │   ├── list-detail-comments.js
│   │   │   │   │   ├── list-detail-config.js
│   │   │   │   │   ├── list-detail.js
│   │   │   │   │   ├── lists-collection.js
│   │   │   │   │   └── use-list-detail-filters.js
│   │   │   │   └── overview
│   │   │   │       ├── account-overview-client.js
│   │   │   │       ├── activity.js
│   │   │   │       ├── favorites.js
│   │   │   │       ├── lists.js
│   │   │   │       ├── media-overview-section.js
│   │   │   │       ├── overview-feed.js
│   │   │   │       ├── reviews.js
│   │   │   │       ├── watched.js
│   │   │   │       └── watchlist.js
│   │   │   └── skeletons
│   │   │       ├── account-section-skeletons.js
│   │   │       └── account-skeleton-layout.js
│   │   └── utils
│   │       ├── avatar.js
│   │       ├── constants.js
│   │       ├── feedback.js
│   │       ├── filtering-query-utils.js
│   │       ├── filtering-shared.js
│   │       ├── formatting.js
│   │       ├── index.js
│   │       ├── media-card.js
│   │       ├── security.js
│   │       ├── supabase.js
│   │       ├── uuid.js
│   │       └── validation.js
│   ├── auth
│   │   ├── actions
│   │   │   └── forgot-password-action.js
│   │   ├── api
│   │   │   └── audit.server.js
│   │   ├── client
│   │   │   ├── http.client.js
│   │   │   ├── index.js
│   │   │   ├── requests.js
│   │   │   ├── sign-in-workflow.client.js
│   │   │   └── sign-up-workflow.client.js
│   │   ├── index.js
│   │   ├── server
│   │   │   ├── account-routes.server.js
│   │   │   ├── account.server.js
│   │   │   ├── actions
│   │   │   │   └── password-status.server.js
│   │   │   ├── api-handlers.server.js
│   │   │   ├── audit-log.server.js
│   │   │   ├── google-provider.server.js
│   │   │   ├── index.js
│   │   │   ├── policies.server.js
│   │   │   ├── proof-tokens.server.js
│   │   │   ├── response.server.js
│   │   │   ├── security.server.js
│   │   │   ├── session
│   │   │   │   ├── admin.server.js
│   │   │   │   └── cookies.server.js
│   │   │   ├── session.server.js
│   │   │   ├── tokens.server.js
│   │   │   └── verification.server.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── form-primitives.js
│   │   │   │   ├── oauth-provider-button.js
│   │   │   │   └── oauth-provider-list.js
│   │   │   ├── index.js
│   │   │   ├── layouts
│   │   │   │   └── page-shell.js
│   │   │   └── surfaces
│   │   │       └── verification-surface.js
│   │   └── utils
│   │       ├── constants.js
│   │       ├── errors.js
│   │       ├── index.js
│   │       ├── oauth.js
│   │       ├── password.js
│   │       ├── providers.js
│   │       └── routes.js
│   ├── home
│   │   ├── client
│   │   │   └── use-discover-feed.js
│   │   ├── index.js
│   │   ├── server
│   │   │   └── imdb-top-100.server.js
│   │   ├── shared
│   │   │   ├── discover.js
│   │   │   └── imdb-top-100-data.js
│   │   └── ui
│   │       ├── components
│   │       │   └── poster-rail.js
│   │       ├── layouts
│   │       │   ├── home-grid-frame.js
│   │       │   └── home-section.js
│   │       └── sections
│   │           ├── discover-section.js
│   │           ├── home-rail-section.js
│   │           ├── top-rated-section.js
│   │           └── trending-section.js
│   ├── legal
│   │   ├── index.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   └── legal-quick-links.js
│   │   │   └── layouts
│   │   │       └── legal-page-shell.js
│   │   └── utils
│   │       └── index.js
│   ├── media
│   │   ├── api
│   │   │   └── person-awards.server.js
│   │   ├── client
│   │   │   ├── collections
│   │   │   │   ├── likes
│   │   │   │   │   ├── index.js
│   │   │   │   │   ├── like-queries.js
│   │   │   │   │   ├── like-service.js
│   │   │   │   │   ├── like-shared.js
│   │   │   │   │   └── like-subscriptions.js
│   │   │   │   ├── lists
│   │   │   │   │   ├── derived-state.js
│   │   │   │   │   ├── index.js
│   │   │   │   │   ├── item-mutations.js
│   │   │   │   │   ├── like-mutations.js
│   │   │   │   │   ├── list-mutations.js
│   │   │   │   │   ├── list-queries.js
│   │   │   │   │   ├── list-service.js
│   │   │   │   │   ├── list-shared.js
│   │   │   │   │   ├── list-subscriptions.js
│   │   │   │   │   └── mutations.js
│   │   │   │   └── watched-watchlist
│   │   │   │       ├── index.js
│   │   │   │       ├── watched-queries.js
│   │   │   │       ├── watched-service.js
│   │   │   │       ├── watched-shared.js
│   │   │   │       ├── watched-subscriptions.js
│   │   │   │       ├── watchlist-queries.js
│   │   │   │       ├── watchlist-service.js
│   │   │   │       ├── watchlist-shared.js
│   │   │   │       └── watchlist-subscriptions.js
│   │   │   └── social-proof
│   │   │       ├── index.js
│   │   │       └── social-proof-service.js
│   │   ├── index.js
│   │   ├── server
│   │   │   ├── list-like-route.server.js
│   │   │   ├── person-awards.js
│   │   │   ├── title-route.server.js
│   │   │   └── tv-season-ratings.js
│   │   ├── services
│   │   │   └── media-data.js
│   │   ├── shared
│   │   │   ├── media-key.js
│   │   │   ├── media-payload.js
│   │   │   └── media.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── collection-actions.js
│   │   │   │   ├── context-menu-actions.js
│   │   │   │   ├── media-card.js
│   │   │   │   ├── media-carousel.js
│   │   │   │   ├── media-list-preview.js
│   │   │   │   ├── media-poster-card.js
│   │   │   │   ├── person
│   │   │   │   │   ├── awards-skeleton.js
│   │   │   │   │   ├── awards.js
│   │   │   │   │   ├── bio.js
│   │   │   │   │   ├── filmography-card.js
│   │   │   │   │   ├── gallery.js
│   │   │   │   │   ├── media-thumb.js
│   │   │   │   │   ├── social-links.js
│   │   │   │   │   ├── timeline-skeleton.js
│   │   │   │   │   └── timeline.js
│   │   │   │   ├── recommendation-card.js
│   │   │   │   ├── sidebar.js
│   │   │   │   ├── social-proof.js
│   │   │   │   ├── static-route-elements.js
│   │   │   │   ├── tv-season-ratings-skeleton.js
│   │   │   │   └── tv-season-ratings.js
│   │   │   ├── index.js
│   │   │   ├── layouts
│   │   │   │   ├── media-detail-section.js
│   │   │   │   ├── media-grid-frame.js
│   │   │   │   └── person-grid-frame.js
│   │   │   ├── modals
│   │   │   │   ├── cast-modal.js
│   │   │   │   ├── image-preview-modal.js
│   │   │   │   ├── media-social-proof-modal.js
│   │   │   │   └── video-preview-modal.js
│   │   │   ├── nav-actions
│   │   │   │   ├── movie-action.js
│   │   │   │   └── person-action.js
│   │   │   ├── nav-surfaces
│   │   │   │   ├── person-bio-surface.js
│   │   │   │   └── watch-providers-surface.js
│   │   │   ├── sections
│   │   │   │   ├── cast-section.js
│   │   │   │   ├── filmography-section.js
│   │   │   │   ├── gallery-section.js
│   │   │   │   ├── images-section.js
│   │   │   │   ├── seasons-section.js
│   │   │   │   └── videos-section.js
│   │   │   └── skeletons
│   │   └── utils
│   │       ├── background-preferences.js
│   │       ├── index.js
│   │       ├── person-data.js
│   │       ├── poster-overrides.js
│   │       ├── poster-preference-events.js
│   │       ├── poster-preferences.js
│   │       ├── user-media-service.js
│   │       └── user-media.js
│   ├── reviews
│   │   ├── api
│   │   │   └── reviews-query.server.js
│   │   ├── client
│   │   │   ├── index.js
│   │   │   ├── list-review-mutations.js
│   │   │   ├── media-review-mutations.js
│   │   │   ├── profile-review-feed.js
│   │   │   ├── review-like-mutations.js
│   │   │   ├── review-mutations.js
│   │   │   ├── review-subscriptions.js
│   │   │   ├── review-write-client.js
│   │   │   └── stored-review-mutations.js
│   │   ├── hooks
│   │   │   └── use-media-reviews.js
│   │   ├── index.js
│   │   ├── server
│   │   │   ├── feeds.server.js
│   │   │   ├── list-feed.server.js
│   │   │   ├── profile-feed.server.js
│   │   │   ├── read-reviews.server.js
│   │   │   ├── read-route.server.js
│   │   │   ├── review-context.server.js
│   │   │   ├── review-normalizer.server.js
│   │   │   ├── write-actions.server.js
│   │   │   ├── write-input.server.js
│   │   │   └── write-route.server.js
│   │   ├── shared
│   │   │   ├── review-data.js
│   │   │   ├── review-utils.js
│   │   │   └── review-validation.js
│   │   └── ui
│   │       ├── components
│   │       │   ├── rating-range-selector.js
│   │       │   ├── rating-selector.js
│   │       │   ├── rating-stars.js
│   │       │   ├── review-auth-fallback.js
│   │       │   ├── review-card.js
│   │       │   ├── review-header.js
│   │       │   └── review-list.js
│   │       ├── index.js
│   │       ├── nav-actions
│   │       │   └── review-action.js
│   │       ├── nav-surfaces
│   │       │   └── review-editor-surface.js
│   │       └── sections
│   │           └── media-reviews.js
│   ├── search
│   │   ├── api
│   │   ├── client
│   │   │   ├── search-api.js
│   │   │   └── search-cache.js
│   │   ├── index.js
│   │   ├── server
│   │   │   └── community-route.server.js
│   │   ├── services
│   │   ├── shared
│   │   │   ├── ranking.js
│   │   │   └── result.js
│   │   ├── ui
│   │   │   └── nav-actions
│   │   │       └── search-action
│   │   │           ├── controls.js
│   │   │           ├── index.js
│   │   │           ├── item.js
│   │   │           ├── results-preview.js
│   │   │           ├── search-action-helpers.js
│   │   │           └── use-search-action-controller.js
│   │   └── utils
│   │       └── index.js
│   └── social
│       ├── api
│       ├── client
│       │   ├── activity
│       │   │   ├── activity-events.js
│       │   │   └── activity-feed.js
│       │   ├── follows
│       │   │   ├── follow-cache.js
│       │   │   ├── follow-mutations.js
│       │   │   ├── follow-subscriptions.js
│       │   │   └── index.js
│       │   └── notifications
│       │       ├── notification-events.js
│       │       └── notification-service.js
│       ├── index.js
│       ├── server
│       │   ├── activity
│       │   │   ├── event-processor-queries.js
│       │   │   ├── event-processor-shared.js
│       │   │   ├── event-processor.server.js
│       │   │   └── route.server.js
│       │   ├── api
│       │   ├── follows
│       │   │   ├── events.server.js
│       │   │   ├── resources.server.js
│       │   │   ├── route.server.js
│       │   │   └── shared.server.js
│       │   ├── notifications
│       │   │   ├── event-processor.server.js
│       │   │   ├── event-route.server.js
│       │   │   ├── notification-resources.server.js
│       │   │   └── route.server.js
│       │   ├── social
│       │   └── social-proof
│       │       └── route.server.js
│       ├── ui
│       │   ├── index.js
│       │   └── modals
│       │       ├── account-social-modal.js
│       │       └── notifications-modal.js
│       └── utils
│           └── index.js
├── eslint.config.mjs
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
│   │   └── feedback.server.js
│   ├── realtime
│   │   ├── api
│   │   │   ├── live-updates-events.server.js
│   │   │   └── live-updates.server.js
│   │   ├── live-updates-service.js
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
│       │   ├── catalog.server.js
│       │   ├── detail-id.server.js
│       │   ├── details.server.js
│       │   ├── request.js
│       │   ├── runtime-sanitize.server.js
│       │   ├── sanitize.js
│       │   ├── search
│       │   │   ├── fallback-queries.js
│       │   │   ├── movie-ranking.js
│       │   │   ├── person-ranking.js
│       │   │   └── tmdb-search-shared.js
│       │   ├── search-ranking.js
│       │   ├── search.server.js
│       │   ├── tmdb-client-config.js
│       │   └── tmdb-server-client.js
│       └── services
│           ├── tmdb-http.client.js
│           ├── tmdb-movie-images.client.js
│           ├── tmdb-service.js
│           └── watch-region.js
├── jsconfig.json
├── middleware.js
├── next.config.mjs
├── open-next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public
│   ├── _headers
│   ├── images
│   │   ├── default-avatar.svg
│   │   └── noise.webp
│   └── tvizzie.png
├── skills-lock.json
├── tailwind.config.js
└── wrangler.jsonc
```
