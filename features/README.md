# Features Directory Convention

Feature-first modules live under `features/<domain>/` and should stay route-facing and domain-oriented.

- Default to a flat structure under the domain folder.
- Do not create generic layer folders like `components/`, `hooks/`, `data/`, or `utils/` unless a local split is unavoidable.
- If a single unit needs to be split, keep a dedicated local folder with colocated `parts/` or similarly narrow structure.
- Cross-cutting primitives do not belong in `features/`; move them to `modules/`, `ui/`, `lib/`, or `services/` depending on ownership.
- Feature files may compose from `modules/`, `ui/`, `services/`, `lib/`, and `config/`, but must not own framework/runtime infrastructure.

Canonical imports should use `@/features/<domain>/...`.
