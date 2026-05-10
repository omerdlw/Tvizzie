# Motion Ownership

Tvizzie motion files follow route and layer ownership. The goal is to keep choreography coherent without letting every component define its own timing island.

## Layers

- `core/animation`: shared tokens, timing builders, reduced-motion helpers, and primitive utilities only.
- `app/**/motion.js`: route choreography only. These files decide page-level timing, route section order, and route shell reveal behavior.
- `features/**/motion.js`: feature-local item, row, card, control, and section motion only. These files should consume `core/animation` primitives.
- `core/modules/motion.js`: shell module motion for nav, modal, notification, and other app-level modules.

## Rules

- Route files can import `core/animation`, `core/modules/motion`, and feature motion.
- Feature files should not import `app/**/motion.js` unless a route intentionally owns a shared route wrapper for that feature surface.
- UI primitives should not import route or feature motion. They should accept classes, props, or motion config from their caller.
- Timing values should come from route or feature motion files, not inline component literals.
- Scroll reveal should render initial above-the-fold content without requiring scroll. Use viewport motion as progressive enhancement, not as the only visible state.

## Account Exception

Account currently has a route-owned motion file at `app/(account)/account/motion.js` because every account sub-route shares one choreography. Account feature components may consume the exported route wrapper while this route-level ownership remains deliberate.
