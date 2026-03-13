# Design System Exceptions

These exceptions are intentionally retained to preserve product meaning or third-party brand identity.

1. IMDb brand color
- Scope: IMDb icon in movie/tv detail headers.
- Reason: The official IMDb yellow (`#f5c518`) is a brand identifier and should not be remapped to semantic app tokens.

2. Media preview radius
- Scope: preview modals for images/videos.
- Reason: `rounded-[24px]` is retained for fullscreen media framing so the preview shell remains visually distinct from form/dialog modals.

3. Navigation status gradient mix
- Scope: runtime nav status card styles built from `hexToRgba(...)`.
- Reason: this path computes dynamic alpha overlays from semantic variables for animated gradients and cannot be represented by static utility classes alone.
