# Features Directory Convention

Feature-first modules live under `features/<domain>/` and should stay route-facing and domain-oriented.

- Default to a flat structure under the domain folder.
- Do not create generic layer folders like `components/`, `hooks/`, `data/`, or `utils/` unless a local split is unavoidable.
- If a single unit needs to be split, keep a dedicated local folder with colocated `parts/` or similarly narrow structure.
- Cross-cutting primitives do not belong in `features/`; move them to `modules/`, `ui/`, `lib/`, or `services/` depending on ownership.
- `features/app-shell/` is reserved for route-facing application shell glue such as providers, global registries, web-vitals, and scroll/runtime wiring.
- `features/modals/` is reserved for concrete modal implementations that compose the shared modal module.
- Shared UI compositions belong in `ui/`; do not recreate a generic `features/shared/` bucket.
- Route-level search code owns reusable search constants and result-grid pieces under `features/search/`; navigation actions should compose from that boundary instead of exposing internal `parts/`.
- Feature files may compose from `modules/`, `ui/`, `services/`, `lib/`, and `config/`, but must not own generic framework/runtime primitives.

Canonical imports should use `@/features/<domain>/...`.
