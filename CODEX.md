Strictly follow these rules. Do not ignore them.

- Never run build, lint, tests, type-check, or deploy commands automatically at the end of a task unless I explicitly request it.
- Never use colors outside the definitions in `globals.css`.
- Never introduce arbitrary hex, RGB, HSL, or custom color values.
- Never use slash opacity values like `/[0.03]`, `/[0.16]`.
- Only these opacity values are allowed: `0`, `10`, `15`, `20`, `30`, `40`, `50`, `60`, `70`, `80`, `90`, `100`.
- Never use custom tracking values. Use only Tailwind’s default tracking utilities.

Before responding, audit the code you wrote and fix any violation of these rules.
If a rule conflicts with the user request, explain the conflict instead of breaking the rule.
